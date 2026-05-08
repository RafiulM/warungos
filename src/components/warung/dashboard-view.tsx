"use client";

import { AlertTriangle, ArrowRightLeft, Clock3, ReceiptText, WalletCards } from "lucide-react";
import { useAppState } from "@/components/providers/app-state-provider";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDateTime, formatTime } from "@/lib/format";

export function DashboardView() {
  const { debts, lowStockProducts, products, transactions } = useAppState();

  const todayTransactions = transactions.filter((transaction) => {
    const value = new Date(transaction.createdAt);
    const now = new Date();
    return value.toDateString() === now.toDateString();
  });

  const todaySales = todayTransactions.reduce(
    (sum, transaction) => sum + transaction.total,
    0
  );
  const outstandingDebt = debts
    .filter((debt) => !debt.isPaid)
    .reduce((sum, debt) => sum + debt.amount, 0);
  const latestTransaction = transactions[0] ?? null;
  const latestDebts = debts.slice(0, 4);

  return (
    <div className="space-y-4">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Omzet hari ini"
          value={formatCurrency(todaySales)}
          description="Akumulasi transaksi yang sudah masuk sejak pagi."
        />
        <StatCard
          title="Transaksi hari ini"
          value={`${todayTransactions.length} transaksi`}
          description="Ringkasan cepat untuk memantau ritme kasir."
          tone="accent"
        />
        <StatCard
          title="Stok menipis"
          value={`${lowStockProducts.length} item`}
          description="Barang yang mulai rawan kosong dan sebaiknya segera dicek."
          tone="warn"
        />
        <StatCard
          title="Kasbon aktif"
          value={formatCurrency(outstandingDebt)}
          description="Total piutang pelanggan yang belum lunas."
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-border/60 bg-card/74 shadow-[0_28px_70px_-45px_rgba(66,38,20,0.55)]">
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Aktivitas terbaru</CardTitle>
            <CardDescription>
              Semua ringkasan yang sebelumnya membuat layar kasir terasa penuh dipindahkan ke sini.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[26px] bg-foreground px-5 py-5 text-background">
              <div className="flex items-center gap-2 text-background/75">
                <ReceiptText className="size-4 text-primary" />
                <p className="text-sm font-medium">Transaksi terakhir</p>
              </div>

              {latestTransaction ? (
                <>
                  <p className="mt-3 font-heading text-4xl font-semibold">
                    {formatCurrency(latestTransaction.total)}
                  </p>
                  <p className="mt-2 text-sm text-background/75">
                    {latestTransaction.paymentMethod} • {formatTime(latestTransaction.createdAt)}
                  </p>
                  <div className="mt-5 space-y-3">
                    {latestTransaction.items.map((item) => (
                      <div
                        key={`${latestTransaction.id}-${item.productId}`}
                        className="flex items-center justify-between text-sm"
                      >
                        <span>
                          {item.productName} x{item.quantity}
                        </span>
                        <span className="font-medium">
                          {formatCurrency(item.unitPrice * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="mt-4 text-sm text-background/75">
                  Belum ada transaksi yang tersimpan.
                </p>
              )}
            </div>

            <div className="rounded-[26px] border border-border/70 bg-card/82 p-5">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="size-4 text-primary" />
                <p className="font-medium">Timeline transaksi</p>
              </div>
              <div className="mt-5 space-y-4">
                {transactions.slice(0, 5).map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-start justify-between gap-3 rounded-[20px] bg-muted/50 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium">{formatCurrency(transaction.total)}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {transaction.items.length} produk • {transaction.paymentMethod}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(transaction.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-border/60 bg-card/74 shadow-[0_28px_70px_-45px_rgba(66,38,20,0.55)]">
            <CardHeader>
              <CardTitle className="font-heading text-2xl">Stok perlu perhatian</CardTitle>
              <CardDescription>
                Cocok dibuka sebelum restok atau saat mau tutup toko.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {lowStockProducts.length > 0 ? (
                lowStockProducts.slice(0, 5).map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between rounded-[20px] border border-border/70 bg-card/80 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                        <AlertTriangle className="size-4" />
                      </div>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{product.category}</p>
                      </div>
                    </div>
                    <Badge className="rounded-full bg-primary text-primary-foreground">
                      {product.stock} / min {product.minimumStock}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="rounded-[20px] bg-accent px-4 py-5 text-sm text-accent-foreground">
                  Semua stok aman. Belum ada produk yang menyentuh batas minimum.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/74 shadow-[0_28px_70px_-45px_rgba(66,38,20,0.55)]">
            <CardHeader>
              <CardTitle className="font-heading text-2xl">Kasbon terbaru</CardTitle>
              <CardDescription>
                Ringkas untuk follow-up pelanggan tanpa masuk ke halaman penuh buku hutang.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {latestDebts.map((debt) => (
                <div
                  key={debt.id}
                  className="flex items-start justify-between gap-3 rounded-[20px] border border-border/70 bg-card/80 px-4 py-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <WalletCards className="size-4 text-primary" />
                      <p className="font-medium">{debt.borrowerName}</p>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{debt.whatsapp}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(debt.amount)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {debt.isPaid ? "Lunas" : "Belum lunas"}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/74 shadow-[0_28px_70px_-45px_rgba(66,38,20,0.55)]">
            <CardContent className="flex items-center justify-between gap-4 p-5">
              <div>
                <p className="text-sm text-muted-foreground">SKU aktif</p>
                <p className="mt-2 font-heading text-3xl font-semibold">{products.length} produk</p>
              </div>
              <div className="flex size-12 items-center justify-center rounded-2xl bg-foreground text-background">
                <Clock3 className="size-5" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
