"use client";

import { useState } from "react";
import { AlertTriangle, PackagePlus, PencilLine, Search, Warehouse } from "lucide-react";
import { toast } from "sonner";
import { useAppState } from "@/components/providers/app-state-provider";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import { Product, ProductCategory, ProductDraft } from "@/lib/types";
import { cn } from "@/lib/utils";

const emptyDraft: ProductDraft = {
  name: "",
  category: "Makanan",
  buyPrice: 0,
  sellPrice: 0,
  stock: 0,
  minimumStock: 0,
  description: "",
};

function ProductForm({
  draft,
  onChange,
}: {
  draft: ProductDraft;
  onChange: (draft: ProductDraft) => void;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="product-name">Nama barang</Label>
        <Input
          id="product-name"
          value={draft.name}
          onChange={(event) => onChange({ ...draft, name: event.target.value })}
          placeholder="Contoh: Mi Instan Goreng"
          className="h-11 rounded-2xl"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label>Kategori</Label>
          <Select
            value={draft.category}
            onValueChange={(value) => onChange({ ...draft, category: value as ProductCategory })}
          >
            <SelectTrigger className="h-11 w-full rounded-2xl bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Makanan">Makanan</SelectItem>
              <SelectItem value="Minuman">Minuman</SelectItem>
              <SelectItem value="Sembako">Sembako</SelectItem>
              <SelectItem value="Kebutuhan Harian">Kebutuhan Harian</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="product-stock">Stok awal</Label>
          <Input
            id="product-stock"
            type="number"
            min={0}
            value={draft.stock}
            onChange={(event) => onChange({ ...draft, stock: Number(event.target.value) })}
            className="h-11 rounded-2xl"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="product-buy-price">Harga beli</Label>
          <Input
            id="product-buy-price"
            type="number"
            min={0}
            value={draft.buyPrice}
            onChange={(event) => onChange({ ...draft, buyPrice: Number(event.target.value) })}
            className="h-11 rounded-2xl"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="product-sell-price">Harga jual</Label>
          <Input
            id="product-sell-price"
            type="number"
            min={0}
            value={draft.sellPrice}
            onChange={(event) => onChange({ ...draft, sellPrice: Number(event.target.value) })}
            className="h-11 rounded-2xl"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="product-minimum-stock">Stok minimum</Label>
        <Input
          id="product-minimum-stock"
          type="number"
          min={0}
          value={draft.minimumStock}
          onChange={(event) => onChange({ ...draft, minimumStock: Number(event.target.value) })}
          className="h-11 rounded-2xl"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="product-description">Catatan singkat</Label>
        <Input
          id="product-description"
          value={draft.description}
          onChange={(event) => onChange({ ...draft, description: event.target.value })}
          placeholder="Penempatan rak, paket laris, atau info kasir"
          className="h-11 rounded-2xl"
        />
      </div>
    </div>
  );
}

export function InventarisView() {
  const { products, addProduct, updateProduct, restockProduct, lowStockProducts } = useAppState();
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState<ProductDraft>(emptyDraft);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editDraft, setEditDraft] = useState<ProductDraft>(emptyDraft);
  const [restockTarget, setRestockTarget] = useState<Product | null>(null);
  const [restockAmount, setRestockAmount] = useState(12);

  const filteredProducts = products.filter((product) => {
    const keyword = query.toLowerCase();
    return (
      product.name.toLowerCase().includes(keyword) ||
      product.category.toLowerCase().includes(keyword) ||
      product.description.toLowerCase().includes(keyword)
    );
  });

  const totalInventoryValue = products.reduce(
    (sum, product) => sum + product.buyPrice * product.stock,
    0
  );

  function validateProduct(nextDraft: ProductDraft) {
    return (
      nextDraft.name.trim().length > 0 &&
      nextDraft.sellPrice > 0 &&
      nextDraft.buyPrice >= 0 &&
      nextDraft.stock >= 0 &&
      nextDraft.minimumStock >= 0
    );
  }

  async function handleCreateProduct() {
    try {
      if (!validateProduct(draft)) {
        toast.error("Lengkapi data produk lebih dulu.");
        return;
      }

      await addProduct(draft);
      setDraft(emptyDraft);
      setCreateOpen(false);
      toast.success("Produk baru berhasil ditambahkan.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menambah produk.");
    }
  }

  async function handleUpdateProduct() {
    try {
      if (!editingProduct || !validateProduct(editDraft)) {
        toast.error("Periksa kembali data yang ingin diperbarui.");
        return;
      }

      await updateProduct(editingProduct.id, editDraft);
      setEditingProduct(null);
      toast.success(`${editDraft.name} berhasil diperbarui.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memperbarui produk.");
    }
  }

  async function handleRestock() {
    try {
      if (!restockTarget || restockAmount <= 0) {
        toast.error("Masukkan jumlah restok yang valid.");
        return;
      }

      await restockProduct(restockTarget.id, restockAmount);
      toast.success(`${restockTarget.name} ditambah ${restockAmount} stok.`);
      setRestockTarget(null);
      setRestockAmount(12);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menambah stok.");
    }
  }

  return (
    <div className="space-y-4">
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Total SKU"
          value={`${products.length} produk`}
          description="Produk siap jual yang sedang aktif di warung."
        />
        <StatCard
          title="Stok menipis"
          value={`${lowStockProducts.length} item`}
          description="Pantau dan restok sebelum pelanggan kehabisan pilihan."
          tone="warn"
        />
        <StatCard
          title="Nilai stok"
          value={formatCurrency(totalInventoryValue)}
          description="Perkiraan modal yang sedang tersimpan di inventaris."
          tone="accent"
        />
      </section>

      <Card className="border-border/60 bg-card/74 shadow-[0_28px_70px_-45px_rgba(66,38,20,0.55)]">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="font-heading text-2xl">Inventaris barang jadi</CardTitle>
            <CardDescription>
              Semua perubahan di layar ini langsung mengubah state mock yang dipakai POS dan laporan.
            </CardDescription>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative min-w-[260px]">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari nama, kategori, atau catatan"
                className="h-11 rounded-2xl bg-card/85 pl-9"
              />
            </div>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger
                render={<Button size="lg" className="h-11 rounded-2xl" />}
              >
                <PackagePlus className="size-4" />
                Tambah barang
              </DialogTrigger>
              <DialogContent className="max-w-2xl rounded-[28px] p-0">
                <DialogHeader className="p-6 pb-0">
                  <DialogTitle className="font-heading text-2xl">Tambah produk baru</DialogTitle>
                  <DialogDescription>
                    Isi data minimum supaya kasir bisa langsung menjual barang ini.
                  </DialogDescription>
                </DialogHeader>
                <div className="p-6 pt-4">
                  <ProductForm draft={draft} onChange={setDraft} />
                </div>
                <DialogFooter className="rounded-b-[28px]" showCloseButton>
                  <Button type="button" onClick={() => void handleCreateProduct()}>
                    Simpan produk
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow>
                <TableHead>Produk</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Harga beli</TableHead>
                <TableHead>Harga jual</TableHead>
                <TableHead>Stok</TableHead>
                <TableHead>Minimum</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => {
                const lowStock = product.stock <= product.minimumStock;

                return (
                  <TableRow key={product.id} className={cn(lowStock && "bg-primary/6")}>
                    <TableCell className="min-w-[220px]">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{product.description}</p>
                      </div>
                    </TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell>{formatCurrency(product.buyPrice)}</TableCell>
                    <TableCell>{formatCurrency(product.sellPrice)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={cn(
                            "rounded-full border-0",
                            lowStock ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"
                          )}
                        >
                          {product.stock} pcs
                        </Badge>
                        {lowStock ? <AlertTriangle className="size-4 text-primary" /> : null}
                      </div>
                    </TableCell>
                    <TableCell>{product.minimumStock} pcs</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-full"
                          onClick={() => {
                            setEditingProduct(product);
                            setEditDraft({
                              name: product.name,
                              category: product.category,
                              buyPrice: product.buyPrice,
                              sellPrice: product.sellPrice,
                              stock: product.stock,
                              minimumStock: product.minimumStock,
                              description: product.description,
                            });
                          }}
                        >
                          <PencilLine className="size-4" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          className="rounded-full"
                          onClick={() => setRestockTarget(product)}
                        >
                          <Warehouse className="size-4" />
                          Restok
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={Boolean(editingProduct)} onOpenChange={(open) => !open && setEditingProduct(null)}>
        <DialogContent className="max-w-2xl rounded-[28px] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="font-heading text-2xl">Edit produk</DialogTitle>
            <DialogDescription>Perbarui stok, harga, atau posisi minimum sebelum notifikasi muncul.</DialogDescription>
          </DialogHeader>
          <div className="p-6 pt-4">
            <ProductForm draft={editDraft} onChange={setEditDraft} />
          </div>
          <DialogFooter className="rounded-b-[28px]" showCloseButton>
            <Button type="button" onClick={() => void handleUpdateProduct()}>
              Simpan perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(restockTarget)} onOpenChange={(open) => !open && setRestockTarget(null)}>
        <DialogContent className="max-w-md rounded-[28px] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="font-heading text-2xl">Restok barang</DialogTitle>
            <DialogDescription>
              Tambahkan stok untuk {restockTarget?.name ?? "produk terpilih"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 p-6 pt-4">
            <div className="rounded-[22px] border border-border/70 bg-card/75 p-4">
              <p className="text-sm text-muted-foreground">Stok sekarang</p>
              <p className="mt-2 font-heading text-3xl font-semibold">
                {restockTarget?.stock ?? 0} pcs
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="restock-amount">Jumlah tambahan stok</Label>
              <Input
                id="restock-amount"
                type="number"
                min={1}
                value={restockAmount}
                onChange={(event) => setRestockAmount(Number(event.target.value))}
                className="h-11 rounded-2xl"
              />
            </div>
          </div>
          <DialogFooter className="rounded-b-[28px]" showCloseButton>
            <Button type="button" onClick={() => void handleRestock()}>
              Simpan restok
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
