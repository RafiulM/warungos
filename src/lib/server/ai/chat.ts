import { callOpenRouter, type OpenRouterMessage } from "./openrouter";
import {
  appendMessage,
  listMessages,
  renameChatIfDefault,
  type StoredMessage,
} from "./persist";
import { buildSystemContext, executeTool, toolDefinitions } from "./tools";

const MAX_TOOL_ITERATIONS = 5;

function storedToOpenRouter(messages: StoredMessage[]): OpenRouterMessage[] {
  const out: OpenRouterMessage[] = [];
  for (const m of messages) {
    if (m.role === "system") {
      out.push({ role: "system", content: m.content });
    } else if (m.role === "user") {
      out.push({ role: "user", content: m.content });
    } else if (m.role === "assistant") {
      const toolCalls = m.toolCalls as
        | Array<{ id: string; type: "function"; function: { name: string; arguments: string } }>
        | null
        | undefined;
      out.push({
        role: "assistant",
        content: m.content || null,
        ...(toolCalls && toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
      });
    } else if (m.role === "tool") {
      out.push({
        role: "tool",
        tool_call_id: m.toolCallId ?? "",
        name: m.toolName ?? undefined,
        content: m.content,
      });
    }
  }
  return out;
}

export async function runUserTurn(input: {
  userId: string;
  chatId: string;
  userText: string;
}): Promise<{ newMessages: StoredMessage[] }> {
  const { userId, chatId, userText } = input;
  const beforeIds = new Set((await listMessages(chatId)).map((m) => m.id));

  const userStored = await appendMessage({
    chatId,
    userId,
    role: "user",
    content: userText,
  });
  await renameChatIfDefault(userId, chatId, userText);

  const systemContent = await buildSystemContext(userId);

  for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter += 1) {
    const history = await listMessages(chatId);
    const orMessages: OpenRouterMessage[] = [
      { role: "system", content: systemContent },
      ...storedToOpenRouter(history),
    ];

    const response = await callOpenRouter({
      messages: orMessages,
      tools: toolDefinitions,
    });

    const choice = response.choices[0];
    if (!choice) break;
    const msg = choice.message;
    const toolCalls = msg.tool_calls;

    await appendMessage({
      chatId,
      userId,
      role: "assistant",
      content: msg.content ?? "",
      toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : null,
    });

    if (!toolCalls || toolCalls.length === 0) {
      break;
    }

    for (const call of toolCalls) {
      const result = await executeTool(userId, call.function.name, call.function.arguments);
      let parsedArgs: unknown = null;
      try {
        parsedArgs = call.function.arguments ? JSON.parse(call.function.arguments) : null;
      } catch {
        parsedArgs = null;
      }
      await appendMessage({
        chatId,
        userId,
        role: "tool",
        content: JSON.stringify(result),
        toolName: call.function.name,
        toolCallId: call.id,
        toolArgs: parsedArgs,
        toolResult: result,
      });
    }
  }

  // include the user message itself in the diff returned
  beforeIds.add(userStored.id);
  beforeIds.delete(userStored.id);

  const after = await listMessages(chatId);
  return { newMessages: after.filter((m) => !beforeIds.has(m.id)) };
}
