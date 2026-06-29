import { Link } from "@tanstack/react-router";
import { HScroller } from "./HScroller";

const COLLECTIONS = [
  { handle: "australian-wagyu-beef-mb-4-5", title: "Australian Wagyu", tag: "Marbling MB 4/5", emoji: "🥩" },
  { handle: "australian-black-angus-beef", title: "Black Angus", tag: "Australian", emoji: "🐂" },
  { handle: "australian-lamb", title: "Australian Lamb", tag: "Grass-fed", emoji: "🐑" },
  { handle: "beef-burgers-patties", title: "Burger Patties", tag: "Grill-ready", emoji: "🍔" },
  { handle: "beef-mishkak-barbecue-cubes-fondue", title: "BBQ & Mishkak", tag: "Pre-cubed", emoji: "🔥" },
  { handle: "box-collection", title: "Meat Boxes", tag: "Curated bundles", emoji: "📦" },
];

export function FeaturedCollections() {
  return (
    <section className="container mx-auto px-4 py-12">
      <SectionHeader title="Featured Collections" subtitle="Hand-picked favourites" />
      <HScroller>
        {COLLECTIONS.map((c) => (
          <Link
            key={c.handle}
            to="/collections/$handle"
            params={{ handle: c.handle }}
            className="group flex w-40 flex-shrink-0 snap-start flex-col items-center gap-3 rounded-lg border border-border bg-card p-5 text-center transition-shadow hover:shadow-[var(--shadow-elegant)] sm:w-48"
          >
            <div className="grid h-16 w-16 place-items-center rounded-full bg-crimson/10 text-3xl transition-transform group-hover:scale-110">
              {c.emoji}
            </div>
            <div>
              <div className="font-display text-sm font-bold">{c.title}</div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{c.tag}</div>
            </div>
          </Link>
        ))}
      </HScroller>
    </section>
  );
}

export function SectionHeader({
  title,
  subtitle,
  actionHref,
  actionLabel,
}: {
  title: string;
  subtitle?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        {subtitle && (
          <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-crimson">
            {subtitle}
          </div>
        )}
        <h2 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
          {title}
        </h2>
      </div>
      {actionHref && (
        <a
          href={actionHref}
          className="hidden text-sm font-semibold text-crimson hover:underline sm:inline"
        >
          {actionLabel ?? "View all →"}
        </a>
      )}
    </div>
  );
}
