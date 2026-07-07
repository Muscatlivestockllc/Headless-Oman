import { Link } from "react-router";
import { useLocalePath } from "@/stores/localeStore";
import { HScroller } from "~/components/home/HScroller";
import { ProductCard } from "~/components/product/ProductCard";
import type { ShopifyProduct } from "@/lib/shopify";

// Product carousel section. Products are fetched in the route loader (by the section's collection
// reference) and passed in. Reuses the brand ProductCard + HScroller so it matches the store.
export function MlsProductCarousel({
  eyebrow,
  heading,
  subheading,
  products,
  collectionHandle,
  showViewAll,
  layout = "carousel",
}: {
  eyebrow?: string | null;
  heading?: string | null;
  subheading?: string | null;
  products: ShopifyProduct[];
  collectionHandle?: string | null;
  showViewAll?: boolean;
  layout?: "carousel" | "grid";
}) {
  const lp = useLocalePath();
  if (products.length === 0) return null;
  const isGrid = layout === "grid";

  return (
    <section id="products" className="py-8 md:py-12">
      <div className="container mx-auto px-4">
        <div className="mb-5 text-center md:mb-7">
          {eyebrow && (
            <div className="mb-1.5 flex items-center justify-center gap-3">
              <span className="h-px w-6 rounded-full bg-gradient-brand" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-crimson">{eyebrow}</span>
              <span className="h-px w-6 rounded-full bg-gradient-brand" />
            </div>
          )}
          {heading && <h2 className="font-display text-xl font-bold tracking-tight md:text-3xl">{heading}</h2>}
          {subheading && <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">{subheading}</p>}
        </div>
      </div>

      {isGrid ? (
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.node.id} product={p} />
            ))}
          </div>
        </div>
      ) : (
        <HScroller innerClassName="px-4 md:px-8">
          {products.map((p) => (
            <div key={p.node.id} className="w-[44vw] flex-shrink-0 snap-start sm:w-[32vw] md:w-[220px]">
              <ProductCard product={p} />
            </div>
          ))}
        </HScroller>
      )}

      {showViewAll && collectionHandle && (
        <div className="container mx-auto mt-6 px-4 text-center">
          <Link to={lp(`/collections/${collectionHandle}`)} className="inline-block text-sm font-semibold text-crimson hover:underline">
            View All →
          </Link>
        </div>
      )}
    </section>
  );
}
