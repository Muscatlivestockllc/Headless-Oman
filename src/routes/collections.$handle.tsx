import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  storefrontApiRequest,
  COLLECTION_PRODUCTS_QUERY,
  getOriginFromTags,
  type ShopifyProduct,
} from "@/lib/shopify";
import { ProductGrid } from "@/components/product/ProductGrid";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, SlidersHorizontal, X } from "lucide-react";

type SortKey = "featured" | "price-asc" | "price-desc" | "title-asc";

export const Route = createFileRoute("/collections/$handle")({
  component: CollectionPage,
  head: ({ params }) => {
    const pretty = params.handle.replace(/-/g, " ");
    return {
      meta: [
        { title: `${pretty} — MLS` },
        { name: "description", content: `Shop ${pretty} at Muscat Livestock Store. Premium halal meats delivered same-day.` },
        { property: "og:title", content: `${pretty} — MLS` },
        { property: "og:description", content: `Shop ${pretty} at Muscat Livestock Store.` },
      ],
    };
  },
});

const ORIGIN_OPTIONS = ["AUS", "NZ", "JP", "ZA", "USA", "PAK", "ARG", "BRZ", "NL"];

function CollectionPage() {
  const { handle } = Route.useParams();
  const [sort, setSort] = useState<SortKey>("featured");
  const [origins, setOrigins] = useState<string[]>([]);
  const [grassFedOnly, setGrassFedOnly] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number] | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["collection", handle, 60],
    queryFn: async () => {
      const res = await storefrontApiRequest<any>(COLLECTION_PRODUCTS_QUERY, {
        handle,
        first: 60,
      });
      return res?.data?.collection;
    },
  });

  const products: ShopifyProduct[] = data?.products?.edges ?? [];

  // Compute price bounds from the collection
  const [minPrice, maxPrice] = useMemo(() => {
    if (!products.length) return [0, 0];
    const prices = products.map((p) =>
      parseFloat(p.node.priceRange.minVariantPrice.amount)
    );
    return [Math.floor(Math.min(...prices)), Math.ceil(Math.max(...prices))];
  }, [products]);

  const activeRange = priceRange ?? [minPrice, maxPrice];

  // Filter
  const filtered = useMemo(() => {
    return products.filter((p) => {
      const price = parseFloat(p.node.priceRange.minVariantPrice.amount);
      if (priceRange && (price < priceRange[0] || price > priceRange[1])) return false;

      const origin = getOriginFromTags(p.node.tags);
      if (origins.length > 0 && (!origin || !origins.includes(origin))) return false;

      if (grassFedOnly) {
        const tagsLower = p.node.tags.map((t) => t.toLowerCase().replace(/\s+/g, "-"));
        if (!tagsLower.includes("grass-fed") && !tagsLower.includes("grassfed")) return false;
      }

      if (inStockOnly && !p.node.availableForSale) return false;

      return true;
    });
  }, [products, priceRange, origins, grassFedOnly, inStockOnly]);

  // Sort
  const sorted = useMemo(() => {
    const arr = [...filtered];
    if (sort === "price-asc") {
      arr.sort(
        (a, b) =>
          parseFloat(a.node.priceRange.minVariantPrice.amount) -
          parseFloat(b.node.priceRange.minVariantPrice.amount)
      );
    } else if (sort === "price-desc") {
      arr.sort(
        (a, b) =>
          parseFloat(b.node.priceRange.minVariantPrice.amount) -
          parseFloat(a.node.priceRange.minVariantPrice.amount)
      );
    } else if (sort === "title-asc") {
      arr.sort((a, b) => a.node.title.localeCompare(b.node.title));
    }
    return arr;
  }, [filtered, sort]);

  const toggleOrigin = (o: string) =>
    setOrigins((s) => (s.includes(o) ? s.filter((x) => x !== o) : [...s, o]));

  const activeFilterCount =
    origins.length + (grassFedOnly ? 1 : 0) + (inStockOnly ? 1 : 0) + (priceRange ? 1 : 0);

  const clearAll = () => {
    setOrigins([]);
    setGrassFedOnly(false);
    setInStockOnly(false);
    setPriceRange(null);
  };

  const FiltersPanel = (
    <div className="space-y-6">
      {/* Price */}
      {maxPrice > minPrice && (
        <div>
          <div className="mb-3 text-xs font-bold uppercase tracking-wider text-foreground">
            Price (AED)
          </div>
          <Slider
            min={minPrice}
            max={maxPrice}
            step={1}
            value={[activeRange[0], activeRange[1]]}
            onValueChange={(v) => setPriceRange([v[0], v[1]])}
          />
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>AED {activeRange[0]}</span>
            <span>AED {activeRange[1]}</span>
          </div>
        </div>
      )}

      {/* Origin */}
      <div>
        <div className="mb-3 text-xs font-bold uppercase tracking-wider text-foreground">
          Origin
        </div>
        <div className="space-y-2">
          {ORIGIN_OPTIONS.map((o) => (
            <label key={o} className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={origins.includes(o)}
                onCheckedChange={() => toggleOrigin(o)}
              />
              <span>{o}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div>
        <div className="mb-3 text-xs font-bold uppercase tracking-wider text-foreground">
          Quality
        </div>
        <div className="space-y-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={grassFedOnly} onCheckedChange={(v) => setGrassFedOnly(!!v)} />
            <span>Grass-fed only</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={inStockOnly} onCheckedChange={(v) => setInStockOnly(!!v)} />
            <span>In stock only</span>
          </label>
        </div>
      </div>

      {activeFilterCount > 0 && (
        <Button variant="outline" size="sm" onClick={clearAll} className="w-full">
          <X className="mr-2 h-3.5 w-3.5" /> Clear all filters
        </Button>
      )}
    </div>
  );

  return (
    <div>
      <div className="bg-bone">
        <div className="container mx-auto px-4 py-10">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-crimson">
            Collection
          </div>
          <h1 className="mt-2 font-display text-3xl font-extrabold md:text-4xl">
            {data?.title ?? handle.replace(/-/g, " ")}
          </h1>
          {data?.description && (
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {data.description}
            </p>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-lg border border-border bg-card p-5">
              <div className="mb-4 font-display text-lg font-bold">Filters</div>
              {FiltersPanel}
            </div>
          </aside>

          <div>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                {isLoading ? "Loading…" : `${sorted.length} of ${products.length} products`}
              </div>

              <div className="flex items-center gap-2">
                {/* Mobile filter button */}
                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="lg:hidden">
                      <SlidersHorizontal className="mr-2 h-4 w-4" />
                      Filters
                      {activeFilterCount > 0 && (
                        <span className="ml-2 grid h-5 min-w-5 place-items-center rounded-full bg-crimson px-1.5 text-[10px] font-bold text-crimson-foreground">
                          {activeFilterCount}
                        </span>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[88vw] max-w-[360px] overflow-y-auto">
                    <SheetHeader className="mb-6">
                      <SheetTitle>Filters</SheetTitle>
                    </SheetHeader>
                    {FiltersPanel}
                  </SheetContent>
                </Sheet>

                <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="featured">Featured</SelectItem>
                    <SelectItem value="price-asc">Price: Low → High</SelectItem>
                    <SelectItem value="price-desc">Price: High → Low</SelectItem>
                    <SelectItem value="title-asc">Name: A → Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Active filter chips */}
            {activeFilterCount > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {origins.map((o) => (
                  <button
                    key={o}
                    onClick={() => toggleOrigin(o)}
                    className="inline-flex items-center gap-1 rounded-full bg-charcoal/10 px-3 py-1 text-xs font-semibold hover:bg-charcoal/20"
                  >
                    {o} <X className="h-3 w-3" />
                  </button>
                ))}
                {grassFedOnly && (
                  <button
                    onClick={() => setGrassFedOnly(false)}
                    className="inline-flex items-center gap-1 rounded-full bg-charcoal/10 px-3 py-1 text-xs font-semibold hover:bg-charcoal/20"
                  >
                    Grass-fed <X className="h-3 w-3" />
                  </button>
                )}
                {inStockOnly && (
                  <button
                    onClick={() => setInStockOnly(false)}
                    className="inline-flex items-center gap-1 rounded-full bg-charcoal/10 px-3 py-1 text-xs font-semibold hover:bg-charcoal/20"
                  >
                    In stock <X className="h-3 w-3" />
                  </button>
                )}
                {priceRange && (
                  <button
                    onClick={() => setPriceRange(null)}
                    className="inline-flex items-center gap-1 rounded-full bg-charcoal/10 px-3 py-1 text-xs font-semibold hover:bg-charcoal/20"
                  >
                    AED {priceRange[0]}–{priceRange[1]} <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-24 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading collection…
              </div>
            ) : error ? (
              <div className="py-16 text-center text-destructive">Failed to load collection.</div>
            ) : !data ? (
              <div className="py-16 text-center text-muted-foreground">Collection not found.</div>
            ) : (
              <ProductGrid
                products={sorted}
                emptyMessage={
                  activeFilterCount > 0
                    ? "No products match these filters. Try clearing some."
                    : "No products in this collection yet."
                }
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
