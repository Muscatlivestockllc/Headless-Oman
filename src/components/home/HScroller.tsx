import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface HScrollerProps {
  children: ReactNode;
  className?: string;
  itemClassName?: string;
  /** Hide the soft edge fades (use when section bg already provides contrast) */
  noFade?: boolean;
}

/**
 * Modern horizontal scroller: snap, hidden scrollbar, floating arrows,
 * edge gradient fades. RTL-aware via document direction.
 */
export function HScroller({ children, className, noFade }: HScrollerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    // Use abs to handle RTL where scrollLeft can be negative
    const left = Math.abs(el.scrollLeft);
    setCanPrev(left > 4);
    setCanNext(left < max - 4);
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [update]);

  const scrollBy = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const isRtl =
      typeof document !== "undefined" &&
      document.documentElement.dir === "rtl";
    const sign = isRtl ? -1 : 1;
    el.scrollBy({ left: sign * dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  return (
    <div className={cn("group/scroller relative", className)}>
      <div
        ref={ref}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-2 sm:gap-4 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
      >
        {children}
      </div>

      {!noFade && (
        <>
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-y-0 start-0 w-10 bg-gradient-to-e from-background to-transparent transition-opacity",
              canPrev ? "opacity-100" : "opacity-0"
            )}
            style={{
              backgroundImage:
                "linear-gradient(to var(--tw-gradient-direction, right), var(--color-background), transparent)",
            }}
          />
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-y-0 end-0 w-10 transition-opacity",
              canNext ? "opacity-100" : "opacity-0"
            )}
            style={{
              backgroundImage:
                "linear-gradient(to var(--tw-gradient-direction, left), var(--color-background), transparent)",
            }}
          />
        </>
      )}

      <button
        type="button"
        aria-label="Scroll previous"
        onClick={() => scrollBy(-1)}
        disabled={!canPrev}
        className={cn(
          "absolute start-1 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-border bg-background/95 text-foreground shadow-md backdrop-blur transition-all",
          "hover:bg-crimson hover:text-crimson-foreground",
          canPrev
            ? "opacity-100 sm:opacity-0 sm:group-hover/scroller:opacity-100"
            : "pointer-events-none opacity-0"
        )}
      >
        <ChevronLeft className="h-5 w-5 rtl:hidden" />
        <ChevronRight className="hidden h-5 w-5 rtl:block" />
      </button>
      <button
        type="button"
        aria-label="Scroll next"
        onClick={() => scrollBy(1)}
        disabled={!canNext}
        className={cn(
          "absolute end-1 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-border bg-background/95 text-foreground shadow-md backdrop-blur transition-all",
          "hover:bg-crimson hover:text-crimson-foreground",
          canNext
            ? "opacity-100 sm:opacity-0 sm:group-hover/scroller:opacity-100"
            : "pointer-events-none opacity-0"
        )}
      >
        <ChevronRight className="h-5 w-5 rtl:hidden" />
        <ChevronLeft className="hidden h-5 w-5 rtl:block" />
      </button>
    </div>
  );
}
