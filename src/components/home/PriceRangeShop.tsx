import { Link } from "@tanstack/react-router";
import { SectionHeader } from "./FeaturedCollections";

const TILES = [
  { label: "Under AED 40", min: 0, max: 40 },
  { label: "Under AED 50", min: 0, max: 50 },
  { label: "Under AED 100", min: 0, max: 100 },
  { label: "Under AED 150", min: 0, max: 150 },
  { label: "Under AED 300", min: 0, max: 300 },
  { label: "Under AED 500", min: 0, max: 500 },
];

export function PriceRangeShop() {
  return (
    <section className="container mx-auto px-4 py-12">
      <SectionHeader title="Shop by Price" subtitle="Every budget, premium quality" />
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {TILES.map((t) => (
          <Link
            key={t.label}
            to="/collections/$handle"
            params={{ handle: "all" }}
            search={{ maxPrice: t.max } as any}
            className="group relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-md border border-border bg-gradient-to-br from-crimson to-rich-red text-crimson-foreground transition-transform hover:-translate-y-1 hover:shadow-[var(--shadow-elegant)]"
          >
            <div className="font-display text-2xl font-extrabold md:text-3xl">{t.max}</div>
            <div className="text-[10px] uppercase tracking-[0.2em] opacity-90">AED & under</div>
          </Link>
        ))}
      </div>
    </section>
  );
}
