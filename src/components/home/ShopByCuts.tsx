import { Link } from "@tanstack/react-router";

const CUTS = [
  { label: "Ribeye", icon: "🥩", q: "ribeye" },
  { label: "Striploin", icon: "🍖", q: "striploin" },
  { label: "Tenderloin", icon: "🥩", q: "tenderloin" },
  { label: "Brisket", icon: "🍖", q: "brisket" },
  { label: "Short Ribs", icon: "🍖", q: "short ribs" },
  { label: "Mince", icon: "🍔", q: "mince" },
  { label: "Chops", icon: "🍖", q: "chops" },
  { label: "Shanks", icon: "🦴", q: "shank" },
];

export function ShopByCuts() {
  return (
    <section className="container mx-auto px-4 py-12">
      <div className="mb-6 text-center">
        <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-crimson">
          Butcher's picks
        </div>
        <h2 className="font-display text-2xl font-extrabold md:text-3xl">
          Shop by Cuts
        </h2>
      </div>
      <div className="grid grid-cols-4 gap-3 md:grid-cols-8">
        {CUTS.map((c) => (
          <Link
            key={c.label}
            to="/search"
            search={{ q: c.q }}
            className="group flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-4 transition-all hover:-translate-y-1 hover:border-crimson hover:shadow-[var(--shadow-card)]"
          >
            <span className="text-3xl transition-transform group-hover:scale-110">
              {c.icon}
            </span>
            <span className="text-center text-xs font-semibold uppercase tracking-wider">
              {c.label}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
