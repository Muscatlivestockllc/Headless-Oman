import { create } from "zustand";
import { useRouteLoaderData } from "react-router";

export type Locale = "en" | "ar";
export type Dir = "ltr" | "rtl";

interface LocaleState {
  locale: Locale;
  setLocale: (l: Locale, canonicalPath?: string) => void;
  _syncLocale: (l: Locale) => void;
}

// Arabic page handle → English handle.
// In AR, Shopify serves translated page handles (e.g. /ar/pages/سياسة-الخصوصية), but those
// handles don't resolve in EN context, so a naïve /ar strip 404s. This maps each translated
// handle back to its English handle so switching to EN lands on the same page.
// Keep in sync with the AR page routes in app/routes.ts.
const AR_TO_EN_PAGE_HANDLE: Record<string, string> = {
  "تقييمات-العملاء": "customer-reviews",
  "اتصل-بنا-1": "contact-us",
  "استرداد-الأموال-أو-التبديل": "refund-exchange",
  "مكافأت": "rewards",
  "مكافآت-mls": "mls-rewards",
  "أح-ل-صديق-ا": "refer-a-friend",
  "أسئلة-وأجوبة": "faqs",
  "إم-إل-إس-جورميه": "mls-gourmet",
  "قصتنا-جديدة": "our-story-new",
  "شريك-mls": "mls-affiliate",
  "معلومات-التوصيل": "delivery-info",
  "سياسة-الاشتراك": "subscription-policy",
  "الاشتراكات": "subscriptions",
  "اشتراك": "subscription",
  "سياسة-الخصوصية": "privacy-policy",
};

export const useLocaleStore = create<LocaleState>()((set) => ({
  // Always initialize to "en" so server and client match on first render.
  // LocaleSync in root.tsx calls _syncLocale after hydration to set the real locale.
  locale: "en",
  _syncLocale: (l) => set({ locale: l }),
  setLocale: (locale, canonicalPath) => {
    set({ locale });
    if (typeof document !== "undefined") {
      const secure = window.location.protocol === "https:" ? ";Secure" : "";
      document.cookie = `lang=${locale};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax${secure}`;

      const current = window.location.pathname;
      let target: string;

      if (locale === "ar") {
        // Stay on the same page, just add /ar/ prefix.
        if (current.startsWith("/ar")) {
          target = current; // already on an /ar/* route
        } else {
          target = "/ar" + (current === "/" ? "" : current);
        }
        target += window.location.search;
      } else if (canonicalPath) {
        // Product page supplied the canonical EN handle — navigate to exact EN product URL.
        target = canonicalPath;
      } else {
        // Strip /ar/ prefix to get the EN equivalent path.
        const stripped = current.startsWith("/ar/") ? current.slice(3) || "/" : current === "/ar" ? "/" : current;
        let decoded = stripped;
        try { decoded = decodeURIComponent(stripped); } catch { /* keep raw */ }

        const pageMatch = decoded.match(/^\/pages\/([^/?#]+)/);
        if (pageMatch) {
          // Pages carry translated (Arabic) handles in AR that don't resolve in EN.
          const arHandle = pageMatch[1];
          const enHandle = AR_TO_EN_PAGE_HANDLE[arHandle];
          if (enHandle) {
            target = `/pages/${enHandle}${window.location.search}`;
          } else if (/[^\x00-\x7F]/.test(arHandle)) {
            // Unknown translated handle — fall back home rather than 404.
            target = "/";
          } else {
            target = stripped + window.location.search;
          }
        } else {
          // Only fall back to home on product pages where the handle contains non-ASCII
          // (Translate & Adapt translated slug) and no canonical path was supplied.
          // All other pages (collections, blogs, etc.) are safe to keep as-is.
          const isProductWithTranslatedHandle =
            /^\/(ar\/)?products\//.test(current) && /[^\x00-\x7F]/.test(decoded);
          target = isProductWithTranslatedHandle ? "/" : stripped + window.location.search;
        }
      }

      window.location.replace(target);
    }
  },
}));

export const dirFor = (l: Locale): Dir => (l === "ar" ? "rtl" : "ltr");

/**
 * Returns a path-prefixer function that prepends /ar/ when locale is Arabic.
 * Reads locale from the root loader (SSR-safe). Falls back to Zustand store
 * (picks up cookie on client if root data is unavailable).
 */
export function useLocalePath() {
  // Root loader provides the server-detected locale — no hydration mismatch.
  const rootData = useRouteLoaderData("root") as { locale?: Locale } | undefined;
  // Zustand fallback — correct after client hydration reads the cookie.
  const storeLocale = useLocaleStore((s) => s.locale);
  const locale: Locale = rootData?.locale ?? storeLocale;

  return (path: string | null | undefined): string => {
    const p = path ?? "/";
    if (locale !== "ar") return p;
    if (p.startsWith("/ar")) return p;
    return `/ar${p.startsWith("/") ? p : `/${p}`}`;
  };
}
