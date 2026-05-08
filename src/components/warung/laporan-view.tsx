"use client";

import { useState } from "react";
import { Download, Printer, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { useAppState } from "@/components/providers/app-state-provider";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCompactCurrency, formatCurrency, formatDate } from "@/lib/format";
import { buildSeries, estimateProductVelocity, ReportRange, summarizeReport } from "@/lib/reporting";

export function LaporanView() {
  const { transactions, expenses, products, settings } = useAppState();
  const [range, setRange] = useState<ReportRange>("harian");

  const summary = summarizeReport(range, transactions, expenses);
  const series = buildSeries(range, transactions);
  const topVelocity = estimateProductVelocity(products, transactions)
    .sort((left, right) => right.sold - left.sold)
    .slice(0, 4);
  const highestValue = Math.max(...series.map((item) => item.revenue), 1);

  const rangeLabel =
    range === "harian" ? "Hari ini" : range === "mingguan" ? "Minggu ini" : "Bulan ini";

  return (
    <div className="space-y-4">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Omzet"
          value={formatCompactCurrency(summary.revenue)}
          description={`Total pemasukan untuk periode ${rangeLabel.toLowerCase()}.`}
        />
        <StatCard
          title="Laba kotor"
          value={formatCompactCurrency(summary.grossProfit)}
          description="Penjualan dikurangi modal barang yang terjual."
          tone="accent"
        />
        <StatCard
          title="Pengeluaran"
          value={formatCompactCurrency(summary.expenseTotal)}
          description="Biaya operasional dan belanja yang masuk di periode ini."
        />
        <StatCard
          title="Laba bersih"
          value={formatCompactCurrency(summary.netProfit)}
          description="Perkiraan hasil akhir setelah modal dan pengeluaran dikurangi."
          tone="warn"
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-border/60 bg-card/74 shadow-[0_28px_70px_-45px_rgba(66,38,20,0.55)]">
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="font-heading text-2xl">Ringkasan performa</CardTitle>
              <CardDescription>
                Ganti periode untuk membaca ritme omzet dan laba warung secara cepat.
              </CardDescription>
            </div>

            <Tabs value={range} onValueChange={(value) => setRange(value as ReportRange)}>
              <TabsList className="rounded-full p-1">
                <TabsTrigger value="harian" className="rounded-full px-4">
                  Harian
                </TabsTrigger>
                <TabsTrigger value="mingguan" className="rounded-full px-4">
                  Mingguan
                </TabsTrigger>
                <TabsTrigger value="bulanan" className="rounded-full px-4">
                  Bulanan
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-[26px] border border-border/70 bg-card/80 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tren omzet</p>
                  <p className="mt-2 font-heading text-3xl font-semibold">{formatCurrency(summary.revenue)}</p>
                </div>
                <div className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground">
                  {summary.transactionCount} transaksi
                </div>
              </div>

              <div className="mt-6 flex h-52 items-end gap-3">
                {series.map((item) => (
                  <div key={item.label} className="flex flex-1 flex-col items-center gap-3">
                    <div className="flex w-full flex-1 items-end">
                      <div
                        className="w-full rounded-t-[18px] bg-gradient-to-t from-primary to-chart-3 shadow-[0_18px_28px_-18px_rgba(186,92,35,0.8)]"
                        style={{
                          height: `${Math.max(14, (item.revenue / highestValue) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-medium text-foreground">{item.label}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {formatCompactCurrency(item.revenue)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-[26px] border border-border/70 bg-card/80 p-5">
                <p className="text-sm text-muted-foreground">Rata-rata tiket</p>
                <p className="mt-2 font-heading text-3xl font-semibold">
                  {formatCurrency(summary.averageTicket)}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Nilai rata-rata per transaksi untuk periode {rangeLabel.toLowerCase()}.
                </p>
              </div>

              <div className="rounded-[26px] border border-border/70 bg-card/80 p-5">
                <p className="text-sm text-muted-foreground">Produk paling bergerak</p>
                <div className="mt-4 space-y-3">
                  {topVelocity.map((item) => (
                    <div key={item.productId} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{item.name}</span>
                      <span className="text-sm text-muted-foreground">{item.sold} terjual</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/74 shadow-[0_28px_70px_-45px_rgba(66,38,20,0.55)]">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="font-heading text-2xl">Preview laporan PDF</CardTitle>
              <CardDescription>
                Layout ini sengaja dibuat printable, tapi tombol ekspor masih demo frontend.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() =>
                  toast.info("Mode print browser belum diaktifkan.", {
                    description: "Layout preview sudah disiapkan untuk tahap integrasi selanjutnya.",
                  })
                }
              >
                <Printer className="size-4" />
                Preview print
              </Button>
              <Button
                type="button"
                className="rounded-full"
                onClick={() =>
                  toast.info("Cetak PDF masih placeholder.", {
                    description: "Nanti tombol ini bisa dihubungkan ke generator PDF atau print layout.",
                  })
                }
              >
                <Download className="size-4" />
                Cetak PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-[30px] bg-[#fffaf5] p-6 shadow-inner ring-1 ring-border/80">
              <div className="flex items-start justify-between gap-4 border-b border-dashed border-border/80 pb-5">
                <div>
                  <p className="text-sm uppercase tracking-[0.22em] text-primary">Warung OS report</p>
                  <h3 className="mt-2 font-heading text-3xl font-semibold">{settings.storeName}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {[settings.storeTagline, settings.city].filter(Boolean).join(" • ")}
                  </p>
                  <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                    {settings.storeAddress}
                  </p>
                </div>
                <div className="rounded-[22px] bg-foreground px-4 py-3 text-right text-background">
                  <p className="text-xs uppercase tracking-[0.18em] text-background/70">{rangeLabel}</p>
                  <p className="mt-2 font-heading text-2xl font-semibold">{formatCurrency(summary.netProfit)}</p>
                </div>
              </div>

              <div className="grid gap-4 border-b border-dashed border-border/80 py-5 sm:grid-cols-2">
                <div className="rounded-[22px] bg-card p-4 ring-1 ring-border/70">
                  <p className="text-sm text-muted-foreground">Omzet</p>
                  <p className="mt-2 text-2xl font-semibold">{formatCurrency(summary.revenue)}</p>
                </div>
                <div className="rounded-[22px] bg-card p-4 ring-1 ring-border/70">
                  <p className="text-sm text-muted-foreground">Pengeluaran</p>
                  <p className="mt-2 text-2xl font-semibold">{formatCurrency(summary.expenseTotal)}</p>
                </div>
                <div className="rounded-[22px] bg-card p-4 ring-1 ring-border/70">
                  <p className="text-sm text-muted-foreground">Laba kotor</p>
                  <p className="mt-2 text-2xl font-semibold">{formatCurrency(summary.grossProfit)}</p>
                </div>
                <div className="rounded-[22px] bg-card p-4 ring-1 ring-border/70">
                  <p className="text-sm text-muted-foreground">Rata-rata transaksi</p>
                  <p className="mt-2 text-2xl font-semibold">{formatCurrency(summary.averageTicket)}</p>
                </div>
              </div>

              <div className="space-y-4 py-5">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <TrendingUp className="size-4 text-primary" />
                  Catatan untuk pemilik warung
                </div>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="rounded-[18px] bg-card px-4 py-3 ring-1 ring-border/70">
                    Laba bersih periode {rangeLabel.toLowerCase()} tercatat {formatCurrency(summary.netProfit)}.
                  </li>
                  <li className="rounded-[18px] bg-card px-4 py-3 ring-1 ring-border/70">
                    Produk paling sering bergerak: {topVelocity.map((item) => item.name).join(", ")}.
                  </li>
                  <li className="rounded-[18px] bg-card px-4 py-3 ring-1 ring-border/70">
                    Data ini masih mock frontend, namun layout dan struktur metrik sudah siap dipakai saat API aktif.
                  </li>
                </ul>
              </div>

              <div className="flex items-center justify-between border-t border-dashed border-border/80 pt-5 text-sm text-muted-foreground">
                <span>Disusun otomatis oleh Warung OS</span>
                <span>{formatDate(new Date().toISOString())}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
