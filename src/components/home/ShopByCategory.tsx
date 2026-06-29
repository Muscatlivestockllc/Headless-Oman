import { Link } from "@tanstack/react-router";

const CATEGORIES = [
  { label: "Beef", emoji: "🐂", handle: "all-beef" },
  { label: "Lamb", emoji: "🐑", handle: "all-lamb" },
  { label: "Mutton", emoji: "🍖", handle: "all-mutton" },
  { label: "Wagyu", emoji: "🥩", handle: "australian-wagyu-beef-mb-4-5" },
  { label: "Veal", emoji: "🐄", handle: "all" },
  { label: "Ostrich", emoji: "🦃", handle: "all" },
  { label: "Poultry", emoji: "🍗", handle: "all" },
  { label: "Sausages", emoji: "🌭", handle: "all" },
];

export function ShopByCategory() {
  return (
    <section className="bg-bone py-12">
      <div className="container mx-auto px-4">
        <div className="mb-6 text-center">
          <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-crimson">
            Browse the butcher
          </div>
          <h2 className="font-display text-2xl font-extrabold md:text-3xl">
            Shop by Category
          </h2>
        </div>
        <div className="grid grid-cols-4 gap-3 md:grid-cols-8">
          {CATEGORIES.map((c) => (
            <Link
              key={c.label}
              to="/collections/$handle"
              params={{ handle: c.handle }}
              className="group flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-4 transition-all hover:-translate-y-1 hover:border-crimson hover:shadow-[var(--shadow-card)]"
            >
              <span className="text-3xl transition-transform group-hover:scale-110">
                {c.emoji}
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider">
                {c.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
