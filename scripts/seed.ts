import { eq, inArray } from "drizzle-orm";
import { db, pool } from "../src/db/client";
import {
  aiChats,
  aiMessages,
  debts,
  expenses,
  products,
  storeProfiles,
  transactionItems,
  transactions,
} from "../src/db/schema";
import { ensureAppReady } from "../src/lib/server/app-service";
import { seedState } from "../src/lib/mock-data";
import type { PaymentMethod } from "../src/lib/types";

function uid(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickWeighted<T>(items: Array<{ value: T; weight: number }>): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function dateAtDaysAgo(daysAgo: number, hour: number, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, Math.floor(Math.random() * 60), 0);
  return d.toISOString();
}

async function resolveTargetUser(): Promise<{ userId: string; label: string }> {
  const explicitId = process.env.SEED_USER_ID;
  const email = process.env.SEED_USER_EMAIL;

  if (email) {
    const result = await pool.query<{ id: string; email: string; name: string }>(
      `select id, email, name from "user" where email = $1 limit 1`,
      [email]
    );
    if (result.rowCount && result.rows[0]) {
      return { userId: result.rows[0].id, label: `${result.rows[0].name} <${email}>` };
    }
    throw new Error(
      `User dengan email "${email}" tidak ditemukan. Daftar via /auth dulu, lalu jalankan seed ulang.`
    );
  }

  if (explicitId) {
    return { userId: explicitId, label: `id=${explicitId}` };
  }

  return { userId: "seed-workspace", label: "id=seed-workspace (default)" };
}

async function clearWorkspace(userId: string) {
  const txIds = (
    await db.select({ id: transactions.id }).from(transactions).where(eq(transactions.userId, userId))
  ).map((r) => r.id);
  if (txIds.length > 0) {
    await db.delete(transactionItems).where(inArray(transactionItems.transactionId, txIds));
  }
  await db.delete(transactions).where(eq(transactions.userId, userId));
  await db.delete(debts).where(eq(debts.userId, userId));
  await db.delete(expenses).where(eq(expenses.userId, userId));
  await db.delete(products).where(eq(products.userId, userId));

  const chatIds = (
    await db.select({ id: aiChats.id }).from(aiChats).where(eq(aiChats.userId, userId))
  ).map((r) => r.id);
  if (chatIds.length > 0) {
    await db.delete(aiMessages).where(inArray(aiMessages.chatId, chatIds));
  }
  await db.delete(aiChats).where(eq(aiChats.userId, userId));
}

type SeedProduct = (typeof seedState.products)[number];

function generateTransactionsFor(
  productList: Array<SeedProduct & { dbId: string }>,
  days = 30
) {
  // Weight popular products higher to make recommendations meaningful.
  const popularityWeights: Record<string, number> = {
    prd_kopi_sachet: 6,
    prd_mi_goreng: 5,
    prd_air_mineral: 5,
    prd_chiki: 4,
    prd_susu_uht: 4,
    prd_indomie_rebus: 4,
    prd_sabun_cuci: 3,
    prd_teh_botol: 3,
    prd_kerupuk: 3,
    prd_telur_kg: 3,
    prd_roti_bakar: 3,
    prd_minyak_goreng: 2,
    prd_gula_pasir: 2,
    prd_garam: 2,
    prd_sampo_sachet: 4,
    prd_pasta_gigi: 1,
    prd_beras_5kg: 1,
  };

  const weighted = productList.map((p) => ({
    value: p,
    weight: popularityWeights[p.id] ?? 2,
  }));

  const paymentChoices: Array<{ value: PaymentMethod; weight: number }> = [
    { value: "Tunai", weight: 5 },
    { value: "QRIS", weight: 4 },
    { value: "Transfer", weight: 1 },
  ];

  const txRows: Array<{
    id: string;
    paymentMethod: PaymentMethod;
    total: number;
    createdAt: string;
  }> = [];
  const itemRows: Array<{
    id: string;
    transactionId: string;
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    costPrice: number;
  }> = [];

  for (let d = 0; d < days; d += 1) {
    // 1-4 transactions per day, weekends skew higher.
    const dayDate = new Date();
    dayDate.setDate(dayDate.getDate() - d);
    const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
    const txCount = isWeekend ? randInt(2, 5) : randInt(1, 3);

    for (let t = 0; t < txCount; t += 1) {
      const itemCount = randInt(1, 4);
      const usedProductIds = new Set<string>();
      const chosen: Array<{ product: SeedProduct & { dbId: string }; quantity: number }> = [];
      for (let i = 0; i < itemCount; i += 1) {
        const product = pickWeighted(weighted);
        if (usedProductIds.has(product.id)) continue;
        usedProductIds.add(product.id);
        chosen.push({ product, quantity: randInt(1, 3) });
      }
      if (chosen.length === 0) continue;

      const total = chosen.reduce(
        (s, item) => s + item.product.sellPrice * item.quantity,
        0
      );
      const paymentMethod = pickWeighted(paymentChoices);
      const hour = randInt(7, 20);
      const createdAt = dateAtDaysAgo(d, hour, randInt(0, 59));
      const transactionId = uid("trx");

      txRows.push({ id: transactionId, paymentMethod, total, createdAt });
      for (const item of chosen) {
        itemRows.push({
          id: uid("itm"),
          transactionId,
          productId: item.product.dbId,
          productName: item.product.name,
          quantity: item.quantity,
          unitPrice: item.product.sellPrice,
          costPrice: item.product.buyPrice,
        });
      }
    }
  }

  return { txRows, itemRows };
}

function generateDebts() {
  const seedDebts = [
    { name: "Pak Darto", phone: "081234567890", amount: 85000, daysOverdue: -1, paid: false },
    { name: "Bu Rini", phone: "081298765432", amount: 42000, daysOverdue: 3, paid: false },
    { name: "Mas Ari", phone: "081355599988", amount: 150000, daysOverdue: 4, paid: true },
    { name: "Toko Sari", phone: "081377744411", amount: 230000, daysOverdue: -5, paid: false },
    { name: "Pak Joko", phone: "081311122233", amount: 65000, daysOverdue: 1, paid: false },
    { name: "Bu Wati", phone: "081244455566", amount: 38000, daysOverdue: -3, paid: false },
    { name: "Pak Hadi", phone: "081333344455", amount: 120000, daysOverdue: 7, paid: true },
    { name: "Bu Yanti", phone: "081266677788", amount: 55000, daysOverdue: -2, paid: false },
  ];
  return seedDebts.map((d, i) => ({
    name: d.name,
    phone: d.phone,
    amount: d.amount,
    createdAt: dateAtDaysAgo(2 + i, 9, 30),
    dueDate: dateAtDaysAgo(d.daysOverdue, 18),
    isPaid: d.paid,
  }));
}

function generateExpenses() {
  const items: Array<{ title: string; amount: number; category: "Operasional" | "Belanja" | "Utilitas"; daysAgo: number; hour: number }> = [
    { title: "Belanja gas LPG", amount: 22000, category: "Operasional", daysAgo: 0, hour: 7 },
    { title: "Belanja kulkas minuman", amount: 45000, category: "Utilitas", daysAgo: 1, hour: 9 },
    { title: "Top up stok kopi", amount: 68000, category: "Belanja", daysAgo: 2, hour: 14 },
    { title: "Bayar listrik kios", amount: 125000, category: "Utilitas", daysAgo: 6, hour: 11 },
    { title: "Belanja roti dan susu", amount: 91000, category: "Belanja", daysAgo: 10, hour: 8 },
    { title: "Servis kompor gas", amount: 75000, category: "Operasional", daysAgo: 14, hour: 10 },
    { title: "Beli plastik kemasan", amount: 35000, category: "Belanja", daysAgo: 18, hour: 13 },
    { title: "Bayar internet warung", amount: 150000, category: "Utilitas", daysAgo: 21, hour: 9 },
    { title: "Belanja sembako grosir", amount: 480000, category: "Belanja", daysAgo: 24, hour: 7 },
    { title: "Cetak banner promo", amount: 60000, category: "Operasional", daysAgo: 27, hour: 15 },
  ];
  return items.map((e) => ({
    title: e.title,
    amount: e.amount,
    category: e.category,
    createdAt: dateAtDaysAgo(e.daysAgo, e.hour),
  }));
}

async function seedSampleAiChat(userId: string) {
  const ts = new Date().toISOString();
  const [chat] = await db
    .insert(aiChats)
    .values({
      id: uid("chat"),
      userId,
      title: "Cek stok & untung minggu ini",
      createdAt: ts,
      updatedAt: ts,
    })
    .returning();

  const baseTime = Date.now() - 60_000 * 30;
  const at = (offsetSec: number) => new Date(baseTime + offsetSec * 1000).toISOString();

  await db.insert(aiMessages).values([
    {
      id: uid("msg"),
      chatId: chat.id,
      userId,
      role: "user",
      content: "Sisa stok minyak goreng sekarang berapa?",
      createdAt: at(0),
    },
    {
      id: uid("msg"),
      chatId: chat.id,
      userId,
      role: "assistant",
      content: "",
      toolCalls: [
        {
          id: "call_demo_1",
          type: "function",
          function: { name: "find_product", arguments: '{"query":"minyak goreng"}' },
        },
      ],
      createdAt: at(2),
    },
    {
      id: uid("msg"),
      chatId: chat.id,
      userId,
      role: "tool",
      toolName: "find_product",
      toolCallId: "call_demo_1",
      content: '{"ok":true,"kind":"data","title":"Hasil pencarian","summary":"1 produk cocok"}',
      toolArgs: { query: "minyak goreng" },
      toolResult: {
        ok: true,
        kind: "data",
        title: 'Hasil pencarian: "minyak goreng"',
        summary: "1 produk cocok.",
        rows: [{ label: "Minyak Goreng 1L", value: "6 unit" }],
      },
      createdAt: at(3),
    },
    {
      id: uid("msg"),
      chatId: chat.id,
      userId,
      role: "assistant",
      content: "Stok Minyak Goreng 1L tinggal 6 botol — sudah di batas minimum. Mau saya bantu catat restok?",
      createdAt: at(4),
    },
  ]);
}

async function main() {
  await ensureAppReady();
  const { userId, label } = await resolveTargetUser();

  console.log(`→ Seeding workspace for ${label}…`);

  await clearWorkspace(userId);

  const ts = new Date().toISOString();
  const [existing] = await db
    .select({ userId: storeProfiles.userId })
    .from(storeProfiles)
    .where(eq(storeProfiles.userId, userId))
    .limit(1);

  const profileValues = {
    storeName: seedState.settings.storeName,
    storeTagline: seedState.settings.storeTagline,
    storeAddress: seedState.settings.storeAddress,
    ownerName: seedState.settings.ownerName,
    ownerWhatsapp: seedState.settings.ownerWhatsapp,
    city: seedState.settings.city,
    businessNotes: seedState.settings.businessNotes,
    stockAlertThreshold: seedState.settings.stockAlertThreshold,
    enabledPayments: seedState.settings.enabledPayments,
    updatedAt: ts,
  };

  if (existing) {
    await db.update(storeProfiles).set(profileValues).where(eq(storeProfiles.userId, userId));
  } else {
    await db
      .insert(storeProfiles)
      .values({ userId, ...profileValues, createdAt: ts });
  }

  const productList = seedState.products.map((p) => ({ ...p, dbId: uid("prd") }));

  await db.insert(products).values(
    productList.map((p) => ({
      id: p.dbId,
      userId,
      name: p.name,
      category: p.category,
      buyPrice: p.buyPrice,
      sellPrice: p.sellPrice,
      stock: p.stock,
      minimumStock: p.minimumStock,
      description: p.description,
      createdAt: ts,
      updatedAt: ts,
    }))
  );

  const { txRows, itemRows } = generateTransactionsFor(productList, 30);

  if (txRows.length > 0) {
    await db.insert(transactions).values(
      txRows.map((t) => ({
        id: t.id,
        userId,
        total: t.total,
        paymentMethod: t.paymentMethod,
        createdAt: t.createdAt,
      }))
    );
    await db.insert(transactionItems).values(itemRows);
  }

  const debtRows = generateDebts();
  await db.insert(debts).values(
    debtRows.map((d) => ({
      id: uid("debt"),
      userId,
      borrowerName: d.name,
      whatsapp: d.phone,
      amount: d.amount,
      createdAt: d.createdAt,
      dueDate: d.dueDate,
      isPaid: d.isPaid ? 1 : 0,
      lastReminderAt: null,
    }))
  );

  const expenseRows = generateExpenses();
  await db.insert(expenses).values(
    expenseRows.map((e) => ({
      id: uid("exp"),
      userId,
      title: e.title,
      amount: e.amount,
      category: e.category,
      createdAt: e.createdAt,
    }))
  );

  await seedSampleAiChat(userId);

  const totalRevenue = txRows.reduce((s, t) => s + t.total, 0);

  console.log(`✔ Profil warung   : ${seedState.settings.storeName}`);
  console.log(`✔ Produk          : ${productList.length}`);
  console.log(`✔ Transaksi (30d) : ${txRows.length}  · omzet Rp${totalRevenue.toLocaleString("id-ID")}`);
  console.log(`✔ Item transaksi  : ${itemRows.length}`);
  console.log(`✔ Hutang/kasbon   : ${debtRows.length}  (${debtRows.filter((d) => !d.isPaid).length} belum lunas)`);
  console.log(`✔ Pengeluaran     : ${expenseRows.length}`);
  console.log(`✔ AI chat sample  : 1 percakapan + 4 pesan`);
  console.log(`Done.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
