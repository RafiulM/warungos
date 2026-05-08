import { and, desc, eq, sql } from "drizzle-orm";
import { db, pool } from "@/db/client";
import { debts, products, storeProfiles } from "@/db/schema";
import {
  createDebt,
  createExpense,
  createProduct,
  createTransaction,
  markDebtPaid,
  restockProduct,
} from "@/lib/server/app-service";
import type { OpenRouterToolDef } from "./openrouter";

export type ToolKind =
  | "data"
  | "suggestion"
  | "action"
  | "navigation"
  | "info";

export type ToolResult = {
  ok: boolean;
  kind: ToolKind;
  title: string;
  summary?: string;
  rows?: Array<{ label: string; value: string; tone?: "default" | "warn" | "success" }>;
  data?: unknown;
  message?: string;
  error?: string;
};

function rupiah(value: number) {
  return `Rp${Math.round(value).toLocaleString("id-ID")}`;
}

function periodRange(period: "today" | "week" | "month") {
  const now = new Date();
  const start = new Date(now);
  if (period === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (period === "week") {
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
  } else {
    start.setDate(now.getDate() - 29);
    start.setHours(0, 0, 0, 0);
  }
  return { start: start.toISOString(), end: now.toISOString() };
}

export const toolDefinitions: OpenRouterToolDef[] = [
  {
    type: "function",
    function: {
      name: "get_inventory_overview",
      description:
        "Ambil daftar semua produk milik pengguna beserta stok, harga jual, harga beli, dan flag stok menipis. Gunakan saat user bertanya stok, daftar barang, atau butuh data inventaris.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "find_product",
      description:
        "Cari produk berdasarkan nama (case-insensitive, partial match). Gunakan untuk menemukan productId sebelum aksi seperti restock_product atau record_sale.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Kata kunci nama produk." },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_product",
      description:
        "Tambahkan produk baru ke inventaris. Hanya jalankan setelah user mengkonfirmasi nama, kategori, harga beli, harga jual, dan stok awal.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          category: {
            type: "string",
            enum: ["Makanan", "Minuman", "Sembako", "Kebutuhan Harian"],
          },
          buyPrice: { type: "number", description: "Harga beli per unit (Rupiah)." },
          sellPrice: { type: "number", description: "Harga jual per unit (Rupiah)." },
          stock: { type: "number", description: "Stok awal." },
          minimumStock: { type: "number", description: "Threshold peringatan stok menipis." },
          description: { type: "string" },
        },
        required: ["name", "category", "buyPrice", "sellPrice", "stock", "minimumStock"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "restock_product",
      description: "Tambah stok produk yang sudah ada. Jumlah harus positif.",
      parameters: {
        type: "object",
        properties: {
          productId: { type: "string" },
          quantity: { type: "number", description: "Jumlah unit yang ditambahkan." },
        },
        required: ["productId", "quantity"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "record_sale",
      description:
        "Catat transaksi penjualan (kasir). Setiap item akan memotong stok produk dan masuk ke pembukuan.",
      parameters: {
        type: "object",
        properties: {
          paymentMethod: { type: "string", enum: ["Tunai", "QRIS", "Transfer"] },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                productId: { type: "string" },
                quantity: { type: "number" },
              },
              required: ["productId", "quantity"],
              additionalProperties: false,
            },
          },
        },
        required: ["paymentMethod", "items"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_sales_summary",
      description:
        "Hitung omzet kotor, harga pokok penjualan (HPP), pengeluaran, dan laba bersih untuk periode tertentu.",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", enum: ["today", "week", "month"] },
        },
        required: ["period"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_unpaid_debts",
      description: "Ambil daftar kasbon (hutang pelanggan) yang belum lunas.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "create_debt",
      description: "Catat kasbon baru untuk pelanggan.",
      parameters: {
        type: "object",
        properties: {
          borrowerName: { type: "string" },
          whatsapp: { type: "string", description: "Nomor WhatsApp pelanggan." },
          amount: { type: "number" },
          dueDate: {
            type: "string",
            description: "Tanggal jatuh tempo (ISO 8601, contoh 2026-05-15).",
          },
        },
        required: ["borrowerName", "whatsapp", "amount", "dueDate"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "mark_debt_paid",
      description: "Tandai kasbon sebagai lunas.",
      parameters: {
        type: "object",
        properties: {
          debtId: { type: "string" },
        },
        required: ["debtId"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "record_expense",
      description: "Catat pengeluaran usaha.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          amount: { type: "number" },
          category: { type: "string", enum: ["Operasional", "Belanja", "Utilitas"] },
        },
        required: ["title", "amount", "category"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_profit_recommendations",
      description:
        "Analisis 30 hari terakhir: produk paling untung, produk lambat, dan rekomendasi restok prioritas. Jelaskan ke user dengan bahasa sederhana.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
];

async function execGetInventoryOverview(userId: string): Promise<ToolResult> {
  const rows = await db
    .select()
    .from(products)
    .where(eq(products.userId, userId))
    .orderBy(desc(products.updatedAt));

  const lowStock = rows.filter((p) => p.stock <= p.minimumStock);

  return {
    ok: true,
    kind: "data",
    title: "Ringkasan Inventaris",
    summary: `${rows.length} produk · ${lowStock.length} stok menipis.`,
    rows: rows.slice(0, 12).map((p) => ({
      label: p.name,
      value: `${p.stock} unit · ${rupiah(p.sellPrice)}`,
      tone: p.stock <= p.minimumStock ? ("warn" as const) : ("default" as const),
    })),
    data: {
      total: rows.length,
      lowStockCount: lowStock.length,
      products: rows.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        stock: p.stock,
        minimumStock: p.minimumStock,
        buyPrice: p.buyPrice,
        sellPrice: p.sellPrice,
      })),
    },
  };
}

async function execFindProduct(userId: string, query: string): Promise<ToolResult> {
  const like = `%${query.toLowerCase()}%`;
  const rows = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.userId, userId),
        sql`lower(${products.name}) like ${like}`
      )
    )
    .limit(10);

  if (rows.length === 0) {
    return {
      ok: false,
      kind: "info",
      title: "Tidak ditemukan",
      message: `Tidak ada produk yang cocok dengan "${query}".`,
    };
  }

  return {
    ok: true,
    kind: "data",
    title: `Hasil pencarian: "${query}"`,
    summary: `${rows.length} produk cocok.`,
    rows: rows.map((p) => ({
      label: p.name,
      value: `${p.stock} unit · ${p.id}`,
    })),
    data: rows.map((p) => ({
      id: p.id,
      name: p.name,
      stock: p.stock,
      buyPrice: p.buyPrice,
      sellPrice: p.sellPrice,
    })),
  };
}

async function execCreateProduct(
  userId: string,
  args: {
    name: string;
    category: "Makanan" | "Minuman" | "Sembako" | "Kebutuhan Harian";
    buyPrice: number;
    sellPrice: number;
    stock: number;
    minimumStock: number;
    description?: string;
  }
): Promise<ToolResult> {
  const product = await createProduct(userId, {
    name: args.name,
    category: args.category,
    buyPrice: args.buyPrice,
    sellPrice: args.sellPrice,
    stock: args.stock,
    minimumStock: args.minimumStock,
    description: args.description ?? "",
  });

  return {
    ok: true,
    kind: "action",
    title: "Produk baru ditambahkan",
    summary: product.name,
    rows: [
      { label: "ID", value: product.id },
      { label: "Kategori", value: product.category },
      { label: "Harga jual", value: rupiah(product.sellPrice) },
      { label: "Stok awal", value: `${product.stock} unit` },
    ],
    data: product,
  };
}

async function execRestockProduct(
  userId: string,
  args: { productId: string; quantity: number }
): Promise<ToolResult> {
  if (args.quantity <= 0) {
    return { ok: false, kind: "info", title: "Jumlah restok tidak valid", error: "quantity harus > 0" };
  }
  const updated = await restockProduct(userId, args.productId, args.quantity);
  return {
    ok: true,
    kind: "action",
    title: "Restok berhasil",
    summary: updated.name,
    rows: [
      { label: "Tambahan", value: `+${args.quantity} unit` },
      { label: "Stok sekarang", value: `${updated.stock} unit`, tone: "success" },
    ],
    data: updated,
  };
}

async function execRecordSale(
  userId: string,
  args: {
    paymentMethod: "Tunai" | "QRIS" | "Transfer";
    items: Array<{ productId: string; quantity: number }>;
  }
): Promise<ToolResult> {
  const result = await createTransaction(userId, args);
  return {
    ok: true,
    kind: "action",
    title: "Transaksi tercatat",
    summary: `${result.transaction.items.length} item · ${args.paymentMethod}`,
    rows: [
      { label: "ID transaksi", value: result.transaction.id },
      { label: "Total", value: rupiah(result.transaction.total), tone: "success" },
      { label: "Metode bayar", value: result.transaction.paymentMethod },
    ],
    data: { transactionId: result.transaction.id, total: result.transaction.total, items: result.transaction.items },
  };
}

async function execGetSalesSummary(
  userId: string,
  args: { period: "today" | "week" | "month" }
): Promise<ToolResult> {
  const { start, end } = periodRange(args.period);

  const txRow = await pool.query<{
    revenue: string | null;
    cogs: string | null;
    items_count: string | null;
    tx_count: string | null;
  }>(
    `select
       coalesce(sum(ti.unit_price * ti.quantity), 0)::text as revenue,
       coalesce(sum(ti.cost_price * ti.quantity), 0)::text as cogs,
       coalesce(sum(ti.quantity), 0)::text as items_count,
       count(distinct t.id)::text as tx_count
     from transactions t
     left join transaction_items ti on ti.transaction_id = t.id
     where t.user_id = $1 and t.created_at >= $2 and t.created_at <= $3`,
    [userId, start, end]
  );

  const expenseRow = await pool.query<{ total: string | null }>(
    `select coalesce(sum(amount), 0)::text as total
     from expenses
     where user_id = $1 and created_at >= $2 and created_at <= $3`,
    [userId, start, end]
  );

  const revenue = Number(txRow.rows[0]?.revenue ?? 0);
  const cogs = Number(txRow.rows[0]?.cogs ?? 0);
  const expenseTotal = Number(expenseRow.rows[0]?.total ?? 0);
  const grossProfit = revenue - cogs;
  const netProfit = grossProfit - expenseTotal;

  const periodLabel =
    args.period === "today" ? "Hari ini" : args.period === "week" ? "7 hari terakhir" : "30 hari terakhir";

  return {
    ok: true,
    kind: "data",
    title: `Ringkasan Penjualan · ${periodLabel}`,
    summary: `${txRow.rows[0]?.tx_count ?? 0} transaksi · ${txRow.rows[0]?.items_count ?? 0} unit terjual.`,
    rows: [
      { label: "Omzet kotor", value: rupiah(revenue) },
      { label: "HPP barang terjual", value: rupiah(cogs) },
      { label: "Laba kotor", value: rupiah(grossProfit) },
      { label: "Pengeluaran lain", value: rupiah(expenseTotal) },
      { label: "Laba bersih", value: rupiah(netProfit), tone: netProfit >= 0 ? "success" : "warn" },
    ],
    data: { revenue, cogs, grossProfit, expenseTotal, netProfit, period: args.period },
  };
}

async function execListUnpaidDebts(userId: string): Promise<ToolResult> {
  const rows = await db
    .select()
    .from(debts)
    .where(and(eq(debts.userId, userId), eq(debts.isPaid, 0)))
    .orderBy(desc(debts.dueDate));

  const total = rows.reduce((s, d) => s + d.amount, 0);

  return {
    ok: true,
    kind: "data",
    title: "Kasbon Belum Lunas",
    summary: `${rows.length} pelanggan · total ${rupiah(total)}.`,
    rows: rows.slice(0, 10).map((d) => ({
      label: d.borrowerName,
      value: rupiah(d.amount),
      tone: "warn" as const,
    })),
    data: rows.map((d) => ({
      id: d.id,
      borrowerName: d.borrowerName,
      whatsapp: d.whatsapp,
      amount: d.amount,
      dueDate: d.dueDate,
    })),
  };
}

async function execCreateDebt(
  userId: string,
  args: { borrowerName: string; whatsapp: string; amount: number; dueDate: string }
): Promise<ToolResult> {
  const debt = await createDebt(userId, args);
  return {
    ok: true,
    kind: "action",
    title: "Kasbon dicatat",
    summary: debt.borrowerName,
    rows: [
      { label: "Nominal", value: rupiah(debt.amount) },
      { label: "WhatsApp", value: debt.whatsapp },
      { label: "Jatuh tempo", value: debt.dueDate.slice(0, 10) },
    ],
    data: debt,
  };
}

async function execMarkDebtPaid(userId: string, args: { debtId: string }): Promise<ToolResult> {
  const debt = await markDebtPaid(userId, args.debtId);
  return {
    ok: true,
    kind: "action",
    title: "Kasbon dilunasi",
    summary: debt.borrowerName,
    rows: [
      { label: "Nominal", value: rupiah(debt.amount), tone: "success" },
    ],
    data: debt,
  };
}

async function execRecordExpense(
  userId: string,
  args: { title: string; amount: number; category: "Operasional" | "Belanja" | "Utilitas" }
): Promise<ToolResult> {
  const expense = await createExpense(userId, args);
  return {
    ok: true,
    kind: "action",
    title: "Pengeluaran tercatat",
    summary: expense.title,
    rows: [
      { label: "Jumlah", value: rupiah(expense.amount) },
      { label: "Kategori", value: expense.category },
    ],
    data: expense,
  };
}

async function execGetProfitRecommendations(userId: string): Promise<ToolResult> {
  const { start, end } = periodRange("month");

  const top = await pool.query<{
    product_id: string;
    name: string | null;
    units: string;
    profit: string;
    stock: number | null;
    minimum_stock: number | null;
    sell_price: number | null;
    buy_price: number | null;
  }>(
    `select
       ti.product_id,
       p.name,
       coalesce(sum(ti.quantity), 0)::text as units,
       coalesce(sum((ti.unit_price - ti.cost_price) * ti.quantity), 0)::text as profit,
       p.stock,
       p.minimum_stock,
       p.sell_price,
       p.buy_price
     from transaction_items ti
     join transactions t on t.id = ti.transaction_id
     left join products p on p.id = ti.product_id and p.user_id = t.user_id
     where t.user_id = $1 and t.created_at >= $2 and t.created_at <= $3
     group by ti.product_id, p.name, p.stock, p.minimum_stock, p.sell_price, p.buy_price
     order by profit desc
     limit 50`,
    [userId, start, end]
  );

  const ranked = top.rows.map((r) => ({
    productId: r.product_id,
    name: r.name ?? "(produk dihapus)",
    units: Number(r.units),
    profit: Number(r.profit),
    stock: r.stock ?? 0,
    minimumStock: r.minimum_stock ?? 0,
    sellPrice: r.sell_price ?? 0,
    buyPrice: r.buy_price ?? 0,
  }));

  const topEarners = ranked.slice(0, 5);
  const restockPriority = ranked
    .filter((r) => r.stock <= r.minimumStock && r.units > 0)
    .slice(0, 5);

  const allProducts = await db
    .select()
    .from(products)
    .where(eq(products.userId, userId));
  const soldIds = new Set(ranked.filter((r) => r.units > 0).map((r) => r.productId));
  const slowMovers = allProducts
    .filter((p) => !soldIds.has(p.id))
    .slice(0, 5)
    .map((p) => ({
      productId: p.id,
      name: p.name,
      stock: p.stock,
      capitalLocked: p.stock * p.buyPrice,
    }));

  return {
    ok: true,
    kind: "suggestion",
    title: "Rekomendasi Untung Maksimal",
    summary: "Analisis 30 hari terakhir.",
    rows: topEarners.map((r) => ({
      label: r.name,
      value: `Untung ${rupiah(r.profit)} · ${r.units} unit`,
      tone: "success" as const,
    })),
    data: {
      topEarners,
      restockPriority,
      slowMovers,
      narrative:
        topEarners.length > 0
          ? `Produk paling untung: ${topEarners
              .slice(0, 3)
              .map((r) => r.name)
              .join(", ")}. ${restockPriority.length > 0 ? `Restok segera: ${restockPriority.map((r) => r.name).join(", ")}.` : ""}`
          : "Belum ada penjualan dalam 30 hari terakhir untuk dianalisis.",
    },
  };
}

export async function executeTool(
  userId: string,
  name: string,
  argsJson: string
): Promise<ToolResult> {
  let args: Record<string, unknown> = {};
  try {
    args = argsJson ? JSON.parse(argsJson) : {};
  } catch {
    return { ok: false, kind: "info", title: "Argument invalid", error: "Argument JSON malformed." };
  }

  try {
    switch (name) {
      case "get_inventory_overview":
        return await execGetInventoryOverview(userId);
      case "find_product":
        return await execFindProduct(userId, String(args.query ?? ""));
      case "create_product":
        return await execCreateProduct(userId, args as Parameters<typeof execCreateProduct>[1]);
      case "restock_product":
        return await execRestockProduct(userId, args as Parameters<typeof execRestockProduct>[1]);
      case "record_sale":
        return await execRecordSale(userId, args as Parameters<typeof execRecordSale>[1]);
      case "get_sales_summary":
        return await execGetSalesSummary(userId, args as Parameters<typeof execGetSalesSummary>[1]);
      case "list_unpaid_debts":
        return await execListUnpaidDebts(userId);
      case "create_debt":
        return await execCreateDebt(userId, args as Parameters<typeof execCreateDebt>[1]);
      case "mark_debt_paid":
        return await execMarkDebtPaid(userId, args as Parameters<typeof execMarkDebtPaid>[1]);
      case "record_expense":
        return await execRecordExpense(userId, args as Parameters<typeof execRecordExpense>[1]);
      case "get_profit_recommendations":
        return await execGetProfitRecommendations(userId);
      default:
        return { ok: false, kind: "info", title: "Tool tidak dikenali", error: `Unknown tool: ${name}` };
    }
  } catch (error) {
    return {
      ok: false,
      kind: "info",
      title: "Tool gagal",
      error: error instanceof Error ? error.message : "Tool execution failed.",
    };
  }
}

export async function buildSystemContext(userId: string): Promise<string> {
  const [profile] = await db
    .select()
    .from(storeProfiles)
    .where(eq(storeProfiles.userId, userId))
    .limit(1);

  const productCount = await pool.query<{ c: string }>(
    "select count(*)::text as c from products where user_id = $1",
    [userId]
  );
  const debtUnpaid = await pool.query<{ c: string }>(
    "select count(*)::text as c from debts where user_id = $1 and is_paid = 0",
    [userId]
  );
  const today = new Date().toISOString().slice(0, 10);
  const storeName = profile?.storeName ?? "Warung";
  const ownerName = profile?.ownerName ?? "Pemilik";
  const city = profile?.city ?? "-";
  const threshold = profile?.stockAlertThreshold ?? 8;

  return [
    `Anda adalah WarungOS AI, asisten virtual khusus pemilik UMKM Indonesia (warung).`,
    `Pengguna: ${ownerName}, pemilik "${storeName}" di ${city}.`,
    `Tanggal hari ini: ${today}. Stok minimum default: ${threshold}. Jumlah produk aktif: ${productCount.rows[0]?.c ?? 0}. Kasbon belum lunas: ${debtUnpaid.rows[0]?.c ?? 0}.`,
    `ATURAN:`,
    `1. Selalu jawab dalam Bahasa Indonesia santai dan ringkas (1-3 kalimat) kecuali user minta detail.`,
    `2. Untuk pertanyaan data (stok, untung, kasbon), WAJIB panggil tool yang sesuai - jangan menebak angka.`,
    `3. Untuk perintah aksi (catat, tambah, lunas, restok), panggil tool aksi terkait. Jika data kurang, tanya user lebih dulu.`,
    `4. Saat memanggil tool yang butuh productId, panggil find_product dulu untuk dapat ID-nya.`,
    `5. Format Rupiah: "Rp50.000" bukan "50000".`,
    `6. Jangan pernah mengarang ID, nama produk, atau angka.`,
  ].join("\n");
}
