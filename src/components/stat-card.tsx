import { ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  description: string;
  tone?: "default" | "accent" | "warn";
}

export function StatCard({
  title,
  value,
  description,
  tone = "default",
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "border-border/60 shadow-[0_20px_60px_-36px_rgba(65,35,18,0.45)]",
        tone === "accent" && "bg-accent text-accent-foreground",
        tone === "warn" && "bg-primary text-primary-foreground"
      )}
    >
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium opacity-80">{title}</p>
          <ArrowUpRight className="size-4 opacity-70" />
        </div>
        <p className="font-heading text-3xl font-semibold tracking-tight">{value}</p>
        <p className="text-sm opacity-75">{description}</p>
      </CardContent>
    </Card>
  );
}
