import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  storefrontApiRequest,
  PRODUCT_BY_HANDLE_QUERY,
  formatPrice,
  getOriginFromTags,
  shopifyImageUrl,
  type ShopifyProductNode,
} from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";
import { useRecentlyViewed } from "@/stores/recentlyViewedStore";
import { useWishlistStore } from "@/stores/wishlistStore";
import { Button } from "@/components/ui/button";
import { OriginBadge } from "@/components/product/OriginBadge";
import { StockBadge } from "@/components/product/StockBadge";
import { Heart, Loader2, Minus, Plus, ShoppingBag, Truck, ShieldCheck, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/products/$handle")({
  component: ProductPage,
  head: ({ params }) => ({
    meta: [
      { title: `${params.handle.replace(/-/g, " ")} — MLS` },
    ],
  }),
});

function ProductPage() {
  const { handle } = Route.useParams();
  const addItem = useCartStore((s) => s.addItem);
  const isLoading = useCartStore((s) => s.isLoading);
  const trackView = useRecentlyViewed((s) => s.add);
  const wishlisted = useWishlistStore((s) => s.has(handle));
  const toggleWishlist = useWishlistStore((s) => s.toggle);

  const { data, isLoading: loadingProduct } = useQuery({
    queryKey: ["product", handle],
    queryFn: async () => {
      const res = await storefrontApiRequest<any>(PRODUCT_BY_HANDLE_QUERY, { handle });
      return res?.data?.product as ShopifyProductNode | null;
    },
  });

  useEffect(() => {
    if (data?.handle) trackView(data.handle);
  }, [data?.handle, trackView]);

  const variants = useMemo(
    () => data?.variants.edges.map((e) => e.node) ?? [],
    [data]
  );
  const firstAvailable = variants.find((v) => v.availableForSale) ?? variants[0];

  // Per-option selection map: { "Size": "500g", "Rubs": "Garlic" }
  const [selectedOpts, setSelectedOpts] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!firstAvailable) return;
    const initial: Record<string, string> = {};
    firstAvailable.selectedOptions.forEach((o) => (initial[o.name] = o.value));
    setSelectedOpts(initial);
  }, [firstAvailable]);

  // Resolve currently matched variant from selected option values.
  const selected =
    variants.find((v) =>
      v.selectedOptions.every((o) => selectedOpts[o.name] === o.value)
    ) ?? firstAvailable;

  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const images = data?.images.edges.map((e) => e.node) ?? [];

  const origin = useMemo(() => getOriginFromTags(data?.tags ?? []), [data?.tags]);

  if (loadingProduct) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading product…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <h1 className="font-display text-2xl">Product not found</h1>
        <Link to="/" className="mt-4 inline-block text-crimson hover:underline">
          ← Back home
        </Link>
      </div>
    );
  }

  const handleAdd = async () => {
    if (!selected) return;
    await addItem({
      product: { node: data },
      variantId: selected.id,
      variantTitle: selected.title,
      price: selected.price,
      quantity: qty,
      selectedOptions: selected.selectedOptions || [],
    });
    toast.success("Added to cart", { description: `${data.title} • ${selected.title}` });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-4 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-crimson">Home</Link> /{" "}
        {data.productType && <span>{data.productType} / </span>}
        <span className="text-foreground">{data.title}</span>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Gallery */}
        <div>
          <div className="relative aspect-square overflow-hidden rounded-md bg-muted">
            {images[activeImg] && (
              <img
                src={shopifyImageUrl(images[activeImg].url, 1200)}
                alt={images[activeImg].altText ?? data.title}
                className="h-full w-full object-cover"
              />
            )}
            <div className="absolute left-4 top-4 flex flex-col gap-2">
              <OriginBadge origin={origin} />
            </div>
          </div>
          {images.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {images.map((img, i) => (
                <button
                  key={img.url}
                  onClick={() => setActiveImg(i)}
                  className={cn(
                    "aspect-square overflow-hidden rounded border-2",
                    i === activeImg ? "border-crimson" : "border-transparent"
                  )}
                >
                  <img
                    src={shopifyImageUrl(img.url, 200)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          {data.vendor && (
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-crimson">
              {data.vendor}
            </div>
          )}
          <h1 className="mt-2 font-display text-3xl font-extrabold leading-tight md:text-4xl">
            {data.title}
          </h1>
          <div className="mt-4 flex items-end gap-3">
            <div className="font-display text-3xl font-bold text-crimson">
              {formatPrice(selected?.price.amount ?? "0", selected?.price.currencyCode)}
            </div>
            {selected?.compareAtPrice && (
              <div className="text-base text-muted-foreground line-through">
                {formatPrice(selected.compareAtPrice.amount, selected.compareAtPrice.currencyCode)}
              </div>
            )}
            <StockBadge available={!!selected?.availableForSale} qty={selected?.quantityAvailable ?? null} />
          </div>

          {data.description && (
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {data.description}
            </p>
          )}

          {/* Variant options — independent per option group */}
          {data.options.map((opt) => {
            if (opt.values.length <= 1 || opt.values[0] === "Default Title") return null;
            return (
              <div key={opt.name} className="mt-6">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {opt.name}
                </div>
                <div className="flex flex-wrap gap-2">
                  {opt.values.map((value) => {
                    const isActive = selectedOpts[opt.name] === value;
                    // A value is available if some variant matches the
                    // current selection with this option overridden.
                    const candidate = variants.find(
                      (v) =>
                        v.selectedOptions.find((o) => o.name === opt.name)?.value === value &&
                        v.selectedOptions.every(
                          (o) =>
                            o.name === opt.name ||
                            !selectedOpts[o.name] ||
                            selectedOpts[o.name] === o.value
                        )
                    );
                    const disabled = candidate ? !candidate.availableForSale : true;
                    return (
                      <button
                        key={opt.name + value}
                        onClick={() =>
                          setSelectedOpts((s) => ({ ...s, [opt.name]: value }))
                        }
                        disabled={disabled}
                        className={cn(
                          "rounded border px-4 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "border-crimson bg-crimson text-crimson-foreground"
                            : "border-border bg-card hover:border-crimson",
                          disabled && "cursor-not-allowed opacity-40 line-through"
                        )}
                      >
                        {value}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Quantity + Add */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded border border-border">
              <button
                aria-label="Decrease"
                className="grid h-11 w-11 place-items-center hover:bg-muted"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center font-semibold">{qty}</span>
              <button
                aria-label="Increase"
                className="grid h-11 w-11 place-items-center hover:bg-muted"
                onClick={() => setQty((q) => q + 1)}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <Button
              size="lg"
              onClick={handleAdd}
              disabled={!selected?.availableForSale || isLoading}
              className="h-11 min-w-[180px] flex-1 bg-crimson text-crimson-foreground hover:bg-rich-red"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <ShoppingBag className="mr-2 h-5 w-5" /> Add to Cart
                </>
              )}
            </Button>
            <Button
              size="lg"
              variant="outline"
              aria-label="Wishlist"
              onClick={() => toggleWishlist(data.handle)}
              className="h-11 w-11 flex-shrink-0 px-0"
            >
              <Heart className={cn("h-5 w-5", wishlisted && "fill-crimson text-crimson")} />
            </Button>
          </div>

          {/* Trust strip */}
          <ul className="mt-8 grid grid-cols-3 gap-3 border-t border-border pt-6 text-[11px] md:text-xs">
            <li className="flex flex-col items-center gap-2 text-center">
              <Truck className="h-5 w-5 text-crimson" />
              <span className="leading-tight">Same-day<br className="md:hidden" /> delivery</span>
            </li>
            <li className="flex flex-col items-center gap-2 text-center">
              <ShieldCheck className="h-5 w-5 text-crimson" />
              <span className="leading-tight">100% Halal<br className="md:hidden" /> certified</span>
            </li>
            <li className="flex flex-col items-center gap-2 text-center">
              <RefreshCw className="h-5 w-5 text-crimson" />
              <span className="leading-tight">Quality<br className="md:hidden" /> guarantee</span>
            </li>
          </ul>

          {data.descriptionHtml && (
            <div
              className="prose prose-sm mt-8 max-w-none text-foreground"
              dangerouslySetInnerHTML={{ __html: data.descriptionHtml }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
