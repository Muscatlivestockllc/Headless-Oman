import { Minus, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: { btn: "h-7 w-7", icon: "h-3 w-3", input: "w-8 text-xs" },
  md: { btn: "h-9 w-9", icon: "h-4 w-4", input: "w-10 text-sm" },
  lg: { btn: "h-11 w-11", icon: "h-4 w-4", input: "w-8 text-sm" },
};

export function QuantitySelector({
  value,
  onChange,
  min = 1,
  max,
  size = "md",
  className,
}: QuantitySelectorProps) {
  const s = sizeMap[size];
  const [draft, setDraft] = useState(String(value));

  // Keep draft in sync when value changes externally (e.g. after API response)
  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = (raw: string) => {
    const n = parseInt(raw, 10);
    if (!isNaN(n)) {
      const clamped = max !== undefined ? Math.min(max, Math.max(min, n)) : Math.max(min, n);
      onChange(clamped);
      setDraft(String(clamped));
    } else {
      setDraft(String(value));
    }
  };

  return (
    <div className={cn("inline-flex items-center rounded-lg border border-border", className)}>
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className={cn(
          s.btn,
          "grid place-items-center text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40",
        )}
      >
        <Minus className={s.icon} />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className={cn(
          s.input,
          "bg-transparent text-center font-semibold outline-none",
          "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
        )}
        aria-label="Quantity"
      />
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={max !== undefined && value >= max}
        onClick={() => onChange(max !== undefined ? Math.min(max, value + 1) : value + 1)}
        className={cn(
          s.btn,
          "grid place-items-center text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40",
        )}
      >
        <Plus className={s.icon} />
      </button>
    </div>
  );
}
