import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { fieldMap, str, bool, listNodes, type RawNode } from "./fields";

interface Row {
  id: string;
  mlsLabel: string;
  themLabel: string;
  mlsHas: boolean;
  themHas: boolean;
}

// "MLS vs THEM" — improved split-panel comparison. Two elevated columns (MLS crimson-accent /
// THEM muted), a central VS badge, and check/cross icons that stagger-fade in on scroll.
export function MlsComparison({ node }: { node: RawNode }) {
  const fm = fieldMap(node);
  const heading = str(fm, "heading");
  const usLabel = str(fm, "us_label") ?? "MLS";
  const themLabel = str(fm, "them_label") ?? "THEM";
  const rows: Row[] = listNodes(fm, "rows").map((n) => {
    const f = fieldMap(n);
    const mls = str(f, "mls_label") ?? "";
    return {
      id: n.id ?? n.handle ?? mls,
      mlsLabel: mls,
      themLabel: str(f, "them_label") || mls,
      mlsHas: bool(f, "mls_has"),
      themHas: bool(f, "them_has"),
    };
  });

  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } },
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (rows.length === 0) return null;

  return (
    <section className="py-10 md:py-16">
      <style dangerouslySetInnerHTML={{ __html: `@keyframes cmp-in{from{opacity:0;transform:translateY(10px) scale(.9)}to{opacity:1;transform:translateY(0) scale(1)}}` }} />
      <div className="container mx-auto px-4">
        {heading && (
          <h2 className="mb-8 text-center font-display text-2xl font-bold tracking-tight md:mb-12 md:text-3xl">
            {heading}
          </h2>
        )}

        <div ref={ref} className="relative mx-auto grid max-w-4xl grid-cols-2 gap-3 md:gap-6">
          {/* Center VS badge */}
          <div className="pointer-events-none absolute left-1/2 top-8 z-10 -translate-x-1/2 md:top-10">
            <span className="grid h-11 w-11 place-items-center rounded-full border-4 border-background bg-crimson text-xs font-black uppercase tracking-wide !text-white shadow-lg md:h-14 md:w-14 md:text-sm">
              VS
            </span>
          </div>

          {/* MLS column */}
          <div className="overflow-hidden rounded-2xl border-2 border-crimson/30 bg-card shadow-[var(--shadow-card)]">
            <div className="bg-crimson py-4 text-center font-display text-lg font-black uppercase tracking-wide !text-white md:py-5 md:text-2xl">
              {usLabel}
            </div>
            <ul className="divide-y divide-border">
              {rows.map((r, i) => (
                <li
                  key={r.id}
                  className="flex items-center gap-2 px-3 py-3.5 md:gap-3 md:px-5 md:py-4"
                >
                  <span
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full md:h-7 md:w-7 ${r.mlsHas ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}
                    style={shown ? { animation: `cmp-in .4s ease-out ${i * 0.08}s both` } : { opacity: 0 }}
                  >
                    {r.mlsHas ? <Check className="h-4 w-4" strokeWidth={3} /> : <X className="h-4 w-4" strokeWidth={3} />}
                  </span>
                  <span className="text-left text-[13px] font-semibold leading-tight text-foreground md:text-base">
                    {r.mlsLabel}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* THEM column */}
          <div className="overflow-hidden rounded-2xl border-2 border-border bg-muted/40">
            <div className="bg-charcoal/80 py-4 text-center font-display text-lg font-black uppercase tracking-wide !text-white md:py-5 md:text-2xl">
              {themLabel}
            </div>
            <ul className="divide-y divide-border">
              {rows.map((r, i) => (
                <li
                  key={r.id}
                  className="flex items-center gap-2 px-3 py-3.5 md:gap-3 md:px-5 md:py-4"
                >
                  <span
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full md:h-7 md:w-7 ${r.themHas ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}
                    style={shown ? { animation: `cmp-in .4s ease-out ${i * 0.08 + 0.15}s both` } : { opacity: 0 }}
                  >
                    {r.themHas ? <Check className="h-4 w-4" strokeWidth={3} /> : <X className="h-4 w-4" strokeWidth={3} />}
                  </span>
                  <span className="text-left text-[13px] font-medium leading-tight text-muted-foreground md:text-base">
                    {r.themLabel}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
