import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Search, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  storefrontApiRequest,
  SEARCH_PRODUCTS_QUERY,
  type ShopifyProduct,
  shopifyImageUrl,
  formatPrice,
} from "@/lib/shopify";

interface Props {
  variant?: "desktop" | "mobile";
  placeholder?: string;
  onNavigate?: () => void;
}

export function SearchAutosuggest({
  variant = "desktop",
  placeholder = "Search beef, lamb, wagyu, mince…",
  onNavigate,
}: Props) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 200);
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
    queryFn: async () => {
      const res = await storefrontApiRequest<any>(SEARCH_PRODUCTS_QUERY, {
        first: 6,
        query: debounced,
      });
      const products: ShopifyProduct[] = res?.data?.products?.edges ?? [];
      return products;
    },
    enabled: debounced.length >= 2,
  });

  const submit = (value: string) => {
    if (!value.trim()) return;
    setOpen(false);
    onNavigate?.();
    navigate({ to: "/search", search: { q: value.trim() } });
  };

  const products = data ?? [];

  return (
    <div ref={ref} className="relative w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(q);
        }}
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            type="search"
            placeholder={placeholder}
            className="w-full rounded-full border border-border bg-card py-2 pl-10 pr-4 text-sm outline-none focus:border-crimson"
          />
          {isFetching && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
      </form>

      {open && debounced.length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-md border border-border bg-popover shadow-lg">
          {products.length === 0 && !isFetching ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No matches for "{debounced}"
            </div>
          ) : (
            <>
              <ul className="divide-y divide-border">
                {products.map((p) => {
                  const img = p.node.images.edges[0]?.node;
                  const price = p.node.priceRange.minVariantPrice;
                  return (
                    <li key={p.node.id}>
                      <Link
                        to="/products/$handle"
                        params={{ handle: p.node.handle }}
                        onClick={() => {
                          setOpen(false);
                          onNavigate?.();
                        }}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-muted"
                      >
                        {img && (
                          <img
                            src={shopifyImageUrl(img.url, 80)}
                            alt={img.altText ?? p.node.title}
                            className="h-10 w-10 flex-shrink-0 rounded object-cover"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{p.node.title}</div>
                          <div className="text-xs font-semibold text-crimson">
                            {formatPrice(price.amount, price.currencyCode)}
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                onClick={() => submit(q)}
                className="block w-full border-t border-border bg-card px-4 py-2 text-center text-xs font-bold uppercase tracking-wider text-crimson hover:bg-muted"
              >
                See all results for "{debounced}" →
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
