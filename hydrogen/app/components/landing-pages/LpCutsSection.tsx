export function LpCutsSection({ node }: { node: any }) {
  const f = Object.fromEntries((node?.fields ?? []).map((x: any) => [x.key, x]));
  const heading = f.heading?.value ?? "";
  const background = f.bakcground?.value ?? f.background?.value ?? "light";
  const items: any[] = f.items?.references?.nodes ?? [];

  if (items.length === 0 && !heading) return null;

  const isDark = background === "dark";

  return (
    <section className={`py-12 md:py-16 ${isDark ? "bg-charcoal text-white" : "bg-[#fdf0f0] text-foreground"}`}>
      <div className="container mx-auto px-4 text-center">
        {heading && (
          <h2 className={`font-display text-xl font-extrabold md:text-2xl mb-10 ${isDark ? "text-white" : ""}`}>
            {heading}
          </h2>
        )}
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {items.map((item: any) => {
            const fi = Object.fromEntries((item?.fields ?? []).map((x: any) => [x.key, x]));
            const imgUrl = fi.icon?.reference?.image?.url ?? null;
            const label = fi.label?.value ?? "";
            return (
              <div key={item.id} className="flex flex-col items-center gap-3">
                {imgUrl && (
                  <div className={`grid h-20 w-20 place-items-center rounded-full ${isDark ? "bg-white/10" : "bg-white"} shadow-sm`}>
                    <img
                      src={imgUrl}
                      alt={label}
                      className="h-10 w-10 object-contain"
                      style={{ filter: isDark ? "invert(1)" : "none" }}
                    />
                  </div>
                )}
                {label && (
                  <p className={`text-xs leading-snug text-center max-w-[120px] ${isDark ? "text-white/80" : "text-muted-foreground"}`}>
                    {label}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
