import type { LoaderFunctionArgs, MetaFunction } from "@shopify/remix-oxygen";
import { useLoaderData } from "react-router";
import { ShopifySearchView } from "~/lib/shopifyAnalytics";
import { SearchAutosuggest } from "~/components/layout/SearchAutosuggest";
import { ProductCard } from "~/components/product/ProductCard";
import type { ShopifyProduct } from "~/lib/shopify";
import { useT } from "~/i18n/strings";
import { detectLanguage } from "~/lib/locale";
import { fastSimonSearch } from "~/lib/fastsimon";

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

export async function loader({ request, context }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  if (!q) return { q, products: [] as ShopifyProduct[], total: 0 };

  const language = detectLanguage(request);
  const inCtx = { language, country: "OM" as const };
  const sellable = (node: any) =>
    node && parseFloat(node.priceRange?.minVariantPrice?.amount ?? "0") > 0;

  // 1) Fast Simon relevance ranking → hydrate its product IDs through our Storefront API,
  //    keeping Fast Simon's order (nodes() returns results in the same order as the ids).
  const fs = await fastSimonSearch(q, { limit: 24 });
  if (fs) {
    const data = await context.storefront.query(SEARCH_NODES_QUERY, {
      variables: { ids: fs.productIds, ...inCtx },
    });
    const byId = new Map(
      (data?.nodes ?? []).filter(Boolean).map((n: any) => [n.id, n]),
    );
    const products: ShopifyProduct[] = fs.productIds
      .map((id) => byId.get(id))
      .filter(sellable)
      .map((node: any) => ({ node }));
    if (products.length) return { q, products, total: fs.total };
  }

  // 2) Fallback: native Shopify search (Fast Simon down, timed out, or no matches).
  const data = await context.storefront.query(SEARCH_QUERY, {
    variables: { query: q, first: 24, ...inCtx },
  });
  const products: ShopifyProduct[] = (data?.search?.nodes ?? [])
    .filter(sellable)
    .map((node: any) => ({ node }));
  return { q, products, total: products.length };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: data?.q ? `Search: "${data.q}" — MLS` : "Search — MLS" },
];

export default function Search() {
  const { q, products, total } = useLoaderData<typeof loader>();
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
