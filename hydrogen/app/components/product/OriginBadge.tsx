import { cn } from "@/lib/utils";
import { ORIGIN_LABELS } from "@/lib/shopify";

interface OriginBadgeProps {
  origin: string | null;
  className?: string;
}

export function OriginBadge({ origin, className }: OriginBadgeProps) {
  if (!origin) return null;
  const label = ORIGIN_LABELS[origin]?.label ?? origin;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-charcoal/85 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-off-white backdrop-blur",
        className
      )}
    >
      {label}
    </span>
  );
}
