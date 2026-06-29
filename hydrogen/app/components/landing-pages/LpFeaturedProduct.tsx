import { useState } from "react";
import { Link, useFetcher } from "react-router";

interface Variant {
  id: string;
  title: string;
  availableForSale: boolean;
  price: { amount: string; currencyCode: string };
  compareAtPrice: { amount: string; currencyCode: string } | null;
}

interface ProductData {
  id: string;
  title: string;
  handle: string;
  featuredImage: { url: string; altText: string | null } | null;
  variants: Variant[];
}

function formatPrice(amount: string, currency: string) {
  return new Intl.NumberFormat("en-AE", { style: "currency", currency }).format(parseFloat(amount));
}

export function LpFeaturedProduct({ product }: { product: ProductData }) {
  const [selectedVariant, setSelectedVariant] = useState<Variant>(product.variants[0]);
  const fetcher = useFetcher();
  const adding = fetcher.state !== "idle";

  const hasMultipleVariants = product.variants.length > 1;
  const hasDiscount =
    selectedVariant.compareAtPrice &&
    parseFloat(selectedVariant.compareAtPrice.amount) > parseFloat(selectedVariant.price.amount);

  return (
    <section className="py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-2 md:gap-12 items-center">
          {/* Image */}
          {product.featuredImage && (
            <Link to={`/products/${product.handle}`}>
              <div className="overflow-hidden rounded-xl border border-border bg-muted aspect-square">
                <img
                  src={product.featuredImage.url}
                  alt={product.featuredImage.altText ?? product.title}
                  className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                />
              </div>
            </Link>
          )}

          {/* Info */}
          <div className="flex flex-col gap-4">
            <h2 className="font-display text-2xl font-extrabold md:text-3xl">{product.title}</h2>

            <div className="flex items-baseline gap-3">
              <span className="text-xl font-bold text-crimson">
                {formatPrice(selectedVariant.price.amount, selectedVariant.price.currencyCode)}
              </span>
              {hasDiscount && (
                <span className="text-sm text-muted-foreground line-through">
                  {formatPrice(selectedVariant.compareAtPrice!.amount, selectedVariant.compareAtPrice!.currencyCode)}
                </span>
              )}
            </div>

            <p className="text-xs text-muted-foreground">Tax included, shipping and discounts calculated at checkout.</p>

            {hasMultipleVariants && (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold">Size</p>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(v)}
                      disabled={!v.availableForSale}
                      className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                        selectedVariant.id === v.id
                          ? "border-crimson bg-crimson text-white"
                          : "border-border bg-background text-foreground hover:border-crimson"
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      {v.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <fetcher.Form method="post" action="/cart">
              <input type="hidden" name="cartAction" value="ADD_TO_CART" />
              <input type="hidden" name="lines" value={JSON.stringify([{ merchandiseId: selectedVariant.id, quantity: 1 }])} />
              <button
                type="submit"
                disabled={adding || !selectedVariant.availableForSale}
                className="w-full rounded-lg bg-crimson py-3 text-sm font-bold text-white transition-colors hover:bg-rich-red disabled:opacity-60"
              >
                {adding ? "Adding…" : selectedVariant.availableForSale ? "Add to cart" : "Out of stock"}
              </button>
            </fetcher.Form>
          </div>
        </div>
      </div>
    </section>
  );
}
