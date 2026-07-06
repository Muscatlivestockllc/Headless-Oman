// MLS landing-page builder (mls_* system) — shared logic used by pages.$handle.tsx.
//
// A Shopify page becomes a landing page purely by assigning its `custom.landing_page` metafield
// (a metaobject reference to an mls_landing_page) in admin. No per-page code, no routes.ts edits.
// pages.$handle.tsx calls loadLandingSections() first; if it returns sections, it renders
// <MlsLandingSections> instead of the normal page body.

import { applyArImages } from "~/lib/arImages";
import type { ShopifyProduct } from "@/lib/shopify";
import { MlsHero } from "~/components/mls-landing/MlsHero";
import { MlsIcons } from "~/components/mls-landing/MlsIcons";
import { MlsMessage } from "~/components/mls-landing/MlsMessage";
import { MlsCardGrid } from "~/components/mls-landing/MlsCardGrid";
import { MlsProductCarousel } from "~/components/mls-landing/MlsProductCarousel";
import { MlsReels } from "~/components/mls-landing/MlsReels";
import { MlsFeatureCards } from "~/components/mls-landing/MlsFeatureCards";
import { MlsMediaShowcase } from "~/components/mls-landing/MlsMediaShowcase";
import { MlsComparison } from "~/components/mls-landing/MlsComparison";
import { MlsPromoBanner } from "~/components/mls-landing/MlsPromoBanner";
import { MlsReviews } from "~/components/mls-landing/MlsReviews";
import { MlsAwards } from "~/components/mls-landing/MlsAwards";
import { MlsFeaturePanel } from "~/components/mls-landing/MlsFeaturePanel";
import { MlsProcess } from "~/components/mls-landing/MlsProcess";
import { MlsFeaturedProducts } from "~/components/mls-landing/MlsFeaturedProducts";
import { fieldMap, str, num, collectionHandle, listNodes } from "~/components/mls-landing/fields";

const PRODUCT_FRAGMENT = `#graphql
  fragment MlsLpProductCard on Product {
    id title description handle tags vendor productType availableForSale
    priceRange { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }
    compareAtPriceRange { minVariantPrice { amount currencyCode } }
    images(first: 4) { edges { node { url altText width height } } }
    variants(first: 100) {
      edges { node {
        id title price { amount currencyCode } compareAtPrice { amount currencyCode }
        availableForSale quantityAvailable selectedOptions { name value }
      } }
    }
    options { name values }
    metafields(identifiers: [
      { namespace: "reviews", key: "rating" }
      { namespace: "reviews", key: "rating_count" }
    ]) { key value }
  }
`;

// page → custom.landing_page → mls_landing_page → sections (+ nested child items).
export const MLS_LANDING_QUERY = `#graphql
  query MlsLanding($handle: String!, $language: LanguageCode, $country: CountryCode)
  @inContext(language: $language, country: $country) {
    page(handle: $handle) {
      title
      seo { title description }
      metafield(namespace: "custom", key: "landing_page") {
        reference {
          ... on Metaobject {
            type handle
            fields { key value }
            sections: field(key: "sections") {
              references(first: 30) {
                nodes {
                  ... on Metaobject {
                    id type handle
                    fields {
                      key value type
                      reference {
                        ... on MediaImage { image { url altText } }
                        ... on Collection { handle title }
                      }
                      references(first: 30) {
                        nodes {
                          # Direct product references (mls_section_featured_products.products list)
                          ... on Product { handle }
                          ... on Metaobject {
                            id type handle
                            fields {
                              key value type
                              reference {
                                ... on MediaImage { image { url altText } }
                                ... on Collection { handle title }
                                ... on Video { sources { url mimeType } previewImage { url altText } }
                                ... on GenericFile { url }
                                ... on Product {
                                  id title handle
                                  featuredImage { url altText }
                                  priceRange { minVariantPrice { amount currencyCode } }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
` as const;

const COLLECTION_PRODUCTS_QUERY = `#graphql
  ${PRODUCT_FRAGMENT}
  query MlsLpCollProducts($handle: String!, $first: Int!, $language: LanguageCode, $country: CountryCode)
  @inContext(language: $language, country: $country) {
    collection(handle: $handle) { products(first: $first) { nodes { ...MlsLpProductCard } } }
  }
` as const;

// Exact-handle lookup (Storefront `products(query:"handle:..")` is fuzzy, so use product(handle:)).
const PRODUCT_BY_HANDLE_QUERY = `#graphql
  ${PRODUCT_FRAGMENT}
  query MlsLpProductByHandle($handle: String!, $language: LanguageCode, $country: CountryCode)
  @inContext(language: $language, country: $country) {
    product(handle: $handle) { ...MlsLpProductCard }
  }
` as const;

function toShopifyProduct(node: any): ShopifyProduct {
  return {
    node: {
      ...node,
      images: node.images ?? { edges: [] },
      variants: node.variants ?? { edges: [] },
      options: node.options ?? [],
      metafields: node.metafields ?? [],
    },
  };
}

export interface MlsLandingData {
  sections: any[];
  productsByCollection: Record<string, ShopifyProduct[]>;
  productsByHandle: Record<string, ShopifyProduct>;
  seo: { title: string | null; description: string | null };
  theme: "light" | "dark";
}

// Returns null when the page has no custom.landing_page metafield (→ not a landing page).
export async function loadLandingSections(
  context: any,
  handle: string,
  language: "AR" | "EN"
): Promise<MlsLandingData | null> {
  const data = await context.storefront.query(MLS_LANDING_QUERY, {
    variables: { handle, language, country: "OM" as const },
    cache: context.storefront.CacheShort(),
  });

  const landing = data.page?.metafield?.reference;
  if (!landing) return null;

  const sections: any[] = landing.sections?.references?.nodes ?? [];
  if (sections.length === 0) return null;

  if (language === "AR") applyArImages(sections);

  // Prefetch products for each product-carousel section.
  const carouselHandles = new Set<string>();
  for (const s of sections) {
    if (s.type === "mls_section_product_carousel") {
      const h = collectionHandle(fieldMap(s), "collection");
      if (h) carouselHandles.add(h);
    }
  }
  const productsByCollection: Record<string, ShopifyProduct[]> = {};
  await Promise.all(
    Array.from(carouselHandles).map(async (h) => {
      const first =
        sections
          .filter((s) => s.type === "mls_section_product_carousel")
          .map((s) => num(fieldMap(s), "max_products"))
          .find((n) => n && n > 0) ?? 12;
      const r = await context.storefront.query(COLLECTION_PRODUCTS_QUERY, {
        variables: { handle: h, first, language, country: "OM" as const },
        cache: context.storefront.CacheShort(),
      });
      productsByCollection[h] = (r.collection?.products?.nodes ?? []).map(toShopifyProduct);
    })
  );

  // Prefetch full products for featured-products sections (by handle — refs only carry basic fields).
  const featuredHandles = new Set<string>();
  for (const s of sections) {
    if (s.type === "mls_section_featured_products") {
      const nodes = fieldMap(s)["products"]?.references?.nodes ?? [];
      for (const p of nodes) if (p?.handle) featuredHandles.add(p.handle);
    }
  }
  const productsByHandle: Record<string, ShopifyProduct> = {};
  await Promise.all(
    Array.from(featuredHandles).map(async (h) => {
      const r = await context.storefront.query(PRODUCT_BY_HANDLE_QUERY, {
        variables: { handle: h, language, country: "OM" as const },
        cache: context.storefront.CacheShort(),
      });
      if (r.product) productsByHandle[h] = toShopifyProduct(r.product);
    })
  );

  const theme = landing.fields?.find((f: any) => f.key === "theme")?.value === "dark" ? "dark" : "light";

  return {
    sections,
    productsByCollection,
    productsByHandle,
    seo: {
      title: landing.fields?.find((f: any) => f.key === "seo_title")?.value ?? data.page.seo?.title ?? data.page.title ?? null,
      description: landing.fields?.find((f: any) => f.key === "seo_description")?.value ?? data.page.seo?.description ?? null,
    },
    theme: theme as "light" | "dark",
  };
}

// ── Renderer ──────────────────────────────────────────────────────────────────
function renderSection(
  node: any,
  productsByCollection: Record<string, ShopifyProduct[]>,
  productsByHandle: Record<string, ShopifyProduct>,
  key: string,
) {
  switch (node.type) {
    case "mls_section_hero":
      return <MlsHero key={key} node={node} />;
    case "mls_section_icons":
      return <MlsIcons key={key} node={node} />;
    case "mls_section_message":
      return <MlsMessage key={key} node={node} />;
    case "mls_section_card_grid":
      return <MlsCardGrid key={key} node={node} />;
    case "mls_section_product_carousel": {
      const fm = fieldMap(node);
      const h = collectionHandle(fm, "collection");
      const layout = str(fm, "layout") === "grid" ? "grid" : "carousel";
      return (
        <MlsProductCarousel
          key={key}
          eyebrow={str(fm, "eyebrow")}
          heading={str(fm, "heading")}
          subheading={str(fm, "subheading")}
          products={h ? productsByCollection[h] ?? [] : []}
          collectionHandle={h}
          showViewAll={fm["show_view_all"]?.value === "true"}
          layout={layout}
        />
      );
    }
    case "mls_section_reels":
      return <MlsReels key={key} node={node} />;
    case "mls_section_feature_cards":
      return <MlsFeatureCards key={key} node={node} />;
    case "mls_section_media_showcase":
      return <MlsMediaShowcase key={key} node={node} />;
    case "mls_section_comparison":
      return <MlsComparison key={key} node={node} />;
    case "mls_section_promo_banner":
      return <MlsPromoBanner key={key} node={node} />;
    case "mls_section_reviews":
      return <MlsReviews key={key} node={node} />;
    case "mls_section_awards":
      return <MlsAwards key={key} node={node} />;
    case "mls_section_feature_panel":
      return <MlsFeaturePanel key={key} node={node} />;
    case "mls_section_process":
      return <MlsProcess key={key} node={node} />;
    case "mls_section_featured_products": {
      const fm = fieldMap(node);
      const refNodes = listNodes(fm, "products");
      const products = refNodes
        .map((r: any) => productsByHandle[r?.handle])
        .filter((p): p is ShopifyProduct => !!p);
      return <MlsFeaturedProducts key={key} heading={str(fm, "heading")} products={products} />;
    }
    default:
      return null;
  }
}

export function MlsLandingSections({
  sections,
  productsByCollection,
  productsByHandle = {},
  theme = "light",
}: {
  sections: any[];
  productsByCollection: Record<string, ShopifyProduct[]>;
  productsByHandle?: Record<string, ShopifyProduct>;
  theme?: "light" | "dark";
}) {
  // Dark theme: flip the section-level CSS variables that our components consume
  // (bg-background/text-foreground/bg-card/etc.) to charcoal+light values. This recolors
  // ALL sections without per-component changes. Gold/crimson accents stay as-is.
  const darkVars = {
    ["--background" as any]: "oklch(0.16 0.005 240)",
    ["--foreground" as any]: "oklch(0.97 0.005 80)",
    ["--card" as any]: "oklch(0.21 0.006 240)",
    ["--card-foreground" as any]: "oklch(0.97 0.005 80)",
    ["--muted" as any]: "oklch(0.26 0.006 240)",
    ["--muted-foreground" as any]: "oklch(0.72 0.01 80)",
    ["--border" as any]: "oklch(0.30 0.006 240)",
    ["--bone" as any]: "oklch(0.19 0.006 240)",
  } as React.CSSProperties;

  return (
    <div
      className="min-h-screen bg-background text-foreground"
      style={theme === "dark" ? darkVars : undefined}
    >
      {sections.map((s: any, i: number) => renderSection(s, productsByCollection, productsByHandle, s.id ?? `s-${i}`))}
    </div>
  );
}
