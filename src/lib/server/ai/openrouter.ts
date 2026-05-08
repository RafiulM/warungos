export type OpenRouterMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | {
      role: "assistant";
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: "function";
        function: { name: string; arguments: string };
      }>;
    }
  | { role: "tool"; tool_call_id: string; content: string; name?: string };

export type OpenRouterToolDef = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type OpenRouterChoice = {
  index: number;
  finish_reason: string;
  message: {
    role: "assistant";
    content: string | null;
    tool_calls?: Array<{
      id: string;
      type: "function";
      function: { name: string; arguments: string };
    }>;
  };
};

export type OpenRouterResponse = {
  id: string;
  model: string;
  choices: OpenRouterChoice[];
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
};

const DEFAULT_MODEL = process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini";

export async function callOpenRouter(input: {
  messages: OpenRouterMessage[];
  tools?: OpenRouterToolDef[];
  toolChoice?: "auto" | "none";
  model?: string;
  temperature?: number;
}): Promise<OpenRouterResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY belum diatur di environment. Tambahkan key dari https://openrouter.ai untuk mengaktifkan WarungOS AI."
    );
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.OPENROUTER_REFERER ?? "https://warungos.local",
      "X-Title": "WarungOS",
    },
    body: JSON.stringify({
      model: input.model ?? DEFAULT_MODEL,
      messages: input.messages,
      tools: input.tools,
      tool_choice: input.tools ? input.toolChoice ?? "auto" : undefined,
      temperature: input.temperature ?? 0.2,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new Error(`OpenRouter ${response.status}: ${text}`);
  }

  return (await response.json()) as OpenRouterResponse;
}
