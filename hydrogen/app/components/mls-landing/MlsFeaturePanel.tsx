import { Link } from "react-router";
import { Check } from "lucide-react";
import { useLocalePath } from "@/stores/localeStore";
import { fieldMap, str, imageUrl, imageAlt, listNodes, type RawNode } from "./fields";

const ICON_FILTER = "brightness(0) invert(1)"; // white icons on the crimson panel

function safeColor(val: string | null, fallback: string): string {
  if (!val || /[^\x00-\x7F]/.test(val)) return fallback;
  return val;
}

// "Things You Need To Know" — a crimson panel with heading/intro on one side, an image, and a set
// of labeled points (icon/title/body) around it. Improved: clean point cards, responsive stack.
export function MlsFeaturePanel({ node }: { node: RawNode }) {
  const lp = useLocalePath();
  const fm = fieldMap(node);
  const heading = str(fm, "heading");
  const intro = str(fm, "intro");
  const image = imageUrl(fm, "image");
  const alt = imageAlt(fm, "image") ?? "";
  const buttonText = str(fm, "button_text");
  const buttonUrl = str(fm, "button_url");
  const bg = safeColor(str(fm, "bg_color"), "#8B0000");
  const plain = str(fm, "variant") === "plain"; // light image+text block (e.g. "Whichever mishkak")
  const points = listNodes(fm, "points").map((n) => {
    const f = fieldMap(n);
    return { id: n.id ?? n.handle ?? "", icon: imageUrl(f, "icon"), title: str(f, "title"), body: str(f, "body") };
  });
  if (!heading && points.length === 0) return null;

  // Plain variant: image on the left, heading + bullet points on the right, on the page background.
  if (plain) {
    return (
      <section className="py-10 md:py-14">
        <div className="container mx-auto px-4">
          <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
            {image && (
              <div className="overflow-hidden rounded-2xl shadow-md">
                <img src={image} alt={alt} loading="lazy" className="h-full w-full object-cover" />
              </div>
            )}
            <div>
              {heading && <h2 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">{heading}</h2>}
              {intro && <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">{intro}</p>}
              {points.length > 0 && (
                <ul className="mt-4 space-y-2.5">
                  {points.map((p) => (
                    <li key={p.id} className="flex gap-2.5 text-sm text-muted-foreground md:text-base">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-crimson" />
                      <span>
                        {p.title && <span className="font-semibold text-foreground">{p.title}{p.body ? ": " : ""}</span>}
                        {p.body}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {buttonText && buttonUrl && (
                <div className="mt-6">
                  <Link to={buttonUrl.startsWith("http") ? buttonUrl : lp(buttonUrl)} className="inline-flex h-11 items-center justify-center rounded-full bg-crimson px-8 text-sm font-bold uppercase tracking-wide !text-white shadow-lg transition-all duration-200 hover:bg-rich-red hover:scale-105">
                    {buttonText}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section style={{ backgroundColor: bg }} className="py-10 md:py-16">
      <div className="container mx-auto px-4">
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Left: heading + intro + CTA */}
          <div className="text-center lg:text-left">
            {heading && (
              <h2 className="font-display text-2xl font-black leading-tight tracking-tight !text-white md:text-4xl">{heading}</h2>
            )}
            {intro && <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed !text-white/85 md:text-base lg:mx-0">{intro}</p>}
            {buttonText && buttonUrl && (
              <div className="mt-6">
                <Link
                  to={buttonUrl.startsWith("http") ? buttonUrl : lp(buttonUrl)}
                  className="inline-flex h-11 items-center justify-center rounded-full bg-white px-8 text-sm font-bold uppercase tracking-wide !text-crimson shadow-lg transition-all duration-200 hover:scale-105"
                >
                  {buttonText}
                </Link>
              </div>
            )}
          </div>

          {/* Right: image */}
          {image && (
            <div className="overflow-hidden rounded-2xl shadow-xl">
              <img src={image} alt={alt} loading="lazy" className="h-full w-full object-cover" />
            </div>
          )}
        </div>

        {/* Points grid */}
        {points.length > 0 && (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {points.map((p) => (
              <div key={p.id} className="flex gap-3 rounded-xl bg-white/10 p-4 backdrop-blur-sm">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/15">
                  {p.icon ? (
                    <img src={p.icon} alt="" className="h-5 w-5 object-contain" style={{ filter: ICON_FILTER }} />
                  ) : (
                    <Check className="h-5 w-5 !text-white" strokeWidth={3} />
                  )}
                </div>
                <div className="min-w-0 text-left">
                  {p.title && <p className="font-display text-base font-bold !text-white">{p.title}</p>}
                  {p.body && <p className="mt-0.5 text-[13px] leading-snug !text-white/80">{p.body}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
