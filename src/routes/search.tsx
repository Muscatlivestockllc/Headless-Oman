import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Search } from "lucide-react";
import {
  storefrontApiRequest,
  SEARCH_PRODUCTS_QUERY,
  type ShopifyProduct,
} from "@/lib/shopify";
import { ProductGrid } from "@/components/product/ProductGrid";

const searchSchema = z.object({ q: z.string().optional() });

export const Route = createFileRoute("/search")({
  validateSearch: (s) => searchSchema.parse(s),
  component: SearchPage,
  head: () => ({ meta: [{ title: "Search — MLS" }] }),
});

function SearchPage() {
  const { q = "" } = Route.useSearch();

  const { data, isLoading } = useQuery({
    queryKey: ["search", q],
    queryFn: async () => {
      if (!q) return [];
      const res = await storefrontApiRequest<any>(SEARCH_PRODUCTS_QUERY, {
        first: 40,
        query: q,
      });
      const products: ShopifyProduct[] = res?.data?.products?.edges ?? [];
      return products;
    },
    enabled: !!q,
  });

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-8 flex items-center gap-3">
        <Search className="h-6 w-6 text-crimson" />
        <h1 className="font-display text-3xl font-extrabold">
          {q ? `Results for “${q}”` : "Search"}
        </h1>
      </div>
      {!q ? (
        <p className="text-muted-foreground">Use the header search to find products.</p>
      ) : isLoading ? (
        <p className="text-muted-foreground">Searching…</p>
      ) : (
        <ProductGrid products={data ?? []} emptyMessage={`No matches for “${q}”.`} />
      )}
    </div>
  );
}
