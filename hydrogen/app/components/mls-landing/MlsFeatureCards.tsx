import { Link } from "react-router";
import { useLocalePath } from "@/stores/localeStore";
import { fieldMap, str, imageUrl, listNodes, type RawNode } from "./fields";

const ICON_FILTER = "invert(15%) sepia(80%) saturate(400%) hue-rotate(340deg)";

// "Why South African Beef?" — feature cards. Improved: elevated cards with hover-lift, brand-tinted
// icon chips (not flat pink), subtle border + shadow, optional CTA underneath.
export function MlsFeatureCards({ node }: { node: RawNode }) {
  const lp = useLocalePath();
  const fm = fieldMap(node);
  const eyebrow = str(fm, "eyebrow");
  const heading = str(fm, "heading");
  const buttonText = str(fm, "button_text");
  const buttonUrl = str(fm, "button_url");
  const items = listNodes(fm, "items").map((n) => {
    const f = fieldMap(n);
    return { id: n.id ?? n.handle ?? "", icon: imageUrl(f, "icon"), heading: str(f, "heading"), body: str(f, "body") };
  });
  if (items.length === 0) return null;

  return (
    <section className="bg-bone py-10 md:py-14">
      <div className="container mx-auto px-4">
        <div className="mb-6 text-center md:mb-9">
          {eyebrow && (
            <div className="mb-1.5 flex items-center justify-center gap-3">
              <span className="h-px w-6 rounded-full bg-gradient-brand" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-crimson">{eyebrow}</span>
              <span className="h-px w-6 rounded-full bg-gradient-brand" />
            </div>
          )}
          {heading && <h2 className="font-display text-2xl font-bold tracking-tight md:text-3xl">{heading}</h2>}
        </div>

        {/* Mobile: horizontal snap carousel (keeps the page short). md+: wrapping grid. */}
        <div
          className={[
            "flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 -mx-4 px-4",
            "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            "sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 md:gap-6 lg:grid-cols-3",
          ].join(" ")}
        >
          {items.map((it) => (
            <div
              key={it.id}
              className="group flex w-[80vw] shrink-0 snap-start flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 text-center shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-crimson/40 hover:shadow-[var(--shadow-card)] sm:w-auto md:p-7"
            >
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-crimson/10 transition-transform duration-200 group-hover:scale-105">
                {it.icon ? (
                  <img src={it.icon} alt={it.heading ?? ""} className="h-7 w-7 object-contain" style={{ filter: ICON_FILTER }} />
                ) : (
                  <span className="text-xl text-crimson">★</span>
                )}
              </div>
              {it.heading && <h3 className="font-display text-lg font-bold text-foreground">{it.heading}</h3>}
              {it.body && <p className="text-sm leading-relaxed text-muted-foreground">{it.body}</p>}
            </div>
          ))}
        </div>

        {buttonText && buttonUrl && (
          <div className="mt-7 text-center md:mt-9">
            <Link
              to={buttonUrl.startsWith("http") ? buttonUrl : lp(buttonUrl)}
              className="inline-flex h-11 items-center justify-center rounded-full bg-crimson px-8 text-sm font-bold uppercase tracking-wide !text-white shadow-lg transition-all duration-200 hover:bg-rich-red hover:scale-105 hover:shadow-xl"
            >
              {buttonText}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
