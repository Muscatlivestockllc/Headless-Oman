// Shopify Storefront API client for MLS.
// Token + domain are public (storefront-scoped) and bundled into the client.

import { toast } from "sonner";

export const SHOPIFY_API_VERSION = "2025-07";
export const SHOPIFY_STORE_PERMANENT_DOMAIN = "mls-uae-test-store.myshopify.com";
export const SHOPIFY_STOREFRONT_TOKEN = "73936922b12f6960d20479931fc05c1c";
export const SHOPIFY_STOREFRONT_URL = `https://${SHOPIFY_STORE_PERMANENT_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;

export async function storefrontApiRequest<T = any>(
  query: string,
  variables: Record<string, any> = {}
): Promise<{ data: T } | undefined> {
  const response = await fetch(SHOPIFY_STOREFRONT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (response.status === 402) {
    toast.error("Shopify: Payment required", {
      description:
        "Shopify API access requires an active billing plan. Visit https://admin.shopify.com to upgrade.",
    });
    return;
  }

  if (!response.ok) {
    throw new Error(`Shopify HTTP ${response.status}`);
  }

  const json = await response.json();
  if (json.errors) {
    throw new Error(`Shopify error: ${json.errors.map((e: any) => e.message).join(", ")}`);
  }
  return json;
}

// ---------- Shared types ----------

export interface MoneyV2 {
  amount: string;
  currencyCode: string;
}

export interface ShopifyImage {
  url: string;
  altText: string | null;
  width?: number;
  height?: number;
}

export interface ShopifyVariant {
  id: string;
  title: string;
  price: MoneyV2;
  compareAtPrice?: MoneyV2 | null;
  availableForSale: boolean;
  quantityAvailable?: number | null;
  selectedOptions: Array<{ name: string; value: string }>;
}

export interface ShopifyMetafield {
  key: string;
  value: string;
}

export interface ShopifyProductNode {
  id: string;
  title: string;
  description: string;
  descriptionHtml?: string;
  handle: string;
  tags: string[];
  vendor?: string;
  productType?: string;
  availableForSale: boolean;
  priceRange: { minVariantPrice: MoneyV2; maxVariantPrice: MoneyV2 };
  compareAtPriceRange?: { minVariantPrice: MoneyV2 };
  images: { edges: Array<{ node: ShopifyImage }> };
  variants: { edges: Array<{ node: ShopifyVariant }> };
  options: Array<{ name: string; values: string[] }>;
  metafields?: Array<ShopifyMetafield | null>;
}

export interface ShopifyProduct {
  node: ShopifyProductNode;
}

// ---------- Queries ----------

export const PRODUCT_FRAGMENT = `
  fragment ProductCard on Product {
    id
    title
    description
    handle
    tags
    vendor
    productType
    availableForSale
    priceRange {
      minVariantPrice { amount currencyCode }
      maxVariantPrice { amount currencyCode }
    }
    compareAtPriceRange { minVariantPrice { amount currencyCode } }
    images(first: 4) { edges { node { url altText width height } } }
    variants(first: 20) {
      edges {
        node {
          id
          title
          price { amount currencyCode }
          compareAtPrice { amount currencyCode }
          availableForSale
          selectedOptions { name value }
        }
      }
    }
    options { name values }
  }
`;

export const COLLECTION_PRODUCTS_QUERY = `
  ${PRODUCT_FRAGMENT}
  query CollectionProducts($handle: String!, $first: Int!) {
    collection(handle: $handle) {
      id
      title
      description
      image { url altText }
      products(first: $first) {
        edges { node { ...ProductCard } }
      }
    }
  }
`;

export const PRODUCTS_QUERY = `
  ${PRODUCT_FRAGMENT}
  query Products($first: Int!, $query: String) {
    products(first: $first, query: $query) {
      edges { node { ...ProductCard } }
    }
  }
`;

export const PRODUCT_BY_HANDLE_QUERY = `
  ${PRODUCT_FRAGMENT}
  query ProductByHandle($handle: String!) {
    product(handle: $handle) {
      ...ProductCard
      descriptionHtml
      seo { title description }
    }
  }
`;

export const SEARCH_PRODUCTS_QUERY = `
  ${PRODUCT_FRAGMENT}
  query SearchProducts($query: String!, $first: Int!) {
    products(first: $first, query: $query) {
      edges { node { ...ProductCard } }
    }
  }
`;

// Reels: query products that have video media (tagged "reel" preferred,
// otherwise we filter client-side for products with at least one Video).
export const REELS_QUERY = `
  query Reels($first: Int!, $query: String) {
    products(first: $first, query: $query) {
      edges {
        node {
          id
          title
          handle
          priceRange { minVariantPrice { amount currencyCode } }
          featuredImage { url altText }
          media(first: 5) {
            edges {
              node {
                mediaContentType
                ... on Video {
                  id
                  previewImage { url altText }
                  sources { url mimeType format width height }
                }
                ... on ExternalVideo {
                  id
                  embedUrl
                  previewImage { url altText }
                }
              }
            }
          }
        }
      }
    }
  }
`;

export interface ReelProduct {
  id: string;
  title: string;
  handle: string;
  price: MoneyV2;
  poster: string | null;
  videoUrl: string | null;
  embedUrl: string | null;
}


export function getOriginFromTags(tags: string[] = []): string | null {
  const origins: Record<string, string> = {
    aus: "AUS",
    australia: "AUS",
    australian: "AUS",
    nz: "NZ",
    "new-zealand": "NZ",
    arg: "ARG",
    argentina: "ARG",
    brazil: "BRZ",
    brazilian: "BRZ",
    brz: "BRZ",
    rsa: "ZA",
    za: "ZA",
    "south-africa": "ZA",
    "south-african": "ZA",
    pak: "PAK",
    pakistan: "PAK",
    pakistani: "PAK",
    jp: "JP",
    japan: "JP",
    japanese: "JP",
    us: "USA",
    usa: "USA",
    "united-states": "USA",
    american: "USA",
    netherlands: "NL",
    dutch: "NL",
    nl: "NL",
    "grass-fed": "GRASS-FED",
    grassfed: "GRASS-FED",
  };
  for (const t of tags) {
    const k = t.toLowerCase().trim().replace(/\s+/g, "-");
    if (origins[k]) return origins[k];
  }
  return null;
}

export function formatPrice(amount: string | number, currency = "AED"): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (Number.isNaN(n)) return `${currency} 0`;
  return `${currency} ${n.toFixed(2)}`;
}

export function shopifyImageUrl(url: string, width: number): string {
  if (!url) return url;
  try {
    const u = new URL(url);
    u.searchParams.set("width", String(width));
    return u.toString();
  } catch {
    return url;
  }
}
