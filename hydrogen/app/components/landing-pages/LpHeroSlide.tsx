import { Link } from "react-router";

function getField(fields: any[], key: string): string | null {
  return fields?.find((f: any) => f.key === key)?.value ?? null;
}

function getImageUrl(fields: any[], key: string): string | null {
  return fields?.find((f: any) => f.key === key)?.reference?.image?.url ?? null;
}

interface ParsedSlide {
  desktopImage: string;
  mobileImage: string | null;
  ctaUrl: string | null;
  scrollTarget: string | null;
  isExternal: boolean;
}

function parseSlide(node: any): ParsedSlide | null {
  const f = node.fields ?? [];
  const desktopImage = getImageUrl(f, "desktop_image");
  if (!desktopImage) return null;

  let scrollTarget = getField(f, "scroll_target");

  let ctaUrl: string | null = null;
  if (!scrollTarget) {
    const rawLink = getField(f, "cta_link");
    if (rawLink) {
      try { ctaUrl = JSON.parse(rawLink)?.url ?? rawLink; } catch { ctaUrl = rawLink; }
    }
    if (!ctaUrl) ctaUrl = getField(f, "cta_url");

    // Hash link (e.g. "#products") → treat as in-page scroll target
    if (ctaUrl?.startsWith("#")) {
      scrollTarget = ctaUrl.slice(1);
      ctaUrl = null;
    }

    // Internal links on LP pages → scroll to products instead of navigating away
    if (ctaUrl && !ctaUrl.startsWith("http")) {
      scrollTarget = "products";
      ctaUrl = null;
    }
  }

  // Default: scroll to the product grid section below when no CTA is configured
  if (!scrollTarget && !ctaUrl) {
    scrollTarget = "products";
  }

  return {
    desktopImage,
    mobileImage: getImageUrl(f, "mobile_image"),
    ctaUrl,
    scrollTarget,
    isExternal: !!ctaUrl && ctaUrl.startsWith("http"),
  };
}

export function LpHeroSlide({ node }: { node: any }) {
  const slide = parseSlide(node);
  if (!slide) return null;

  const imgContent = (
    <>
      <img
        src={slide.desktopImage}
        alt=""
        className={slide.mobileImage ? "hidden w-full md:block" : "w-full"}
      />
      {slide.mobileImage && (
        <img
          src={slide.mobileImage}
          alt=""
          className="w-full md:hidden"
        />
      )}
    </>
  );

  // Scroll to section on same page
  if (slide.scrollTarget) {
    return (
      <section className="w-full overflow-hidden">
        <button
          type="button"
          className="block w-full cursor-pointer"
          onClick={() => {
            const el =
              document.getElementById(slide.scrollTarget!) ??
              document.getElementById("products");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }}
        >
          {imgContent}
        </button>
      </section>
    );
  }

  if (!slide.ctaUrl) {
    return <section className="w-full overflow-hidden">{imgContent}</section>;
  }

  if (slide.isExternal) {
    return (
      <section className="w-full overflow-hidden">
        <a href={slide.ctaUrl} target="_blank" rel="noopener noreferrer" className="block">
          {imgContent}
        </a>
      </section>
    );
  }

  let to = slide.ctaUrl;
  try {
    const u = new URL(slide.ctaUrl);
    to = u.pathname + u.search;
  } catch { /* already relative */ }

  return (
    <section className="w-full overflow-hidden">
      <Link to={to} className="block">
        {imgContent}
      </Link>
    </section>
  );
}