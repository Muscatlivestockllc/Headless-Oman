import { useQuery } from "@tanstack/react-query";
import {
  storefrontApiRequest,
  PRODUCTS_QUERY,
  type ShopifyProduct,
} from "@/lib/shopify";
import { useRecentlyViewed } from "@/stores/recentlyViewedStore";
import { ProductCard } from "@/components/product/ProductCard";
import { SectionHeader } from "./FeaturedCollections";

export function RecentlyViewed() {
  const handles = useRecentlyViewed((s) => s.handles);

  const { data } = useQuery({
    queryKey: ["recently-viewed", handles],
    queryFn: async () => {
      if (handles.length === 0) return [];
      const query = handles.map((h) => `handle:${h}`).join(" OR ");
      const res = await storefrontApiRequest<any>(PRODUCTS_QUERY, {
        first: handles.length,
        query,
      });
      const products: ShopifyProduct[] = res?.data?.products?.edges ?? [];
      // preserve order
      return handles
        .map((h) => products.find((p) => p.node.handle === h))
        .filter(Boolean) as ShopifyProduct[];
    },
    enabled: handles.length > 0,
  });

  if (!data || data.length === 0) return null;

  return (
    <section className="container mx-auto px-4 py-12">
      <SectionHeader title="Recently Viewed" subtitle="Pick up where you left off" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {data.slice(0, 5).map((p) => (
          <ProductCard key={p.node.id} product={p} />
        ))}
      </div>
    </section>
  );
}
