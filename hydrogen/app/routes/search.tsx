import type { LoaderFunctionArgs, MetaFunction } from "@shopify/remix-oxygen";
import { useLoaderData } from "react-router";
import { ShopifySearchView } from "~/lib/shopifyAnalytics";
import { SearchAutosuggest } from "~/components/layout/SearchAutosuggest";
import { ProductCard } from "~/components/product/ProductCard";
import type { ShopifyProduct } from "~/lib/shopify";
import { useT } from "~/i18n/strings";
import { detectLanguage } from "~/lib/locale";
import { fastSimonSearch } from "~/lib/fastsimon";
import { isJunk, isRedirected } from "~/lib/searchFilters";

// Shared card fields, used by both native search and the Fast Simon hydration query.
const SEARCH_PRODUCT_FRAGMENT = `#graphql
  fragment SearchProduct on Product {
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
    variants(first: 100) {
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
    metafields(identifiers: [
      {namespace: "reviews", key: "rating"}
      {namespace: "reviews", key: "rating_count"}
    ]) { key value }
  }
`;

// Native Shopify search — used as the fallback when Fast Simon is unavailable.
const SEARCH_QUERY = `#graphql
  ${SEARCH_PRODUCT_FRAGMENT}
  query Search(
    $query: String!
    $first: Int!
    $language: LanguageCode
    $country: CountryCode
  ) @inContext(language: $language, country: $country) {
    search(query: $query, first: $first, types: [PRODUCT]) {
      totalCount
      nodes {
        ... on Product { ...SearchProduct }
      }
    }
  }
` as const;

// Hydrate Fast Simon's ranked product IDs into full card data. nodes() preserves input order,
// so Fast Simon's relevance ranking is kept.
const SEARCH_NODES_QUERY = `#graphql
  ${SEARCH_PRODUCT_FRAGMENT}
  query SearchNodes(
    $ids: [ID!]!
    $language: LanguageCode
    $country: CountryCode
  ) @inContext(language: $language, country: $country) {
    nodes(ids: $ids) {
      ... on Product { ...SearchProduct }
    }
  }
` as const;

// Native predictiveSearch — true as-you-type PREFIX matching, so half-typed words like
// "whole car" match "Whole Carcass" (Fast Simon's full-text endpoint only matches whole words).
const SEARCH_PREDICTIVE_QUERY = `#graphql
  ${SEARCH_PRODUCT_FRAGMENT}
  query SearchPredictive(
    $query: String!
    $language: LanguageCode
    $country: CountryCode
  ) @inContext(language: $language, country: $country) {
    predictiveSearch(query: $query, limit: 10, types: [PRODUCT]) {
      products { ...SearchProduct }
    }
  }
` as const;

export async function loader({ request, context }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  if (!q) return { q, products: [] as ShopifyProduct[], total: 0, correctedTerm: null as string | null };

  const language = detectLanguage(request);
  const inCtx = { language, country: "OM" as const };
  const clean = (node: any) =>
    node &&
    parseFloat(node.priceRange?.minVariantPrice?.amount ?? "0") > 0 &&
    !isJunk(node.title) &&
    !isRedirected("products", node.handle);

  // Fast Simon ranking (whole words) → hydrate full card data, order preserved.
  let fsNodes: any[] = [];
  let correctedTerm: string | null = null;
  const fs = await fastSimonSearch(q, { limit: 24 });
  // Did Fast Simon drop a half-typed last word? (its matched term is a prefix of the query)
  const truncated = !!(fs?.correctedTerm && q.toLowerCase().startsWith(fs.correctedTerm.toLowerCase() + " "));
  if (fs) {
    const data = await context.storefront.query(SEARCH_NODES_QUERY, {
      variables: { ids: fs.productIds, ...inCtx },
    });
    const byId = new Map((data?.nodes ?? []).filter(Boolean).map((n: any) => [n.id, n]));
    fsNodes = fs.productIds.map((id) => byId.get(id)).filter(Boolean);
    correctedTerm = truncated ? null : (fs.correctedTerm ?? null);
  }

  // Native predictiveSearch — prefix matching so half-typed words match.
  let nativeNodes: any[] = [];
  try {
    const data = await context.storefront.query(SEARCH_PREDICTIVE_QUERY, {
      variables: { query: q, ...inCtx },
    });
    nativeNodes = data?.predictiveSearch?.products ?? [];
  } catch {
    /* prefix results are best-effort */
  }

  // Merge: partial-word truncation → native prefix matches lead; else Fast Simon's ranking leads.
  const seen = new Set<string>();
  let nodes = (truncated ? [...nativeNodes, ...fsNodes] : [...fsNodes, ...nativeNodes]).filter((n: any) => {
    if (!n || seen.has(n.id)) return false;
    seen.add(n.id);
    return clean(n);
  });

  // Final fallback: native full-text search if the hybrid found nothing.
  if (!nodes.length) {
    const data = await context.storefront.query(SEARCH_QUERY, {
      variables: { query: q, first: 24, ...inCtx },
    });
    nodes = (data?.search?.nodes ?? []).filter(clean);
  }

  const products: ShopifyProduct[] = nodes.map((node: any) => ({ node }));
  return { q, products, total: products.length, correctedTerm };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: data?.q ? `Search: "${data.q}" — MLS` : "Search — MLS" },
];

export default function Search() {
  const { q, products, total, correctedTerm } = useLoaderData<typeof loader>();
  const t = useT();

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Shopify search_viewed → search analytics (top searches). Direct sender; the built-in
          <Analytics.SearchView> silently no-ops behind its hasUserConsent gate. */}
      {q && <ShopifySearchView searchTerm={q} />}
      <div className="mb-8">
        <h1 className="mb-4 font-display text-2xl font-extrabold md:text-3xl">
          {q ? (
            <>{t("search.results_for")} <span className="text-crimson">&ldquo;{q}&rdquo;</span></>
          ) : (
            t("search.heading")
          )}
        </h1>
        <div className="max-w-xl">
          <SearchAutosuggest defaultQuery={q} />
        </div>
      </div>

      {correctedTerm && correctedTerm.toLowerCase() !== q.toLowerCase() && (
        <p className="mb-2 text-sm text-muted-foreground">
          {t("search.showing_for")}{" "}
          <span className="font-semibold text-crimson">&ldquo;{correctedTerm}&rdquo;</span>
        </p>
      )}

      {q && (
        <p className="mb-6 text-sm text-muted-foreground">
          {total === 0
            ? t("search.no_products")
            : `${total} ${total !== 1 ? t("search.products_found") : t("search.product_found")}`}
        </p>
      )}

      {products.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.node.id} product={product} />
          ))}
        </div>
      ) : q ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-lg font-semibold">{t("search.no_results_for")} &ldquo;{q}&rdquo;</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("search.try_different")}
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
          <p>{t("search.type_something")}</p>
        </div>
      )}
    </main>
  );
}
