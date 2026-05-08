import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { aiChats, aiMessages } from "@/db/schema";

export type StoredMessageRole = "system" | "user" | "assistant" | "tool";

export type StoredMessage = {
  id: string;
  chatId: string;
  role: StoredMessageRole;
  content: string;
  toolName: string | null;
  toolCallId: string | null;
  toolCalls: unknown;
  toolArgs: unknown;
  toolResult: unknown;
  createdAt: string;
};

function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 10)}`;
}

function nowIso() {
  return new Date().toISOString();
}

export async function listChats(userId: string) {
  return await db
    .select()
    .from(aiChats)
    .where(eq(aiChats.userId, userId))
    .orderBy(desc(aiChats.updatedAt))
    .limit(50);
}

export async function getChat(userId: string, chatId: string) {
  const [chat] = await db
    .select()
    .from(aiChats)
    .where(and(eq(aiChats.id, chatId), eq(aiChats.userId, userId)))
    .limit(1);
  return chat ?? null;
}

export async function createChat(userId: string, title: string) {
  const ts = nowIso();
  const [chat] = await db
    .insert(aiChats)
    .values({ id: newId("chat"), userId, title, createdAt: ts, updatedAt: ts })
    .returning();
  return chat;
}

export async function touchChat(chatId: string) {
  await db.update(aiChats).set({ updatedAt: nowIso() }).where(eq(aiChats.id, chatId));
}

export async function renameChatIfDefault(userId: string, chatId: string, newTitle: string) {
  const chat = await getChat(userId, chatId);
  if (!chat) return;
  if (chat.title === "Percakapan baru" || chat.title.length === 0) {
    await db
      .update(aiChats)
      .set({ title: newTitle.slice(0, 80), updatedAt: nowIso() })
      .where(eq(aiChats.id, chatId));
  }
}

export async function listMessages(chatId: string): Promise<StoredMessage[]> {
  const rows = await db
    .select()
    .from(aiMessages)
    .where(eq(aiMessages.chatId, chatId))
    .orderBy(asc(aiMessages.createdAt));

  return rows.map((r) => ({
    id: r.id,
    chatId: r.chatId,
    role: r.role as StoredMessageRole,
    content: r.content,
    toolName: r.toolName,
    toolCallId: r.toolCallId,
    toolCalls: r.toolCalls ?? null,
    toolArgs: r.toolArgs ?? null,
    toolResult: r.toolResult ?? null,
    createdAt: r.createdAt,
  }));
}

export async function appendMessage(input: {
  chatId: string;
  userId: string;
  role: StoredMessageRole;
  content: string;
  toolName?: string | null;
  toolCallId?: string | null;
  toolCalls?: unknown;
  toolArgs?: unknown;
  toolResult?: unknown;
}): Promise<StoredMessage> {
  const [row] = await db
    .insert(aiMessages)
    .values({
      id: newId("msg"),
      chatId: input.chatId,
      userId: input.userId,
      role: input.role,
      content: input.content,
      toolName: input.toolName ?? null,
      toolCallId: input.toolCallId ?? null,
      toolCalls: input.toolCalls ?? null,
      toolArgs: input.toolArgs ?? null,
      toolResult: input.toolResult ?? null,
      createdAt: nowIso(),
    })
    .returning();

  await touchChat(input.chatId);

  return {
    id: row.id,
    chatId: row.chatId,
    role: row.role as StoredMessageRole,
    content: row.content,
    toolName: row.toolName,
    toolCallId: row.toolCallId,
    toolCalls: row.toolCalls ?? null,
    toolArgs: row.toolArgs ?? null,
    toolResult: row.toolResult ?? null,
    createdAt: row.createdAt,
  };
}
