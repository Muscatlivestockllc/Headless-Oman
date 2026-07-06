import { Link } from "react-router";
import { useLocalePath } from "@/stores/localeStore";
import { fieldMap, str, imageUrl, type RawNode } from "./fields";

function safeColor(val: string | null, fallback: string): string {
  if (!val || /[^\x00-\x7F]/.test(val)) return fallback;
  return val;
}

// Bold promo band ("Easy on the pocket, hard on the flavor!") — heading + button on a color band,
// with an optional background image. Improved: subtle gradient sheen, animated white-on-red button.
export function MlsPromoBanner({ node }: { node: RawNode }) {
  const lp = useLocalePath();
  const fm = fieldMap(node);
  const heading = str(fm, "heading");
  const subheading = str(fm, "subheading");
  const buttonText = str(fm, "button_text");
  const buttonUrl = str(fm, "button_url");
  const bg = safeColor(str(fm, "bg_color"), "#8B0000");
  const bgImage = imageUrl(fm, "background_image");
  if (!heading && !buttonText) return null;

  const isHash = buttonUrl?.startsWith("#");

  return (
    <section
      className="relative overflow-hidden"
      style={{
        backgroundColor: bg,
        backgroundImage: bgImage ? `linear-gradient(rgba(0,0,0,.45),rgba(0,0,0,.45)), url(${bgImage})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* subtle diagonal sheen */}
      {!bgImage && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/0 via-white/[0.06] to-white/0" />
      )}
      <div className="container relative mx-auto px-4 py-8 text-center md:py-12">
        {heading && (
          <h2 className="mx-auto max-w-3xl font-display text-2xl font-black leading-tight tracking-tight !text-white drop-shadow md:text-4xl">
            {heading}
          </h2>
        )}
        {subheading && (
          <p className="mx-auto mt-2 max-w-xl text-sm !text-white/90 md:text-base">{subheading}</p>
        )}
        {buttonText && (
          <div className="mt-5 md:mt-6">
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
              className="inline-flex h-11 items-center justify-center rounded-full bg-white px-8 text-sm font-bold uppercase tracking-wide !text-crimson shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl md:h-12 md:text-base"
            >
              {buttonText}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
