"use client";

import { useState } from "react";
import { BanknoteArrowDown, Coffee, CreditCard, Minus, PackageSearch, Plus, ReceiptText, Search, ShoppingBasket, Sparkles, Wheat, X } from "lucide-react";
import { toast } from "sonner";
import { useAppState } from "@/components/providers/app-state-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency } from "@/lib/format";
import { PaymentMethod, Product, ProductCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

const paymentLabels: Record<PaymentMethod, string> = {
  Tunai: "Tunai",
  QRIS: "QRIS",
  Transfer: "Transfer",
};

const categoryLabels: Array<{ value: "Semua" | ProductCategory; label: string }> = [
  { value: "Semua", label: "Semua" },
  { value: "Makanan", label: "Makanan" },
  { value: "Minuman", label: "Minuman" },
  { value: "Sembako", label: "Sembako" },
  { value: "Kebutuhan Harian", label: "Harian" },
];

function ProductCategoryIcon({ category }: { category: ProductCategory }) {
  if (category === "Minuman") {
    return <Coffee className="size-5" />;
  }

  if (category === "Sembako") {
    return <Wheat className="size-5" />;
  }

  if (category === "Kebutuhan Harian") {
    return <Sparkles className="size-5" />;
  }

  return <ShoppingBasket className="size-5" />;
}

function ProductCard({
  product,
  onAdd,
}: {
  product: Product;
  onAdd: () => void;
}) {
  const lowStock = product.stock <= product.minimumStock;

  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={product.stock <= 0}
      className={cn(
        "group flex min-h-[164px] flex-col justify-between rounded-[26px] border border-border/65 bg-card/80 p-4 text-left shadow-[0_24px_50px_-36px_rgba(66,38,20,0.48)] transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_26px_60px_-34px_rgba(186,92,35,0.4)] disabled:cursor-not-allowed disabled:opacity-55",
        lowStock && "border-primary/45 bg-primary/8"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-foreground text-background">
          <ProductCategoryIcon category={product.category} />
        </div>
        <Badge
          className={cn(
            "rounded-full border-0 px-3 py-1 text-xs",
            lowStock ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"
          )}
        >
          {product.stock} stok
        </Badge>
      </div>

      <div className="space-y-2">
        <p className="font-heading text-lg font-semibold tracking-tight">{product.name}</p>
        <p className="line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {product.category}
          </p>
          <p className="mt-1 text-lg font-semibold">{formatCurrency(product.sellPrice)}</p>
        </div>
        <div className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition group-hover:bg-primary">
          Tap
        </div>
      </div>
    </button>
  );
}

export function KasirView() {
  const {
    products,
    cartLines,
    cartTotal,
    paymentMethod,
    settings,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    setPaymentMethod,
    checkout,
  } = useAppState();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"Semua" | ProductCategory>("Semua");

  const filteredProducts = products.filter((product) => {
    const queryMatch =
      query.length === 0 ||
      product.name.toLowerCase().includes(query.toLowerCase()) ||
      product.description.toLowerCase().includes(query.toLowerCase());
    const categoryMatch = category === "Semua" || product.category === category;
    return queryMatch && categoryMatch;
  });

  async function handleCheckout() {
    try {
      const transaction = await checkout();
      if (!transaction) {
        toast.error("Keranjang masih kosong.");
        return;
      }

      const lowProducts = transaction.items.reduce<Product[]>((items, item) => {
        const product = products.find((candidate) => candidate.id === item.productId);
        if (!product) {
          return items;
        }

        if (product.stock - item.quantity <= product.minimumStock) {
          items.push(product);
        }

        return items;
      }, []);

      toast.success("Transaksi berhasil disimpan.", {
        description: `${transaction.items.length} produk masuk ke penjualan ${paymentLabels[transaction.paymentMethod]}.`,
      });

      if (lowProducts.length > 0) {
        toast.warning("Ada produk yang mendekati stok minimum.", {
          description: `Siapkan restok untuk ${lowProducts.slice(0, 2).map((item) => item.name).join(", ")}.`,
        });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan transaksi.");
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.7fr_0.95fr]">
      <div>
        <Card className="border-border/60 bg-card/74 shadow-[0_28px_70px_-45px_rgba(66,38,20,0.55)]">
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="font-heading text-2xl">Produk siap jual</CardTitle>
              <CardDescription>
                Semua fokus kasir ada di sini: cari produk, tap item, lalu lanjut ke keranjang.
              </CardDescription>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative min-w-[220px]">
                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Cari produk atau kategori"
                  className="h-11 rounded-2xl border-border/80 bg-card/80 pl-9"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {categoryLabels.map((item) => (
                  <Button
                    key={item.value}
                    type="button"
                    variant={category === item.value ? "default" : "outline"}
                    className="rounded-full"
                    onClick={() => setCategory(item.value)}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredProducts.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAdd={() => {
                      addToCart(product.id);
                      toast.success(`${product.name} ditambahkan ke keranjang.`, {
                        description: `Stok tersedia ${product.stock} pcs.`,
                      });
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="flex min-h-[240px] flex-col items-center justify-center rounded-[26px] border border-dashed border-border bg-card/55 text-center">
                <PackageSearch className="size-10 text-muted-foreground" />
                <p className="mt-4 font-heading text-xl font-semibold">Produk tidak ditemukan</p>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  Coba kata kunci lain atau pilih kategori yang lebih luas untuk melihat produk aktif.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <Card className="glass-panel sticky top-4 border-border/60 shadow-[0_28px_70px_-48px_rgba(66,38,20,0.6)]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-heading text-2xl">Keranjang aktif</CardTitle>
                <CardDescription>Semua item yang sudah ditap akan muncul di sini.</CardDescription>
              </div>
              <Badge className="rounded-full bg-foreground text-background">{cartLines.length} item</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <ScrollArea className="h-[300px] rounded-[22px] border border-border/70 bg-card/60 p-3">
              {cartLines.length > 0 ? (
                <div className="space-y-3">
                  {cartLines.map((line) => (
                    <div
                      key={line.product.id}
                      className="rounded-[20px] border border-border/70 bg-card/85 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{line.product.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(line.product.sellPrice)} per item
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(line.product.id)}
                          className="rounded-full p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                          aria-label={`Hapus ${line.product.name}`}
                        >
                          <X className="size-4" />
                        </button>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <div className="inline-flex items-center gap-2 rounded-full bg-muted px-2 py-1">
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            className="rounded-full"
                            onClick={() => updateCartQuantity(line.product.id, line.quantity - 1)}
                          >
                            <Minus className="size-4" />
                          </Button>
                          <span className="min-w-6 text-center text-sm font-semibold">{line.quantity}</span>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            className="rounded-full"
                            onClick={() => updateCartQuantity(line.product.id, line.quantity + 1)}
                          >
                            <Plus className="size-4" />
                          </Button>
                        </div>
                        <p className="font-semibold">{formatCurrency(line.lineTotal)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-full min-h-[240px] flex-col items-center justify-center text-center">
                  <ReceiptText className="size-10 text-muted-foreground" />
                  <p className="mt-4 font-heading text-xl font-semibold">Belum ada item</p>
                  <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                    Tap produk dari sisi kiri untuk mulai membuat transaksi baru.
                  </p>
                </div>
              )}
            </ScrollArea>

            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Metode pembayaran</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {settings.enabledPayments.map((method) => (
                  <Button
                    key={method}
                    type="button"
                    variant={paymentMethod === method ? "default" : "outline"}
                    className={cn(
                      "h-12 rounded-2xl",
                      paymentMethod === method && "shadow-[0_20px_40px_-22px_rgba(186,92,35,0.75)]"
                    )}
                    onClick={() => setPaymentMethod(method)}
                  >
                    {method === "Tunai" ? <BanknoteArrowDown className="size-4" /> : <CreditCard className="size-4" />}
                    {paymentLabels[method]}
                  </Button>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] bg-foreground px-4 py-4 text-background">
              <div className="flex items-center justify-between text-sm text-background/70">
                <span>Total tagihan</span>
                <span>{cartLines.reduce((sum, line) => sum + line.quantity, 0)} pcs</span>
              </div>
              <p className="mt-3 font-heading text-4xl font-semibold tracking-tight">
                {formatCurrency(cartTotal)}
              </p>
              <Button
                type="button"
                size="lg"
                className="mt-4 h-13 w-full rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => void handleCheckout()}
              >
                Selesaikan transaksi
              </Button>
              <p className="mt-3 text-sm text-background/70">
                Checkout akan mengurangi stok dan menyimpan transaksi ke laporan.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
