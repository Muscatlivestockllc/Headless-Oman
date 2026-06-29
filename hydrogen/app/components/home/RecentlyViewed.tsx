import { useQuery } from "@tanstack/react-query";
import {
  storefrontApiRequest,
  PRODUCTS_QUERY,
  type ShopifyProduct,
} from "@/lib/shopify";
import { useRecentlyViewed } from "@/stores/recentlyViewedStore";
import { useLocaleStore } from "@/stores/localeStore";
import { ProductCard } from "@/components/product/ProductCard";
import { SectionHeader } from "./FeaturedCollections";

interface RecentlyViewedProps {
  excludeHandle?: string;
}

export function RecentlyViewed({ excludeHandle }: RecentlyViewedProps = {}) {
  const allHandles = useRecentlyViewed((s) => s.handles);
  const handles = excludeHandle ? allHandles.filter((h) => h !== excludeHandle) : allHandles;
  const locale = useLocaleStore((s) => s.locale);
  const language = locale === "ar" ? "AR" : "EN";

  const { data } = useQuery({
    queryKey: ["recently-viewed", handles, locale],
    queryFn: async () => {
      if (handles.length === 0) return [];
      const query = handles.map((h) => `handle:${h}`).join(" OR ");
      const res = await storefrontApiRequest<any>(PRODUCTS_QUERY, {
        first: handles.length,
        query,
        language,
        country: "AE",
      });
      const products: ShopifyProduct[] = (res?.data?.products?.edges ?? [])
        .filter((p: ShopifyProduct) => parseFloat(p.node.priceRange.minVariantPrice.amount) > 0);
      // preserve order
      return handles
        .map((h) => products.find((p) => p.node.handle === h))
        .filter(Boolean) as ShopifyProduct[];
    },
    enabled: handles.length > 0,
  });

  if (!data || data.length === 0) return null;

  return (
    <section className="container mx-auto px-4 py-3 md:py-6">
      <SectionHeader title="Recently Viewed" subtitle="Pick up where you left off" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {data.slice(0, 5).map((p) => (
          <ProductCard key={p.node.id} product={p} />
        ))}
      </div>
    </section>
  );
}
