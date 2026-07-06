import { useState } from "react";
import { Link } from "react-router";
import { useLocalePath } from "@/stores/localeStore";
import { fieldMap, str, imageUrl, imageAlt, link, collectionHandle, listNodes, type RawNode } from "./fields";

interface Card {
  id: string;
  image: string | null;
  alt: string;
  label: string | null;
  href: string;
  category: string | null;
  countryCode: string | null;
  buttonText: string | null;
}

function parseCards(node: RawNode): Card[] {
  return listNodes(fieldMap(node), "cards")
    .map((n): Card | null => {
      const f = fieldMap(n);
      const label = str(f, "label");
      const coll = collectionHandle(f, "collection");
      const manual = link(f, "link");
      const href = manual ?? (coll ? `/collections/${coll}` : "");
      if (!href) return null;
      return {
        id: n.id ?? n.handle ?? label ?? "",
        image: imageUrl(f, "image"),
        alt: imageAlt(f, "image") ?? label ?? "",
        label,
        href,
        category: str(f, "category"),
        countryCode: str(f, "country_code"),
        buttonText: str(f, "button_text"),
      };
    })
    .filter((c): c is Card => c !== null);
}

// Shop-by-Origin / Shop-by-Cut card grid. Improved responsive WRAPPING grid: 2 cols on mobile,
// up to 5 on desktop. Optional tabs (from card.category) — hidden when no card sets a category.
export function MlsCardGrid({ node }: { node: RawNode }) {
  const lp = useLocalePath();
  const fm = fieldMap(node);
  const eyebrow = str(fm, "eyebrow");
  const heading = str(fm, "heading");
  const overlay = str(fm, "style") === "overlay";
  const cards = parseCards(node);

  const categories = Array.from(new Set(cards.map((c) => c.category).filter(Boolean))) as string[];
  const [active, setActive] = useState(categories[0] ?? "");

  if (cards.length === 0) return null;

  const visible = categories.length > 0 ? cards.filter((c) => c.category === active) : cards;

  return (
    <section className="py-8 md:py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-5 text-center md:mb-7">
          {eyebrow && (
            <div className="mb-1.5 flex items-center justify-center gap-3">
              <span className="h-px w-6 rounded-full bg-gradient-brand" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-crimson">{eyebrow}</span>
              <span className="h-px w-6 rounded-full bg-gradient-brand" />
            </div>
          )}
          {heading && (
            <h2 className="font-display text-xl font-bold tracking-tight md:text-3xl">{heading}</h2>
          )}
        </div>

        {/* Tabs */}
        {categories.length > 1 && (
          <div className="mb-5 flex justify-center md:mb-7">
            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {categories.map((tab) => {
                const isActive = active === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActive(tab)}
                    className={[
                      "shrink-0 whitespace-nowrap rounded-full px-5 py-2 text-[12px] font-semibold capitalize transition-all duration-200 md:px-7 md:text-sm",
                      isActive
                        ? "bg-crimson text-white shadow-[0_4px_14px_rgba(185,28,28,0.28)]"
                        : "bg-foreground/[0.06] text-foreground/60 hover:bg-foreground/[0.11] hover:text-foreground",
                    ].join(" ")}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {overlay ? (
          /* Overlay style (Wagyu MB cards): rectangular image with label + button overlaid.
             Mobile: horizontal carousel. sm+: grid of up to 3. */
          <div
            className={[
              "flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 -mx-4 px-4",
              "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
              "sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0",
            ].join(" ")}
          >
            {visible.map((c) => (
              <Link
                key={c.id}
                to={lp(c.href)}
                className="group relative aspect-[4/3] w-[82vw] shrink-0 snap-start overflow-hidden rounded-2xl bg-muted shadow-sm sm:w-auto"
              >
                {c.image ? (
                  <img src={c.image} alt={c.alt} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-charcoal/90 text-off-white/40"><span className="text-3xl">🥩</span></div>
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-charcoal/85 via-charcoal/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 p-4 text-center">
                  {c.label && (
                    <span className="font-display text-base font-bold !text-white drop-shadow md:text-lg">{c.label}</span>
                  )}
                  <span className="inline-flex h-8 items-center justify-center rounded-full bg-crimson px-5 text-[11px] font-bold uppercase tracking-wide !text-white shadow transition-colors group-hover:bg-rich-red md:h-9 md:text-xs">
                    {c.buttonText ?? "View Collection"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          /* Circle style (Shop by Origin / Cut):
             - Mobile: horizontal snap-scroll carousel (keeps the page short — cards peek ~3 across).
             - md and up: wrapping grid (4–5 per row). */
          <div
            className={[
              "flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 -mx-4 px-4",
              "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
              "md:mx-0 md:grid md:grid-cols-4 md:gap-x-5 md:gap-y-8 md:overflow-visible md:px-0 md:pb-0 xl:grid-cols-5",
            ].join(" ")}
          >
            {visible.map((c) => (
              <Link
                key={c.id}
                to={lp(c.href)}
                className="group flex w-[30vw] shrink-0 snap-start flex-col items-center gap-2.5 text-center sm:w-[22vw] md:w-auto"
              >
                <div className="relative aspect-square w-full max-w-[150px] overflow-hidden rounded-full ring-2 ring-crimson/15 shadow-sm transition-all duration-200 group-hover:ring-crimson/40 group-hover:shadow-md">
                  {c.image ? (
                    <img src={c.image} alt={c.alt} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  ) : c.countryCode ? (
                    <img src={`https://hatscripts.github.io/circle-flags/flags/${c.countryCode.toLowerCase()}.svg`} alt={c.alt} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <div className="grid h-full w-full place-items-center bg-muted text-muted-foreground"><span className="text-2xl">🥩</span></div>
                  )}
                </div>
                {c.label && (
                  <span className="px-1 text-[12px] font-semibold leading-tight text-foreground transition-colors group-hover:text-crimson md:text-sm">
                    {c.label}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
