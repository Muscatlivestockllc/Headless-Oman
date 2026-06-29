import { Link } from "react-router";
import { ProductCard } from "~/components/product/ProductCard";
import { HScroller } from "~/components/home/HScroller";
import type { ShopifyProduct } from "@/lib/shopify";

function getField(fields: any[], key: string): string | null {
  return fields?.find((f: any) => f.key === key)?.value ?? null;
}

export function LpProductGridSection({
  fields,
  products,
  collectionHandle,
}: {
  fields: any[];
  products: ShopifyProduct[];
  collectionHandle?: string | null;
}) {
  if (products.length === 0) return null;

  const heading = getField(fields, "heading");
  const subheading = getField(fields, "subheading");
  const ctaText = getField(fields, "cta_text");
  const ctaUrl = getField(fields, "cta_url");
  const sectionId = "products";

  // Fall back to the linked collection's title if no custom heading is set
  const collectionTitle =
    fields.find((f: any) => f.key === "grid_collection_2")?.reference?.title ??
    fields.find((f: any) => f.key === "grid_collection")?.reference?.title ??
    fields.find((f: any) => f.key === "collection_ref")?.reference?.title ??
    fields.find((f: any) => f.key === "collection")?.reference?.title ??
    fields.find((f: any) => f.reference?.title)?.reference?.title ??
    null;
  const displayHeading = heading ?? collectionTitle;

  return (
    <section id={sectionId} className="py-12">
      <div className="container mx-auto px-4">
        {(displayHeading || subheading) && (
          <div className="mb-6 text-center">
            {displayHeading && (
              <h2 className="font-display text-2xl font-extrabold md:text-3xl">{displayHeading}</h2>
            )}
            {subheading && (
              <p className="mt-1 text-sm text-muted-foreground">{subheading}</p>
            )}
          </div>
        )}
        <HScroller>
          {products.map((p) => (
            <div
              key={p.node.id}
              className="w-[44%] flex-shrink-0 snap-start sm:w-[32%] lg:w-[23%] xl:w-[19%]"
            >
              <ProductCard product={p} />
            </div>
          ))}
        </HScroller>
        {(ctaText && ctaUrl) ? (
          <div className="mt-6 text-center">
            <Link to={ctaUrl} className="inline-block text-sm font-semibold text-crimson hover:underline">
              {ctaText} →
            </Link>
          </div>
        ) : collectionHandle ? (
          <div className="mt-6 text-center">
            <Link to={`/collections/${collectionHandle}`} className="inline-block text-sm font-semibold text-crimson hover:underline">
              View All →
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}