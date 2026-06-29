import { cn } from "@/lib/utils";

interface OriginBadgeProps {
  origin: string | null;
  className?: string;
}

const FLAGS: Record<string, string> = {
  AUS: "🇦🇺",
  NZ: "🇳🇿",
  ARG: "🇦🇷",
  BRZ: "🇧🇷",
  ZA: "🇿🇦",
  PAK: "🇵🇰",
  JP: "🇯🇵",
  USA: "🇺🇸",
  NL: "🇳🇱",
  "GRASS-FED": "🌱",
};

export function OriginBadge({ origin, className }: OriginBadgeProps) {
  if (!origin) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-charcoal/85 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-off-white backdrop-blur",
        className
      )}
    >
      <span aria-hidden>{FLAGS[origin] ?? "🌍"}</span>
      {origin}
    </span>
  );
}
