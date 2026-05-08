import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { PaymentMethod } from "@/lib/types";

export const storeProfiles = pgTable("store_profiles", {
  userId: text("user_id").primaryKey(),
  storeName: text("store_name").notNull(),
  storeTagline: text("store_tagline").notNull(),
  storeAddress: text("store_address").notNull(),
  ownerName: text("owner_name").notNull(),
  ownerWhatsapp: text("owner_whatsapp").notNull(),
  city: text("city").notNull(),
  businessNotes: text("business_notes").notNull(),
  stockAlertThreshold: integer("stock_alert_threshold").notNull(),
  enabledPayments: jsonb("enabled_payments").$type<PaymentMethod[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull(),
});

export const products = pgTable("products", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  buyPrice: integer("buy_price").notNull(),
  sellPrice: integer("sell_price").notNull(),
  stock: integer("stock").notNull(),
  minimumStock: integer("minimum_stock").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull(),
});

export const transactions = pgTable("transactions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  total: integer("total").notNull(),
  paymentMethod: text("payment_method").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull(),
});

export const transactionItems = pgTable("transaction_items", {
  id: text("id").primaryKey(),
  transactionId: text("transaction_id").notNull(),
  productId: text("product_id").notNull(),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: integer("unit_price").notNull(),
  costPrice: integer("cost_price").notNull(),
});

export const debts = pgTable("debts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  borrowerName: text("borrower_name").notNull(),
  whatsapp: text("whatsapp").notNull(),
  amount: integer("amount").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull(),
  dueDate: timestamp("due_date", { withTimezone: true, mode: "string" }).notNull(),
  isPaid: integer("is_paid").notNull(),
  lastReminderAt: timestamp("last_reminder_at", { withTimezone: true, mode: "string" }),
});

export const expenses = pgTable("expenses", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  amount: integer("amount").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull(),
  category: text("category").notNull(),
});

export const aiChats = pgTable("ai_chats", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull(),
});

export const aiMessages = pgTable("ai_messages", {
  id: text("id").primaryKey(),
  chatId: text("chat_id").notNull(),
  userId: text("user_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  toolName: text("tool_name"),
  toolCallId: text("tool_call_id"),
  toolCalls: jsonb("tool_calls").$type<unknown>(),
  toolArgs: jsonb("tool_args").$type<unknown>(),
  toolResult: jsonb("tool_result").$type<unknown>(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull(),
});
