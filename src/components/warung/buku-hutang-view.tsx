"use client";

import { useState } from "react";
import { CheckCircle2, MessageSquareShare, Search, WalletCards } from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { DebtDraft } from "@/lib/types";

const emptyDraft: DebtDraft = {
  borrowerName: "",
  whatsapp: "",
  amount: 0,
  dueDate: new Date().toISOString().slice(0, 10),
};

export function BukuHutangView() {
  const { debts, addDebt, markDebtPaid, sendDebtReminder } = useAppState();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"semua" | "belum" | "lunas">("semua");
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState<DebtDraft>(emptyDraft);

  const filteredDebts = debts.filter((debt) => {
    const keyword = query.toLowerCase();
    const matchesKeyword =
      debt.borrowerName.toLowerCase().includes(keyword) ||
      debt.whatsapp.includes(keyword);
    const matchesStatus =
      status === "semua" ||
      (status === "belum" && !debt.isPaid) ||
      (status === "lunas" && debt.isPaid);
    return matchesKeyword && matchesStatus;
  });

  const outstandingTotal = debts
    .filter((debt) => !debt.isPaid)
    .reduce((sum, debt) => sum + debt.amount, 0);
  const paidCount = debts.filter((debt) => debt.isPaid).length;
  const reminderCount = debts.filter((debt) => debt.lastReminderAt).length;

  async function handleCreateDebt() {
    try {
      if (
        draft.borrowerName.trim().length === 0 ||
        draft.whatsapp.trim().length < 10 ||
        draft.amount <= 0
      ) {
        toast.error("Lengkapi nama, nomor WA, dan nominal hutang.");
        return;
      }

      await addDebt(draft);
      setCreateOpen(false);
      setDraft(emptyDraft);
      toast.success("Kasbon berhasil disimpan.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan kasbon.");
    }
  }

  return (
    <div className="space-y-4">
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Kasbon aktif"
          value={formatCurrency(outstandingTotal)}
          description="Total piutang yang masih perlu ditagih."
        />
        <StatCard
          title="Sudah lunas"
          value={`${paidCount} pelanggan`}
          description="Pelanggan yang sudah menyelesaikan pembayaran."
          tone="accent"
        />
        <StatCard
          title="Pengingat terkirim"
          value={`${reminderCount} kali`}
          description="Simulasi notifikasi WA yang sudah dipicu dari frontend."
          tone="warn"
        />
      </section>

      <Card className="border-border/60 bg-card/74 shadow-[0_28px_70px_-45px_rgba(66,38,20,0.55)]">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="font-heading text-2xl">Buku hutang pelanggan</CardTitle>
            <CardDescription>
              Rapi untuk warung, gampang dilihat lagi saat butuh menagih atau memeriksa langganan.
            </CardDescription>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative min-w-[220px]">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari nama atau no. WhatsApp"
                className="h-11 rounded-2xl bg-card/85 pl-9"
              />
            </div>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger
                render={<Button size="lg" className="h-11 rounded-2xl" />}
              >
                <WalletCards className="size-4" />
                Tambah kasbon
              </DialogTrigger>
              <DialogContent className="max-w-xl rounded-[28px] p-0">
                <DialogHeader className="p-6 pb-0">
                  <DialogTitle className="font-heading text-2xl">Catat hutang baru</DialogTitle>
                  <DialogDescription>
                    Simpan nama pelanggan, nomor WhatsApp, nominal, dan tanggal jatuh tempo.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 p-6 pt-4">
                  <div className="grid gap-2">
                    <Label htmlFor="borrower-name">Nama peminjam</Label>
                    <Input
                      id="borrower-name"
                      value={draft.borrowerName}
                      onChange={(event) => setDraft({ ...draft, borrowerName: event.target.value })}
                      className="h-11 rounded-2xl"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="borrower-wa">Nomor WhatsApp</Label>
                    <Input
                      id="borrower-wa"
                      value={draft.whatsapp}
                      onChange={(event) => setDraft({ ...draft, whatsapp: event.target.value })}
                      placeholder="08xxxxxxxxxx"
                      className="h-11 rounded-2xl"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="borrower-amount">Nominal hutang</Label>
                      <Input
                        id="borrower-amount"
                        type="number"
                        min={0}
                        value={draft.amount}
                        onChange={(event) => setDraft({ ...draft, amount: Number(event.target.value) })}
                        className="h-11 rounded-2xl"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="borrower-due-date">Jatuh tempo</Label>
                      <Input
                        id="borrower-due-date"
                        type="date"
                        value={draft.dueDate}
                        onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })}
                        className="h-11 rounded-2xl"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter className="rounded-b-[28px]" showCloseButton>
                  <Button type="button" onClick={() => void handleCreateDebt()}>
                    Simpan kasbon
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <Tabs value={status} onValueChange={(value) => setStatus(value as typeof status)}>
            <TabsList className="rounded-full p-1">
              <TabsTrigger value="semua" className="rounded-full px-4">
                Semua
              </TabsTrigger>
              <TabsTrigger value="belum" className="rounded-full px-4">
                Belum lunas
              </TabsTrigger>
              <TabsTrigger value="lunas" className="rounded-full px-4">
                Lunas
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid gap-4 lg:grid-cols-2">
            {filteredDebts.map((debt) => (
              <Card key={debt.id} className="rounded-[26px] border border-border/70 bg-card/78">
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-heading text-xl font-semibold">{debt.borrowerName}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{debt.whatsapp}</p>
                    </div>
                    <Badge
                      className={
                        debt.isPaid
                          ? "rounded-full bg-accent text-accent-foreground"
                          : "rounded-full bg-primary text-primary-foreground"
                      }
                    >
                      {debt.isPaid ? "Lunas" : "Belum lunas"}
                    </Badge>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[20px] bg-muted/55 p-4">
                      <p className="text-sm text-muted-foreground">Nominal</p>
                      <p className="mt-2 text-xl font-semibold">{formatCurrency(debt.amount)}</p>
                    </div>
                    <div className="rounded-[20px] bg-muted/55 p-4">
                      <p className="text-sm text-muted-foreground">Jatuh tempo</p>
                      <p className="mt-2 text-xl font-semibold">{formatDate(debt.dueDate)}</p>
                    </div>
                  </div>

                  <div className="rounded-[20px] border border-border/70 bg-card/75 p-4 text-sm text-muted-foreground">
                    <p>Dicatat: {formatDateTime(debt.createdAt)}</p>
                    <p className="mt-1">
                      Pengingat terakhir:{" "}
                      {debt.lastReminderAt ? formatDateTime(debt.lastReminderAt) : "Belum pernah dikirim"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full"
                      onClick={async () => {
                        try {
                          const reminded = await sendDebtReminder(debt.id);
                          if (reminded) {
                            toast.success("Simulasi pengingat WhatsApp terkirim.", {
                              description: `Pesan sopan untuk ${reminded.borrowerName} dipicu dari frontend.`,
                            });
                          }
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : "Gagal mengirim pengingat.");
                        }
                      }}
                    >
                      <MessageSquareShare className="size-4" />
                      Kirim pengingat
                    </Button>
                    {!debt.isPaid ? (
                      <Button
                        type="button"
                        className="rounded-full"
                        onClick={async () => {
                          try {
                            await markDebtPaid(debt.id);
                            toast.success(`${debt.borrowerName} ditandai lunas.`);
                          } catch (error) {
                            toast.error(error instanceof Error ? error.message : "Gagal memperbarui status hutang.");
                          }
                        }}
                      >
                        <CheckCircle2 className="size-4" />
                        Tandai lunas
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
