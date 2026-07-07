import { Link } from "react-router";
import { useLocalePath } from "@/stores/localeStore";
import { fieldMap, str, imageUrl, imageAlt, listNodes, type RawNode } from "./fields";

// "We trace it, so you can trust it!" — media showcase. Improved: rounded media tiles with a
// zoom-on-hover, gradient caption overlay, responsive grid (stacks on mobile, side-by-side up).
export function MlsMediaShowcase({ node }: { node: RawNode }) {
  const lp = useLocalePath();
  const fm = fieldMap(node);
  const heading = str(fm, "heading");
  const subheading = str(fm, "subheading");
  const items = listNodes(fm, "items").map((n) => {
    const f = fieldMap(n);
    return {
      id: n.id ?? n.handle ?? "",
      image: imageUrl(f, "image"),
      alt: imageAlt(f, "image") ?? "",
      caption: str(f, "caption"),
      link: str(f, "link"),
    };
  }).filter((m) => m.image);
  if (items.length === 0) return null;

  const cols = items.length >= 2 ? "sm:grid-cols-2" : "";
  const gridCols = items.length >= 3 ? "lg:grid-cols-3" : "";

  return (
    <section className="py-10 md:py-14">
      <div className="container mx-auto px-4">
        {(heading || subheading) && (
          <div className="mb-6 text-center md:mb-9">
            {heading && <h2 className="font-display text-2xl font-bold tracking-tight md:text-3xl">{heading}</h2>}
            {subheading && <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">{subheading}</p>}
          </div>
        )}

        <div className={`grid gap-4 ${cols} ${gridCols} md:gap-6`}>
          {items.map((m) => {
            const inner = (
              <div className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted shadow-sm">
                <img
                  src={m.image!}
                  alt={m.alt}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {m.caption && (
                  <>
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-charcoal/80 to-transparent" />
                    <p className="absolute inset-x-4 bottom-4 text-left font-display text-lg font-bold text-off-white drop-shadow md:text-xl">
                      {m.caption}
                    </p>
                  </>
                )}
              </div>
            );
            return m.link ? (
              <Link key={m.id} to={m.link.startsWith("http") ? m.link : lp(m.link)} className="block">
                {inner}
              </Link>
            ) : (
              <div key={m.id}>{inner}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
