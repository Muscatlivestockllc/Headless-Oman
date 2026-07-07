import { Link } from "react-router";
import { useLocalePath } from "@/stores/localeStore";
import { shopifyImageUrl } from "@/lib/shopify";
import { fieldMap, str, imageUrl, imageAlt, link, type RawNode } from "./fields";

// Hero section — desktop + mobile image (Arabic twins already swapped by the loader),
// heading, subheading, CTA, and the black "strip" bar underneath. Improved responsive design:
// a single <picture> so only the right image downloads (LCP), overlay gradient for legibility,
// content constrained and animated in.
export function MlsHero({ node }: { node: RawNode }) {
  const lp = useLocalePath();
  const fm = fieldMap(node);

  const desk = imageUrl(fm, "desktop_image");
  const mob = imageUrl(fm, "mobile_image");
  const primary = mob ?? desk;
  if (!primary) return null;

  const alt = imageAlt(fm, "mobile_image") ?? imageAlt(fm, "desktop_image") ?? "";
  const heading = str(fm, "heading");
  const subheading = str(fm, "subheading");
  const buttonText = str(fm, "button_text");
  const buttonUrl = link(fm, "button_url");
  const stripText = str(fm, "strip_text");

  const isHash = buttonUrl?.startsWith("#");

  const CtaButton = buttonText ? (
    <Link
      to={isHash ? "#" : lp(buttonUrl ?? "/")}
      onClick={
        isHash
          ? (e) => {
              e.preventDefault();
              const el = document.getElementById(buttonUrl!.slice(1)) ?? document.getElementById("products");
              el?.scrollIntoView({ behavior: "smooth" });
            }
          : undefined
      }
      className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-crimson px-8 text-sm font-bold uppercase tracking-wide !text-white shadow-lg transition-all duration-200 hover:bg-rich-red hover:scale-105 hover:shadow-xl md:mt-8 md:h-12 md:text-base"
    >
      {buttonText}
    </Link>
  ) : null;

  return (
    <section className="w-full">
      <div className="relative w-full overflow-hidden bg-charcoal" dir="ltr">
        <picture>
          {mob && desk && (
            <source media="(min-width: 768px)" srcSet={shopifyImageUrl(desk, 1600)} />
          )}
          <img
            src={shopifyImageUrl(primary, mob ? 828 : 1600)}
            alt={alt}
            loading="eager"
            fetchPriority="high"
            className="block h-auto w-full select-none"
          />
        </picture>

        {(heading || subheading || buttonText) && (
          <>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-charcoal/50 via-charcoal/20 to-charcoal/50" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="container mx-auto px-4 text-center">
                {heading && (
                  <h1 className="mx-auto max-w-3xl font-display text-2xl font-bold leading-[1.15] tracking-tight text-off-white drop-shadow-lg sm:text-3xl md:text-5xl">
                    {heading}
                  </h1>
                )}
                {subheading && (
                  <p className="mx-auto mt-3 max-w-xl text-sm text-off-white/90 drop-shadow md:mt-4 md:text-lg">
                    {subheading}
                  </p>
                )}
                {CtaButton && <div className="pointer-events-auto">{CtaButton}</div>}
              </div>
            </div>
          </>
        )}
      </div>

      {stripText && (
        <div className="bg-charcoal px-4 py-3 text-center text-xs font-semibold text-off-white md:text-sm">
          {stripText}
        </div>
      )}
    </section>
  );
}
