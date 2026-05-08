CREATE TABLE IF NOT EXISTS "ai_chats" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "title" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL,
  "updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_chats_user_idx" ON "ai_chats" ("user_id", "updated_at" DESC);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_messages" (
  "id" text PRIMARY KEY NOT NULL,
  "chat_id" text NOT NULL,
  "user_id" text NOT NULL,
  "role" text NOT NULL,
  "content" text NOT NULL,
  "tool_name" text,
  "tool_call_id" text,
  "tool_calls" jsonb,
  "tool_args" jsonb,
  "tool_result" jsonb,
  "created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_messages_chat_idx" ON "ai_messages" ("chat_id", "created_at");
