import { Link } from "@tanstack/react-router";

const ORIGINS = [
  { label: "Australia", short: "AUS", flag: "🇦🇺", q: "australia" },
  { label: "New Zealand", short: "NZ", flag: "🇳🇿", q: "new zealand" },
  { label: "Japan", short: "JAPAN", flag: "🇯🇵", q: "japan" },
  { label: "South Africa", short: "RSA", flag: "🇿🇦", q: "south africa" },
  { label: "USA", short: "USA", flag: "🇺🇸", q: "usa" },
  { label: "Pakistan", short: "PAK", flag: "🇵🇰", q: "pakistan" },
  { label: "Grass-Fed", short: "GRASS-FED", flag: "🌱", q: "grass-fed" },
];

export function ShopByOrigin() {
  return (
    <section className="bg-bone py-12">
      <div className="container mx-auto px-4">
        <div className="mb-6 text-center">
          <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-crimson">
            From the world's best farms
          </div>
          <h2 className="font-display text-2xl font-extrabold md:text-3xl">
            Shop by Origin
          </h2>
        </div>
        <div className="grid grid-cols-4 gap-3 md:grid-cols-7">
          {ORIGINS.map((o) => (
            <Link
              key={o.short}
              to="/search"
              search={{ q: o.q }}
              className="group flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-4 transition-all hover:-translate-y-1 hover:border-crimson hover:shadow-[var(--shadow-card)]"
            >
              <span className="text-3xl transition-transform group-hover:scale-110" aria-hidden>
                {o.flag}
              </span>
              <span className="text-center text-[11px] font-bold uppercase tracking-wider">
                {o.short}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
