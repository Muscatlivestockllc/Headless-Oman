import { cn } from "@/lib/utils";

interface StockBadgeProps {
  available: boolean;
  qty?: number | null;
  className?: string;
}

export function StockBadge({ available, qty, className }: StockBadgeProps) {
  if (!available) {
    return (
      <span
        className={cn(
          "inline-flex rounded-sm bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground",
          className
        )}
      >
        Out of stock
      </span>
    );
  }
  const low = qty != null && qty > 0 && qty <= 5;
  return (
    <span
      className={cn(
        "inline-flex rounded-sm px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        low ? "bg-gold/20 text-gold-foreground" : "bg-emerald-600/15 text-emerald-700",
        className
      )}
    >
      {low ? "Low stock" : "In stock"}
    </span>
  );
}
