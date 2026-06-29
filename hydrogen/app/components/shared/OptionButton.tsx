import { cn } from "@/lib/utils";

interface OptionButtonProps {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
}

/**
 * Pill-style selector used for product variant options, subscription frequencies, etc.
 * Active state uses the crimson brand colour; disabled shows strikethrough + muted opacity.
 */
export function OptionButton({ label, active, disabled = false, onClick, className }: OptionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-crimson bg-crimson text-white"
          : "border-border bg-card text-foreground hover:border-crimson",
        disabled && "cursor-not-allowed opacity-40 line-through hover:border-border",
        className,
      )}
    >
      {label}
    </button>
  );
}
