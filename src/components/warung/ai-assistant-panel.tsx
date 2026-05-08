"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Mic,
  PackageSearch,
  Send,
  Sparkles,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Tone = "default" | "warn" | "success";

type ToolResult = {
  ok: boolean;
  kind: "data" | "suggestion" | "action" | "navigation" | "info";
  title: string;
  summary?: string;
  rows?: Array<{ label: string; value: string; tone?: Tone }>;
  data?: unknown;
  message?: string;
  error?: string;
};

type ChatRecord = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

type ServerMessage = {
  id: string;
  chatId: string;
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolName: string | null;
  toolCallId: string | null;
  toolCalls: unknown;
  toolArgs: unknown;
  toolResult: ToolResult | null;
  createdAt: string;
};

const quickPrompts = [
  "Sisa stok semua produk?",
  "Untung minggu ini berapa?",
  "Pelanggan yang belum lunas?",
  "Rekomendasi restok untuk untung",
];

async function api<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok) {
    throw new Error(data?.error ?? `Permintaan gagal (${res.status}).`);
  }
  return data as T;
}

function MessageBubble({
  role,
  children,
}: {
  role: "user" | "assistant";
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex w-full", role === "user" ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[88%]",
          role === "user"
            ? "rounded-3xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground shadow-[0_12px_28px_-22px_rgba(186,92,35,0.85)]"
            : "w-full"
        )}
      >
        {children}
      </div>
    </div>
  );
}

function AssistantTextBubble({ text }: { text: string }) {
  return (
    <div className="rounded-3xl rounded-bl-md bg-card/80 px-4 py-2.5 text-sm whitespace-pre-wrap text-foreground ring-1 ring-foreground/10 backdrop-blur">
      {text}
    </div>
  );
}

function DataMessageCard({ result }: { result: ToolResult }) {
  return (
    <Card size="sm" className="bg-card/85 backdrop-blur">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <PackageSearch className="size-4" />
          </span>
          <div className="flex-1">
            <CardTitle>{result.title}</CardTitle>
            {result.summary ? (
              <CardDescription className="mt-0.5 text-xs">{result.summary}</CardDescription>
            ) : null}
          </div>
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            DB
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {(result.rows ?? []).map((row, i) => (
          <div
            key={`${row.label}-${i}`}
            className="flex items-center justify-between gap-2 rounded-lg bg-muted/60 px-3 py-2"
          >
            <span className="text-xs text-muted-foreground">{row.label}</span>
            <span
              className={cn(
                "text-sm font-medium",
                row.tone === "warn" && "text-amber-700",
                row.tone === "success" && "text-emerald-700"
              )}
            >
              {row.value}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function SuggestionMessageCard({ result }: { result: ToolResult }) {
  const data = result.data as { narrative?: string } | null;
  return (
    <Card
      size="sm"
      className="border-primary/30 bg-gradient-to-br from-primary/10 via-card/80 to-amber-50/60 backdrop-blur"
    >
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </span>
          <CardTitle className="flex-1">{result.title}</CardTitle>
          <Badge variant="secondary" className="gap-1 bg-emerald-100 text-emerald-800">
            <TrendingUp className="size-3" />
            Saran
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {data?.narrative ? (
          <div>
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Ringkasan
            </p>
            <p className="text-sm text-foreground">{data.narrative}</p>
          </div>
        ) : null}
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Top earner
          </p>
          {(result.rows ?? []).map((row, i) => (
            <div
              key={`${row.label}-${i}`}
              className="flex items-center justify-between rounded-lg bg-card/70 px-3 py-2 ring-1 ring-foreground/5"
            >
              <span className="text-sm">{row.label}</span>
              <span className="text-xs text-muted-foreground">{row.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ActionMessageCard({
  toolName,
  result,
}: {
  toolName: string | null;
  result: ToolResult;
}) {
  return (
    <Card size="sm" className="border-emerald-300/50 bg-emerald-50/70 backdrop-blur">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-700">
            <Wallet className="size-4" />
          </span>
          <div className="flex-1">
            <CardTitle>{result.title}</CardTitle>
            {toolName ? (
              <CardDescription className="mt-0.5 font-mono text-[11px]">
                tool: {toolName}
              </CardDescription>
            ) : null}
          </div>
          <Badge variant="secondary" className="bg-emerald-200/70 text-emerald-900">
            Tereksekusi
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {result.summary ? (
          <p className="text-sm font-medium text-foreground">{result.summary}</p>
        ) : null}
        <div className="rounded-xl bg-card/70 p-2.5 ring-1 ring-emerald-200/70">
          {(result.rows ?? []).map((row, i) => (
            <div
              key={`${row.label}-${i}`}
              className="flex items-center justify-between gap-2 border-b border-dashed border-emerald-200/70 py-1 text-sm last:border-0"
            >
              <span className="text-muted-foreground">{row.label}</span>
              <span
                className={cn(
                  "font-medium",
                  row.tone === "warn" && "text-amber-700",
                  row.tone === "success" && "text-emerald-700"
                )}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-emerald-100/80 px-3 py-2 text-xs text-emerald-800">
          <Check className="size-3.5" />
          Aksi sudah disimpan ke database.
        </div>
      </CardContent>
    </Card>
  );
}

function InfoMessageCard({ result }: { result: ToolResult }) {
  return (
    <Card size="sm" className="bg-card/85 backdrop-blur">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex size-7 items-center justify-center rounded-lg",
              result.ok ? "bg-secondary text-secondary-foreground" : "bg-destructive/10 text-destructive"
            )}
          >
            {result.ok ? <BookOpen className="size-4" /> : <AlertTriangle className="size-4" />}
          </span>
          <CardTitle className="flex-1">{result.title}</CardTitle>
        </div>
      </CardHeader>
      {result.message || result.error ? (
        <CardContent>
          <p className="text-sm text-muted-foreground">{result.message ?? result.error}</p>
        </CardContent>
      ) : null}
    </Card>
  );
}

function NavigationMessageCard({ result }: { result: ToolResult }) {
  const data = (result.data ?? {}) as { href?: string; label?: string };
  return (
    <Card size="sm" className="bg-card/85 backdrop-blur">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
            <ChevronRight className="size-4" />
          </span>
          <CardTitle className="flex-1">{result.title}</CardTitle>
        </div>
      </CardHeader>
      {data.href ? (
        <CardContent>
          <a
            href={data.href}
            className="group/nav flex w-full items-center justify-between rounded-xl bg-muted px-3 py-2.5 text-left transition-colors hover:bg-muted/70"
          >
            <div>
              <p className="text-xs text-muted-foreground">Tujuan</p>
              <p className="text-sm font-medium">{data.label ?? data.href}</p>
              <p className="text-[11px] font-mono text-muted-foreground">{data.href}</p>
            </div>
            <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover/nav:translate-x-0.5" />
          </a>
        </CardContent>
      ) : null}
    </Card>
  );
}

function ToolCard({ message }: { message: ServerMessage }) {
  const result = message.toolResult;
  if (!result) return null;
  switch (result.kind) {
    case "data":
      return <DataMessageCard result={result} />;
    case "suggestion":
      return <SuggestionMessageCard result={result} />;
    case "action":
      return <ActionMessageCard toolName={message.toolName} result={result} />;
    case "navigation":
      return <NavigationMessageCard result={result} />;
    case "info":
    default:
      return <InfoMessageCard result={result} />;
  }
}

export function AIAssistantPanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const [chat, setChat] = useState<ChatRecord | null>(null);
  const [messages, setMessages] = useState<ServerMessage[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasBootstrappedRef = useRef(false);

  const bootstrap = useCallback(async () => {
    if (hasBootstrappedRef.current) return;
    hasBootstrappedRef.current = true;
    setIsLoading(true);
    setError(null);
    try {
      const list = await api<{ chats: ChatRecord[] }>("/api/ai/chats");
      let active = list.chats[0] ?? null;
      if (!active) {
        const created = await api<{ chat: ChatRecord }>("/api/ai/chats", {
          method: "POST",
          body: JSON.stringify({ title: "Percakapan baru" }),
        });
        active = created.chat;
      }
      setChat(active);
      const detail = await api<{ messages: ServerMessage[] }>(
        `/api/ai/chats/${active.id}/messages`
      );
      setMessages(detail.messages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat chat AI.");
      hasBootstrappedRef.current = false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void bootstrap();
  }, [open, bootstrap]);

  useEffect(() => {
    if (!open) return;
    bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [open, messages, isThinking]);

  async function handleSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed || !chat || isThinking) return;

    const optimistic: ServerMessage = {
      id: `local_${Date.now()}`,
      chatId: chat.id,
      role: "user",
      content: trimmed,
      toolName: null,
      toolCallId: null,
      toolCalls: null,
      toolArgs: null,
      toolResult: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput("");
    setIsThinking(true);
    setError(null);

    try {
      const res = await api<{ newMessages: ServerMessage[] }>(
        `/api/ai/chats/${chat.id}/messages`,
        { method: "POST", body: JSON.stringify({ text: trimmed }) }
      );
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimistic.id),
        ...res.newMessages,
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal mengirim pesan.";
      setError(message);
      toast.error(message);
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    } finally {
      setIsThinking(false);
    }
  }

  async function handleNewChat() {
    setIsLoading(true);
    setError(null);
    try {
      const created = await api<{ chat: ChatRecord }>("/api/ai/chats", {
        method: "POST",
        body: JSON.stringify({ title: "Percakapan baru" }),
      });
      setChat(created.chat);
      setMessages([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat chat baru.");
    } finally {
      setIsLoading(false);
    }
  }

  const visibleMessages = messages.filter((m) => m.role !== "system");

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col overflow-hidden rounded-[28px] border border-white/60 bg-card/85 shadow-[0_38px_90px_-50px_rgba(68,39,20,0.7)] backdrop-blur-xl transition-[width] duration-200 ease-out",
        open ? "w-[380px] xl:w-[420px]" : "w-[64px]"
      )}
      aria-label="Asisten AI WarungOS"
    >
      {!open ? (
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          className="group/rail flex h-full w-full flex-col items-center justify-center gap-3 px-2 py-4 text-foreground/80 transition-colors hover:bg-primary/5"
          aria-label="Buka asisten AI"
        >
          <span className="flex size-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_18px_38px_-22px_rgba(186,92,35,0.85)] transition-transform group-hover/rail:scale-105">
            <Sparkles className="size-4" />
          </span>
          <span
            className="text-[11px] font-medium tracking-wide text-foreground/70"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            Asisten AI
          </span>
          <span className="mt-auto rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">
            ●
          </span>
        </button>
      ) : (
        <>
          <header className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
            <span className="flex size-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Sparkles className="size-4" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-heading text-sm font-semibold leading-tight truncate">
                {chat?.title ?? "WarungOS AI"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Asisten kontekstual · OpenRouter · Tool calling
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleNewChat}
              disabled={isLoading || isThinking}
              aria-label="Mulai chat baru"
              title="Mulai chat baru"
            >
              <ArrowRight className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onOpenChange(false)}
              aria-label="Tutup asisten"
            >
              <X className="size-4" />
            </Button>
          </header>

          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="space-y-3 px-4 py-4">
              {visibleMessages.length === 0 && !isLoading ? (
                <MessageBubble role="assistant">
                  <AssistantTextBubble
                    text={
                      "Halo Pak/Bu! Saya WarungOS AI. Saya bisa cek stok, hitung untung, kasih saran restok, atau langsung jalankan aksi (catat hutang, restok, catat pengeluaran). Coba tanya: 'untung minggu ini berapa?' atau 'rekomendasi restok untuk untung'."
                    }
                  />
                </MessageBubble>
              ) : null}

              {visibleMessages.map((m) => {
                if (m.role === "user") {
                  return (
                    <MessageBubble key={m.id} role="user">
                      <span>{m.content}</span>
                    </MessageBubble>
                  );
                }
                if (m.role === "assistant") {
                  if (!m.content.trim()) return null;
                  return (
                    <MessageBubble key={m.id} role="assistant">
                      <AssistantTextBubble text={m.content} />
                    </MessageBubble>
                  );
                }
                if (m.role === "tool") {
                  return (
                    <MessageBubble key={m.id} role="assistant">
                      <ToolCard message={m} />
                    </MessageBubble>
                  );
                }
                return null;
              })}

              {isThinking ? (
                <MessageBubble role="assistant">
                  <div className="inline-flex items-center gap-1.5 rounded-3xl rounded-bl-md bg-card/80 px-4 py-3 ring-1 ring-foreground/10">
                    <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.2s]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.1s]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-primary" />
                  </div>
                </MessageBubble>
              ) : null}

              {error ? (
                <div className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {error}
                </div>
              ) : null}
              <div ref={bottomRef} aria-hidden className="h-px" />
            </div>
          </div>

          <div className="border-t border-border/60 bg-card/70 px-3 py-3">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {quickPrompts.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleSend(q)}
                  disabled={isThinking || !chat}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-foreground/80 ring-1 ring-foreground/5 transition-colors hover:bg-primary/10 hover:text-primary disabled:opacity-50"
                >
                  <ArrowRight className="size-3" />
                  {q}
                </button>
              ))}
            </div>
            <div className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(input);
                  }
                }}
                placeholder="Tanya stok, untung, atau perintahkan tindakan…"
                className="max-h-32 min-h-10 flex-1 resize-none rounded-2xl bg-card/80 py-2.5"
                rows={1}
                disabled={!chat}
              />
              <Button
                variant="outline"
                size="icon-lg"
                className="rounded-2xl"
                onClick={() => toast.info("Voice input belum tersedia.")}
                aria-label="Rekam suara"
              >
                <Mic className="size-4" />
              </Button>
              <Button
                size="icon-lg"
                className="rounded-2xl"
                onClick={() => handleSend(input)}
                disabled={!input.trim() || isThinking || !chat}
                aria-label="Kirim pesan"
              >
                <Send className="size-4" />
              </Button>
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">
              Aksi langsung tertulis ke database warung Anda.
            </p>
          </div>
        </>
      )}
    </aside>
  );
}
