import { ProductCard } from "./ProductCard";
import type { ShopifyProduct } from "@/lib/shopify";

interface ProductGridProps {
  products: ShopifyProduct[];
  emptyMessage?: string;
}

export function ProductGrid({ products, emptyMessage = "No products found" }: ProductGridProps) {
  if (!products || products.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-card/50 px-6 py-16 text-center text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((p) => (
        <ProductCard key={p.node.id} product={p} />
      ))}
    </div>
  );
}
