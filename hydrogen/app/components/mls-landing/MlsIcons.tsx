import { fieldMap, str, imageUrl, listNodes, type RawNode } from "./fields";

// Icons row ("THE MLS EXPERIENCE"). Improved responsive design: 3-up on mobile with dividers,
// evenly spaced icon-left cards on desktop. Icon is an uploaded image tinted crimson.
const ICON_FILTER = "invert(15%) sepia(80%) saturate(400%) hue-rotate(340deg)";

export function MlsIcons({ node }: { node: RawNode }) {
  const fm = fieldMap(node);
  const heading = str(fm, "heading");
  const items = listNodes(fm, "items").map((n) => {
    const f = fieldMap(n);
    return { id: n.id ?? n.handle ?? "", icon: imageUrl(f, "icon"), heading: str(f, "heading"), sub: str(f, "sub_title") };
  });
  if (items.length === 0) return null;

  return (
    <section className="border-y border-border bg-bone py-6 md:py-10">
      <div className="container mx-auto px-4">
        {heading && (
          <h2 className="mb-5 text-center font-display text-lg font-bold tracking-tight md:mb-7 md:text-2xl">
            {heading}
          </h2>
        )}
        <div
          className="grid divide-x divide-border"
          style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0,1fr))` }}
        >
          {items.map((it) => (
            <div key={it.id} className="flex flex-col items-center gap-2 px-2 text-center md:flex-row md:justify-center md:gap-4 md:px-6 md:text-left">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-crimson/10 md:h-14 md:w-14">
                {it.icon ? (
                  <img src={it.icon} alt={it.heading ?? ""} className="h-5 w-5 object-contain md:h-7 md:w-7" style={{ filter: ICON_FILTER }} />
                ) : (
                  <span className="text-lg text-crimson">★</span>
                )}
              </div>
              <div className="min-w-0">
                {it.heading && <p className="text-[11px] font-bold uppercase leading-tight tracking-wide text-foreground md:text-sm">{it.heading}</p>}
                {it.sub && <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground md:text-xs">{it.sub}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
