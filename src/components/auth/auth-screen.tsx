"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { KeyRound, ShieldCheck, Store } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

type AuthMode = "signin" | "signup";

export function AuthScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending: isSessionPending } = useSession();
  const queryMode = searchParams.get("mode") === "signup" ? "signup" : "signin";
  const authError = searchParams.get("error");
  const [mode, setMode] = useState<AuthMode>(queryMode);
  const [signInForm, setSignInForm] = useState({
    email: "",
    password: "",
  });
  const [signUpForm, setSignUpForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  useEffect(() => {
    if (!isSessionPending && session) {
      router.replace("/dashboard");
    }
  }, [isSessionPending, router, session]);

  useEffect(() => {
    setMode(queryMode);
  }, [queryMode]);

  return (
    <div className="relative min-h-screen bg-background px-4 py-6 lg:px-6">
      <div className="absolute top-4 right-4 z-10 lg:top-6 lg:right-6">
        <ThemeToggle variant="default" className="bg-card/85 shadow-sm backdrop-blur" />
      </div>
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-[1440px] gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <Card className="relative overflow-hidden border-white/60 bg-[linear-gradient(145deg,rgba(58,34,24,0.98),rgba(103,59,34,0.96))] text-white shadow-[0_32px_90px_-50px_rgba(56,31,19,0.88)]">
          <CardContent className="flex h-full flex-col justify-between gap-10 p-8 lg:p-10">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-white/12">
                  <Store className="size-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-white/70">Warung OS</p>
                  <p className="mt-1 text-sm text-white/80">Masuk untuk sinkronisasi warung kamu</p>
                </div>
              </div>

              <h1 className="mt-8 max-w-xl font-heading text-4xl font-semibold tracking-tight lg:text-5xl">
                Pembukuan, kasir, stok, dan kasbon dalam satu aplikasi warung.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-white/72">
                Better Auth sekarang terhubung ke frontend, jadi akun yang kamu buat akan langsung
                membawa workspace warung sendiri di backend.
              </p>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[24px] border border-white/10 bg-white/6 p-5">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="size-5 text-[#ffbd7b]" />
                  <p className="font-medium">Session aman dan konsisten</p>
                </div>
                <p className="mt-3 text-sm leading-6 text-white/72">
                  Login dan logout sekarang langsung memakai Better Auth client dan route auth di backend.
                </p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/6 p-5">
                <div className="flex items-center gap-3">
                  <KeyRound className="size-5 text-[#ffbd7b]" />
                  <p className="font-medium">Data langsung tersambung ke API</p>
                </div>
                <p className="mt-3 text-sm leading-6 text-white/72">
                  Setelah login, bootstrap state frontend otomatis memuat workspace user dari API yang sama.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/85 shadow-[0_28px_70px_-45px_rgba(66,38,20,0.55)]">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-3xl">Akses akun</CardTitle>
            <CardDescription>
              Masuk untuk membuka workspace warung sendiri, atau buat akun baru untuk mulai mencatat transaksi.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="inline-flex rounded-full bg-muted p-1">
              <button
                type="button"
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  mode === "signin"
                    ? "bg-card text-foreground shadow-sm ring-1 ring-border/70"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setMode("signin")}
              >
                Masuk
              </button>
              <button
                type="button"
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  mode === "signup"
                    ? "bg-card text-foreground shadow-sm ring-1 ring-border/70"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setMode("signup")}
              >
                Daftar
              </button>
            </div>

            {authError ? (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {authError}
              </div>
            ) : null}

            {mode === "signin" ? (
              <>
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    name="email"
                    form="signin-form"
                    type="email"
                    value={signInForm.email}
                    onChange={(event) =>
                      setSignInForm((current) => ({ ...current, email: event.target.value }))
                    }
                    autoComplete="email"
                    className="h-12 rounded-2xl bg-card/80"
                    placeholder="warung@email.com"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="signin-password">Kata sandi</Label>
                  <Input
                    id="signin-password"
                    name="password"
                    form="signin-form"
                    type="password"
                    value={signInForm.password}
                    onChange={(event) =>
                      setSignInForm((current) => ({ ...current, password: event.target.value }))
                    }
                    autoComplete="current-password"
                    className="h-12 rounded-2xl bg-card/80"
                    placeholder="Minimal 8 karakter"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  form="signin-form"
                  size="lg"
                  className="h-12 w-full rounded-2xl"
                >
                  Masuk ke dashboard
                </Button>
              </div>
              <form id="signin-form" action="/api/session/sign-in" method="post">
                <input type="hidden" name="callbackURL" value="/dashboard" />
              </form>
              </>
            ) : (
              <>
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="signup-name">Nama pemilik</Label>
                  <Input
                    id="signup-name"
                    name="name"
                    form="signup-form"
                    value={signUpForm.name}
                    onChange={(event) =>
                      setSignUpForm((current) => ({ ...current, name: event.target.value }))
                    }
                    autoComplete="name"
                    className="h-12 rounded-2xl bg-card/80"
                    placeholder="Ibu Sari"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    name="email"
                    form="signup-form"
                    type="email"
                    value={signUpForm.email}
                    onChange={(event) =>
                      setSignUpForm((current) => ({ ...current, email: event.target.value }))
                    }
                    autoComplete="email"
                    className="h-12 rounded-2xl bg-card/80"
                    placeholder="warung@email.com"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="signup-password">Kata sandi</Label>
                  <Input
                    id="signup-password"
                    name="password"
                    form="signup-form"
                    type="password"
                    value={signUpForm.password}
                    onChange={(event) =>
                      setSignUpForm((current) => ({ ...current, password: event.target.value }))
                    }
                    autoComplete="new-password"
                    className="h-12 rounded-2xl bg-card/80"
                    placeholder="Minimal 8 karakter"
                    minLength={8}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  form="signup-form"
                  size="lg"
                  className="h-12 w-full rounded-2xl"
                >
                  Buat akun baru
                </Button>
              </div>
              <form id="signup-form" action="/api/session/sign-up" method="post">
                <input type="hidden" name="callbackURL" value="/dashboard" />
              </form>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
