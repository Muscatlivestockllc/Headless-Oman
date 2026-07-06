import { fieldMap, str, imageUrl, listNodes, type RawNode } from "./fields";

// Awards / badges row ("MLS brings award-winning Angus beef"). Centered logo row with captions,
// responsive: wraps on mobile, single row on desktop.
export function MlsAwards({ node }: { node: RawNode }) {
  const fm = fieldMap(node);
  const heading = str(fm, "heading");
  const subheading = str(fm, "subheading");
  const items = listNodes(fm, "items").map((n) => {
    const f = fieldMap(n);
    return { id: n.id ?? n.handle ?? "", image: imageUrl(f, "image"), caption: str(f, "caption") };
  });
  if (!heading && items.length === 0) return null;

  return (
    <section className="py-10 md:py-14">
      <div className="container mx-auto px-4 text-center">
        {heading && <h2 className="mx-auto max-w-2xl font-display text-2xl font-bold tracking-tight md:text-3xl">{heading}</h2>}
        {subheading && <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground md:text-base">{subheading}</p>}

        {items.length > 0 && (
          <div className="mt-8 flex flex-wrap items-start justify-center gap-x-8 gap-y-8 md:gap-x-16">
            {items.map((it) => (
              <div key={it.id} className="flex w-28 flex-col items-center gap-3 md:w-36">
                <div className="grid h-20 w-20 place-items-center md:h-24 md:w-24">
                  {it.image ? (
                    <img src={it.image} alt={it.caption ?? ""} loading="lazy" className="h-full w-full object-contain" />
                  ) : (
                    <div className="grid h-full w-full place-items-center rounded-full bg-muted text-2xl">🏆</div>
                  )}
                </div>
                {it.caption && (
                  <p className="text-[11px] font-bold uppercase leading-tight tracking-wide text-foreground md:text-xs">{it.caption}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
