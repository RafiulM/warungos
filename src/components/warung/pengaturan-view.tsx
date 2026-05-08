"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, Bell, MapPin, RotateCcw, Store, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { useAppState } from "@/components/providers/app-state-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/format";
import { PaymentMethod, Settings } from "@/lib/types";
import { cn } from "@/lib/utils";

const paymentMethods: PaymentMethod[] = ["Tunai", "QRIS", "Transfer"];

export function PengaturanView() {
  const { settings, lowStockProducts, resetWorkspace, updateSettings, products } = useAppState();
  const [form, setForm] = useState<Settings>(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const hasUnsavedChanges = JSON.stringify(form) !== JSON.stringify(settings);

  function updateField<Key extends keyof Settings>(field: Key, value: Settings[Key]) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function togglePayment(method: PaymentMethod) {
    const exists = form.enabledPayments.includes(method);
    updateField(
      "enabledPayments",
      exists
        ? form.enabledPayments.filter((item) => item !== method)
        : [...form.enabledPayments, method]
    );
  }

  async function handleSave() {
    try {
      if (
        form.storeName.trim().length === 0 ||
        form.storeAddress.trim().length === 0 ||
        form.ownerName.trim().length === 0 ||
        form.ownerWhatsapp.trim().length < 10 ||
        form.city.trim().length === 0 ||
        form.enabledPayments.length === 0
      ) {
        toast.error(
          "Lengkapi nama warung, alamat, pemilik, WhatsApp, kota, dan pilih minimal satu metode bayar."
        );
        return;
      }

      setIsSaving(true);
      await updateSettings(form);
      toast.success("Profil warung berhasil diperbarui.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan pengaturan.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleWorkspaceReset() {
    try {
      setIsResetting(true);
      await resetWorkspace();
      toast.success("Workspace dikosongkan dan dikembalikan ke kondisi awal.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mereset workspace.");
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
      <Card className="border-border/60 bg-card/74 shadow-[0_28px_70px_-45px_rgba(66,38,20,0.55)]">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="font-heading text-2xl">Profil warung & notifikasi</CardTitle>
              <CardDescription className="mt-1">
                Atur identitas warung yang akan dipakai di dashboard, laporan, dan pengingat operasional.
              </CardDescription>
            </div>
            <div
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium",
                hasUnsavedChanges
                  ? "bg-primary/12 text-primary"
                  : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
              )}
            >
              {hasUnsavedChanges ? "Ada perubahan belum disimpan" : "Profil sudah sinkron"}
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="rounded-[26px] border border-border/70 bg-card/85 p-5">
            <div className="flex items-center gap-2">
              <Store className="size-4 text-primary" />
              <p className="font-medium">Identitas warung</p>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Ubah nama warung, tagline singkat, kota, dan alamat lengkap dari satu tempat.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="store-name">Nama warung</Label>
                <Input
                  id="store-name"
                  value={form.storeName}
                  onChange={(event) => updateField("storeName", event.target.value)}
                  className="h-11 rounded-2xl"
                  placeholder="Contoh: Warung Berkah Bu Rani"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="store-tagline">Tagline / fokus jualan</Label>
                <Input
                  id="store-tagline"
                  value={form.storeTagline}
                  onChange={(event) => updateField("storeTagline", event.target.value)}
                  className="h-11 rounded-2xl"
                  placeholder="Contoh: Sembako, kopi, dan jajanan harian"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="city">Kota / area</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(event) => updateField("city", event.target.value)}
                  className="h-11 rounded-2xl"
                  placeholder="Contoh: Depok"
                />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="store-address">Alamat warung</Label>
                <Textarea
                  id="store-address"
                  value={form.storeAddress}
                  onChange={(event) => updateField("storeAddress", event.target.value)}
                  className="min-h-24 rounded-[22px]"
                  placeholder="Contoh: Jl. Mawar No. 8, dekat mushola Al-Ikhlas"
                />
              </div>
            </div>
          </div>

          <div className="rounded-[26px] border border-border/70 bg-card/85 p-5">
            <div className="flex items-center gap-2">
              <MapPin className="size-4 text-primary" />
              <p className="font-medium">Pemilik & catatan bisnis</p>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Data ini berguna untuk reminder WhatsApp, laporan internal, dan catatan operasional warung.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="owner-name">Nama pemilik</Label>
                <Input
                  id="owner-name"
                  value={form.ownerName}
                  onChange={(event) => updateField("ownerName", event.target.value)}
                  className="h-11 rounded-2xl"
                  placeholder="Contoh: Ibu Rani"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="owner-whatsapp">No. WhatsApp pemilik</Label>
                <Input
                  id="owner-whatsapp"
                  value={form.ownerWhatsapp}
                  onChange={(event) => updateField("ownerWhatsapp", event.target.value)}
                  className="h-11 rounded-2xl"
                  placeholder="Contoh: 081234567890"
                />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="business-notes">Catatan bisnis</Label>
                <Textarea
                  id="business-notes"
                  value={form.businessNotes}
                  onChange={(event) => updateField("businessNotes", event.target.value)}
                  className="min-h-28 rounded-[22px]"
                  placeholder="Contoh: Fokus belanja stok tiap Senin pagi, pelanggan ramai setelah magrib."
                />
              </div>
            </div>
          </div>

          <div className="rounded-[26px] border border-border/70 bg-card/85 p-5">
            <div className="flex items-center gap-2">
              <Bell className="size-4 text-primary" />
              <p className="font-medium">Batas notifikasi stok menipis</p>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Produk dengan stok di bawah angka ini akan disorot lebih agresif di kasir dan inventaris.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-[160px_1fr] sm:items-center">
              <Input
                type="number"
                min={1}
                value={form.stockAlertThreshold}
                onChange={(event) => {
                  const nextValue = Number(event.target.value);
                  updateField("stockAlertThreshold", Number.isFinite(nextValue) ? nextValue : 0);
                }}
                className="h-11 rounded-2xl"
              />
              <div className="rounded-[20px] bg-muted/55 px-4 py-3 text-sm text-muted-foreground">
                Saat ini ada {lowStockProducts.length} produk yang berada di area peringatan.
              </div>
            </div>
          </div>

          <div className="rounded-[26px] border border-border/70 bg-card/85 p-5">
            <div className="flex items-center gap-2">
              <WalletCards className="size-4 text-primary" />
              <p className="font-medium">Metode bayar yang ditampilkan</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {paymentMethods.map((method) => {
                const active = form.enabledPayments.includes(method);
                return (
                  <Button
                    key={method}
                    type="button"
                    variant={active ? "default" : "outline"}
                    className={cn(
                      "rounded-full",
                      active && "shadow-[0_20px_40px_-24px_rgba(186,92,35,0.75)]"
                    )}
                    onClick={() => togglePayment(method)}
                  >
                    {method}
                  </Button>
                );
              })}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Daftar ini langsung dipakai untuk opsi pembayaran di kasir utama.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              size="lg"
              className="rounded-2xl"
              onClick={() => void handleSave()}
              disabled={isSaving}
            >
              <BadgeCheck className="size-4" />
              {isSaving ? "Menyimpan..." : "Simpan pengaturan"}
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="rounded-2xl"
              onClick={() => setForm(settings)}
              disabled={!hasUnsavedChanges || isSaving}
            >
              Kembalikan draft
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="rounded-2xl"
              onClick={() => void handleWorkspaceReset()}
              disabled={isResetting}
            >
              <RotateCcw className="size-4" />
              {isResetting ? "Mereset..." : "Reset workspace"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="border-border/60 bg-card/74 shadow-[0_28px_70px_-45px_rgba(66,38,20,0.55)]">
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Preview identitas warung</CardTitle>
            <CardDescription>
              Cek ringkasan yang akan muncul di area operasional dan header laporan setelah disimpan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[24px] bg-foreground px-5 py-5 text-background">
              <div className="flex items-center gap-2">
                <Store className="size-4 text-primary" />
                <p className="text-sm font-medium text-background/75">Warung aktif</p>
              </div>
              <p className="mt-3 font-heading text-3xl font-semibold">{form.storeName || "Nama warung"}</p>
              <p className="mt-2 text-sm text-background/75">
                {form.storeTagline || "Tagline warung akan muncul di sini"}
              </p>
              <div className="mt-4 space-y-2 text-sm text-background/75">
                <p>{form.city || "Kota / area belum diisi"}</p>
                <p>{form.storeAddress || "Alamat warung belum diisi"}</p>
                <p>
                  Pemilik: {form.ownerName || "-"} • {form.ownerWhatsapp || "-"}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[22px] border border-border/70 bg-card/85 p-4">
                <p className="text-sm text-muted-foreground">Produk aktif</p>
                <p className="mt-2 font-heading text-3xl font-semibold">{products.length}</p>
              </div>
              <div className="rounded-[22px] border border-border/70 bg-card/85 p-4">
                <p className="text-sm text-muted-foreground">Batas stok alert</p>
                <p className="mt-2 font-heading text-3xl font-semibold">
                  {form.stockAlertThreshold || 0} pcs
                </p>
              </div>
            </div>

            <div className="rounded-[24px] border border-border/70 bg-card/85 p-5">
              <p className="text-sm text-muted-foreground">Catatan bisnis</p>
              <p className="mt-3 text-sm leading-6 text-foreground/80">
                {form.businessNotes || "Belum ada catatan bisnis. Tambahkan info penting untuk operasional harian."}
              </p>
            </div>

            <div className="rounded-[24px] border border-border/70 bg-card/85 p-5">
              <p className="text-sm text-muted-foreground">Metode pembayaran aktif</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {form.enabledPayments.map((method) => (
                  <span
                    key={method}
                    className="rounded-full bg-primary/12 px-3 py-1 text-sm font-medium text-primary"
                  >
                    {method}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/74 shadow-[0_28px_70px_-45px_rgba(66,38,20,0.55)]">
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Acuan bisnis</CardTitle>
            <CardDescription>Contoh kasar valuasi stok aktif untuk kebutuhan diskusi internal.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-[26px] border border-border/70 bg-card/85 p-5">
              <p className="text-sm text-muted-foreground">Estimasi modal stok berjalan</p>
              <p className="mt-3 font-heading text-4xl font-semibold">
                {formatCurrency(
                  products.reduce((sum, product) => sum + product.buyPrice * product.stock, 0)
                )}
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                Angka ini membantu saat mau membandingkan modal persediaan dengan omzet dari laporan.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
