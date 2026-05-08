"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

type Mode = "light" | "dark" | "system";
type Variant = "sidebar" | "default";

const options: { value: Mode; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Terang", icon: Sun },
  { value: "dark", label: "Gelap", icon: Moon },
  { value: "system", label: "Sistem", icon: Monitor },
];

const styles: Record<Variant, { container: string; active: string; inactive: string }> = {
  sidebar: {
    container: "border-sidebar-border/60 bg-sidebar-accent/40",
    active: "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm",
    inactive:
      "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
  },
  default: {
    container: "border-border/60 bg-muted/60",
    active: "bg-primary text-primary-foreground shadow-sm",
    inactive: "text-muted-foreground hover:bg-card hover:text-foreground",
  },
};

export function ThemeToggle({
  className,
  variant = "sidebar",
}: {
  className?: string;
  variant?: Variant;
}) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const active = (mounted ? theme : undefined) as Mode | undefined;
  const tokens = styles[variant];

  return (
    <div
      role="radiogroup"
      aria-label="Mode tampilan"
      className={cn(
        "inline-flex items-center gap-1 rounded-2xl border p-1",
        tokens.container,
        className,
      )}
    >
      {options.map((option) => {
        const Icon = option.icon;
        const isActive = active === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={option.label}
            title={option.label}
            onClick={() => setTheme(option.value)}
            className={cn(
              "flex size-8 items-center justify-center rounded-xl transition-colors",
              isActive ? tokens.active : tokens.inactive,
            )}
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}
