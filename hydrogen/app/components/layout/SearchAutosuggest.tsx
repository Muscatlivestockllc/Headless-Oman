import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useLocalePath } from "@/stores/localeStore";
import { useT } from "@/i18n/strings";
import { Search, Loader2, Clock, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { shopifyImageUrl, formatPrice } from "@/lib/shopify";
import { useSearchLabels } from "@/lib/searchLabels";

// Autosuggest is served by /api/search-suggest: products ranked by Fast Simon, plus pages,
// blog articles and collections from the native Storefront predictiveSearch. The empty state
// shows the shopper's recent searches (localStorage) and a curated set of popular searches.

const RECENT_KEY = "mls_recent_searches";
const RECENT_MAX = 6;

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((s) => typeof s === "string").slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

interface PredictiveProduct {
  id: string;
  title: string;
  handle: string;
  availableForSale: boolean;
  priceRange: { minVariantPrice: { amount: string; currencyCode: string } };
  compareAtPriceRange: { minVariantPrice: { amount: string; currencyCode: string } };
  images: { edges: Array<{ node: { url: string; altText: string | null } }> };
}

interface SuggestData {
  products: PredictiveProduct[];
  pages: Array<{ title: string; handle: string }>;
  articles: Array<{ title: string; handle: string; blog?: { handle: string } | null }>;
  collections: Array<{ title: string; handle: string }>;
  correctedTerm?: string | null;
}

interface Props {
  placeholder?: string;
  onNavigate?: () => void;
  defaultQuery?: string;
}

export function SearchAutosuggest({
  placeholder,
  onNavigate,
  defaultQuery = "",
}: Props) {
  const lp = useLocalePath();
  const t = useT();
  const resolvedPlaceholder = placeholder ?? t("search.placeholder");
  // Labels + popular terms come from the mls_search_config metaobject (translated in T Lab),
  // falling back to the in-code strings.
  const L = useSearchLabels();
  const popularTerms = L.popularTerms;
  const [q, setQ] = useState(defaultQuery);
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 200);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const local = loadRecent();
    setRecent(local);
    // Merge in the logged-in customer's cross-device recent searches (server is source of truth).
    fetch("/api/recent-searches")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: any) => {
        if (d?.loggedIn && Array.isArray(d.searches)) {
          const merged = [
            ...d.searches,
            ...local.filter((l) => !d.searches.some((s: string) => s.toLowerCase() === l.toLowerCase())),
          ].slice(0, RECENT_MAX);
          setRecent(merged);
          try { localStorage.setItem(RECENT_KEY, JSON.stringify(merged)); } catch { /* ignore */ }
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const { data, isFetching } = useQuery({
    queryKey: ["search-suggest", debounced],
    queryFn: async (): Promise<SuggestData> => {
      const res = await fetch(`/api/search-suggest?q=${encodeURIComponent(debounced)}`);
      if (!res.ok) return { products: [], pages: [], articles: [], collections: [] };
      return (await res.json()) as SuggestData;
    },
    enabled: debounced.length >= 2,
    staleTime: 1000 * 30,
  });

  const saveRecent = (term: string) => {
    const val = term.trim();
    if (val.length < 2) return;
    setRecent((prev) => {
      const next = [val, ...prev.filter((r) => r.toLowerCase() !== val.toLowerCase())].slice(0, RECENT_MAX);
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    // Sync to the customer's account so it follows them across browsers (no-op if logged out).
    fetch("/api/recent-searches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ term: val }),
    }).catch(() => {});
  };

  const clearRecent = () => {
    setRecent([]);
    try { localStorage.removeItem(RECENT_KEY); } catch { /* ignore */ }
    fetch("/api/recent-searches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clear: true }),
    }).catch(() => {});
  };

  const submit = (value: string) => {
    const val = value.trim();
    if (!val) return;
    saveRecent(val);
    setOpen(false);
    onNavigate?.();
    navigate(`/search?q=${encodeURIComponent(val)}`);
  };

  // Recent / popular chip → fill the box and go to results.
  const runTerm = (term: string) => { setQ(term); submit(term); };

  const close = () => {
    if (debounced.trim().length >= 2) saveRecent(debounced);
    setOpen(false);
    onNavigate?.();
  };

  const products = (data?.products ?? []).filter(
    (p) => parseFloat(p.priceRange.minVariantPrice.amount) > 0
  );
  const pages = data?.pages ?? [];
  const articles = data?.articles ?? [];
  const collections = data?.collections ?? [];
  const hasAny = products.length + pages.length + articles.length + collections.length > 0;
  const hasSuggestions = collections.length + pages.length + articles.length > 0;
  const correctedTerm =
    data?.correctedTerm && data.correctedTerm.toLowerCase() !== debounced.toLowerCase()
      ? data.correctedTerm
      : null;

  // Compact grouped links for the right-hand suggestions rail (Collections / Pages / Articles).
  const renderGroup = (
    label: string,
    items: Array<{ title: string; handle: string; blog?: { handle: string } | null }>,
    toFn: (it: { handle: string; blog?: { handle: string } | null }) => string,
  ) =>
    items.length === 0 ? null : (
      <div className="mb-2 last:mb-0">
        <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
        {items.slice(0, 3).map((it) => (
          <Link
            key={it.handle}
            to={toFn(it)}
            onClick={close}
            className="block truncate rounded-md px-2 py-1.5 text-sm hover:bg-background"
          >
            {it.title}
          </Link>
        ))}
      </div>
    );

  return (
    <div ref={ref} className="relative w-full">
      <form onSubmit={(e) => { e.preventDefault(); submit(q); }}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            type="search"
            placeholder={resolvedPlaceholder}
            className="w-full rounded-full border border-border bg-card py-3 pl-11 pr-4 text-base font-semibold outline-none focus:border-crimson"
          />
          {isFetching && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
      </form>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-xl border border-border bg-popover shadow-xl">
          {debounced.length < 2 ? (
            <div className="p-2">
              {recent.length > 0 && (
                <div className="mb-2">
                  <div className="flex items-center justify-between px-2 py-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{L.recent}</span>
                    <button type="button" onClick={clearRecent} className="text-[10px] font-semibold text-crimson hover:underline">{L.clear}</button>
                  </div>
                  {recent.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => runTerm(term)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                    >
                      <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{term}</span>
                    </button>
                  ))}
                </div>
              )}
              <div>
                <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <TrendingUp className="h-3 w-3" /> {L.popular}
                </div>
                <div className="flex flex-wrap gap-1.5 px-2 pb-1 pt-0.5">
                  {popularTerms.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => runTerm(term)}
                      className="rounded-full border border-border px-3 py-1 text-xs font-medium transition-colors hover:border-crimson hover:text-crimson"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : !hasAny && !isFetching ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              {t("search.no_matches")} &ldquo;{debounced}&rdquo;
            </div>
          ) : (
            <>
              {correctedTerm && (
                <div className="border-b border-border px-4 py-2 text-xs text-muted-foreground">
                  {t("search.showing_for")}{" "}
                  <span className="font-semibold text-crimson">&ldquo;{correctedTerm}&rdquo;</span>
                </div>
              )}
              <div className="flex flex-col sm:flex-row">
                {products.length > 0 && (
                  <ul className="flex-1 divide-y divide-border">
                    {products.slice(0, 5).map((p) => {
                      const img = p.images.edges[0]?.node;
                      const price = p.priceRange.minVariantPrice;
                      const compareAt = p.compareAtPriceRange?.minVariantPrice;
                      const hasDiscount =
                        compareAt && parseFloat(compareAt.amount) > parseFloat(price.amount);
                      return (
                        <li key={p.id}>
                          <Link
                            to={lp(`/products/${p.handle}`)}
                            onClick={close}
                            className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted"
                          >
                            <div className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                              {img && (
                                <img
                                  src={shopifyImageUrl(img.url, 88)}
                                  alt={img.altText ?? p.title}
                                  className="h-full w-full object-cover"
                                />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium leading-snug">{p.title}</div>
                              <div className="mt-0.5 flex items-center gap-2">
                                <span className="text-xs font-bold text-crimson">
                                  {formatPrice(price.amount, price.currencyCode)}
                                </span>
                                {hasDiscount && (
                                  <span className="text-[11px] text-muted-foreground line-through">
                                    {formatPrice(compareAt.amount, compareAt.currencyCode)}
                                  </span>
                                )}
                                {!p.availableForSale && (
                                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                                    {t("search.out_of_stock")}
                                  </span>
                                )}
                              </div>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {hasSuggestions && (
                  <div
                    className={`${
                      products.length > 0
                        ? "border-t border-border sm:w-56 sm:border-l sm:border-t-0"
                        : "flex-1"
                    } bg-muted/30 p-2`}
                  >
                    {renderGroup(L.collections, collections, (c) => lp(`/collections/${c.handle}`))}
                    {renderGroup(L.pages, pages, (p) => lp(`/pages/${p.handle}`))}
                    {renderGroup(L.articles, articles, (a) => lp(`/blogs/${a.blog?.handle ?? "news"}/${a.handle}`))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => submit(q)}
                className="block w-full border-t border-border bg-card px-4 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-crimson transition-colors hover:bg-muted"
              >
                {t("search.see_all_for")} &ldquo;{debounced}&rdquo; →
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
