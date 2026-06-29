export function LpCertificationsSection({ node }: { node: any }) {
  const f: any[] = node.fields ?? [];
  const heading = f.find((x: any) => x.key === "heading")?.value ?? "";
  const items: any[] = f.find((x: any) => x.key === "items")?.references?.nodes ?? [];

  if (items.length === 0 && !heading) return null;

  return (
    <section className="py-10">
      <div className="container mx-auto px-4">
        {heading && (
          <h2 className="mb-6 text-center font-display text-xl font-extrabold text-foreground md:text-2xl">
            {heading}
          </h2>
        )}
        <div className="flex flex-wrap justify-center gap-6">
          {items.map((item: any, i: number) => {
            const fi: any[] = item.fields ?? [];
            const label = fi.find((x: any) => x.key === "label")?.value ?? "";
            const imgUrl = fi.find((x: any) => x.key === "image")?.reference?.image?.url;
            return (
              <div key={i} className="flex flex-col items-center gap-2 text-center">
                {imgUrl && (
                  <img
                    src={imgUrl}
                    alt={label}
                    loading="lazy"
                    decoding="async"
                    className="h-16 w-16 object-contain"
                  />
                )}
                {label && <p className="max-w-[120px] text-xs text-muted-foreground">{label}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
