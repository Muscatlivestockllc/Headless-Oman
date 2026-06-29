import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  storefrontApiRequest,
  COLLECTION_PRODUCTS_QUERY,
  type ShopifyProduct,
} from "@/lib/shopify";
import { ProductCard } from "@/components/product/ProductCard";
import { HScroller } from "./HScroller";

interface CategorySectionProps {
  handle: string;
  title: string;
  subtitle?: string;
  count?: number;
}

export function CategorySection({
  handle,
  title,
  subtitle,
  count = 12,
}: CategorySectionProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["collection", handle, count],
    queryFn: async () => {
      const res = await storefrontApiRequest<any>(COLLECTION_PRODUCTS_QUERY, {
        handle,
        first: count,
      });
      const products: ShopifyProduct[] =
        res?.data?.collection?.products?.edges ?? [];
      return products;
    },
  });

  const products = data ?? [];

  return (
    <section className="container mx-auto px-4 py-12">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          {subtitle && (
            <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-crimson">
              {subtitle}
            </div>
          )}
          <h2 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
            {title}
          </h2>
        </div>
        <Link
          to="/collections/$handle"
          params={{ handle }}
          className="text-sm font-semibold text-crimson hover:underline"
        >
          View all →
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-card/50 px-6 py-12 text-center text-muted-foreground">
          No products in this collection yet.
        </div>
      ) : (
        <HScroller>
          {products.map((p) => (
            <div
              key={p.node.id}
              className="w-[46%] flex-shrink-0 snap-start sm:w-[32%] lg:w-[23%] xl:w-[19%]"
            >
              <ProductCard product={p} />
            </div>
          ))}
        </HScroller>
      )}
    </section>
  );
}
