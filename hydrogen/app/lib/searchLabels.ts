import { useRouteLoaderData } from "react-router";
import { useT } from "~/i18n/strings";

// Search UI text. Values come from the mls_search_config metaobject (translated in T Lab, delivered
// already-localized by the AR-aware root loader). Each falls back to the in-code i18n string when the
// metaobject field is empty or missing — so nothing ever renders blank.
export function useSearchLabels() {
  const root = useRouteLoaderData("root") as { searchConfig?: Record<string, string> } | undefined;
  const cfg = root?.searchConfig ?? {};
  const t = useT();
  const label = (metaKey: string, i18nKey: Parameters<typeof t>[0]) =>
    cfg[metaKey]?.trim() || t(i18nKey);
  return {
    recent: label("label_recent", "search.recent"),
    popular: label("label_popular", "search.popular"),
    clear: label("label_clear", "search.clear"),
    collections: label("label_collections", "search.collections"),
    pages: label("label_pages", "search.pages"),
    articles: label("label_articles", "search.articles"),
    showingFor: label("label_showing_for", "search.showing_for"),
    popularTerms: (cfg.popular_terms?.trim() || t("search.popular_terms"))
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean),
  };
}
