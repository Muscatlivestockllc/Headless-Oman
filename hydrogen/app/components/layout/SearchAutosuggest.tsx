import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useLocalePath } from "@/stores/localeStore";
import { useT } from "@/i18n/strings";
import { Search, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { shopifyImageUrl, formatPrice } from "@/lib/shopify";

// Autosuggest is served by /api/search-suggest: products ranked by Fast Simon, plus pages,
// blog articles and collections from the native Storefront predictiveSearch.

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
  const [q, setQ] = useState(defaultQuery);
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

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

  const submit = (value: string) => {
    if (!value.trim()) return;
    setOpen(false);
    onNavigate?.();
    navigate(`/search?q=${encodeURIComponent(value.trim())}`);
  };

  const close = () => { setOpen(false); onNavigate?.(); };

  const products = (data?.products ?? []).filter(
    (p) => parseFloat(p.priceRange.minVariantPrice.amount) > 0
  );
  const pages = data?.pages ?? [];
  const articles = data?.articles ?? [];
  const collections = data?.collections ?? [];
  const hasAny = products.length + pages.length + articles.length + collections.length > 0;
  const hasSuggestions = collections.length + pages.length + articles.length > 0;

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
            onFocus={() => { if (q.trim().length >= 2) setOpen(true); }}
            type="search"
            placeholder={resolvedPlaceholder}
            className="w-full rounded-full border border-border bg-card py-3 pl-11 pr-4 text-base font-semibold outline-none focus:border-crimson"
          />
          {isFetching && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
      </form>

      {open && debounced.length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-xl border border-border bg-popover shadow-xl">
          {!hasAny && !isFetching ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              {t("search.no_matches")} &ldquo;{debounced}&rdquo;
            </div>
          ) : (
            <>
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
                    {renderGroup(t("search.collections"), collections, (c) => lp(`/collections/${c.handle}`))}
                    {renderGroup(t("search.pages"), pages, (p) => lp(`/pages/${p.handle}`))}
                    {renderGroup(t("search.articles"), articles, (a) => lp(`/blogs/${a.blog?.handle ?? "news"}/${a.handle}`))}
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
