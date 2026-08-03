import type { LoaderFunctionArgs } from "@shopify/remix-oxygen";
import { fastSimonSearch } from "~/lib/fastsimon";
import { detectLanguage } from "~/lib/locale";
import { REDIRECTS } from "~/lib/redirects";

// Keep test/draft/duplicate content out of search. The Storefront API already excludes true drafts,
// so this handles published-but-not-customer-facing items: "TEST ...", "... copy", and anything we
// 301-redirect away as a duplicate (reusing the redirects map).
const isJunk = (title?: string | null) => {
  const s = (title ?? "").trim();
  return !s || s.startsWith("[") || /\b(test|draft|copy|demo|dummy)\b/i.test(s);
};
const isRedirected = (kind: "pages" | "collections" | "products", handle?: string | null) =>
  !!handle && !!REDIRECTS[`/${kind}/${handle}`];

// Unified autosuggest source: products ranked by Fast Simon (hydrated through our Storefront API),
// plus pages / blog articles / collections from the native Storefront predictiveSearch (Fast Simon
// only indexes products). One request per keystroke; the client renders the sections.

const PRODUCT_FIELDS = `#graphql
  fragment SuggestProduct on Product {
    id
    title
    handle
    availableForSale
    priceRange { minVariantPrice { amount currencyCode } }
    compareAtPriceRange { minVariantPrice { amount currencyCode } }
    images(first: 1) { edges { node { url altText } } }
  }
`;

// Hydrate Fast Simon's ranked product IDs (order preserved by nodes()).
const PRODUCTS_BY_ID_QUERY = `#graphql
  ${PRODUCT_FIELDS}
  query SuggestProductsById($ids: [ID!]!, $language: LanguageCode, $country: CountryCode)
  @inContext(language: $language, country: $country) {
    nodes(ids: $ids) { ... on Product { ...SuggestProduct } }
  }
` as const;

// Native product fallback (when Fast Simon is unavailable).
const PRODUCTS_FALLBACK_QUERY = `#graphql
  ${PRODUCT_FIELDS}
  query SuggestProductsFallback($query: String!, $language: LanguageCode, $country: CountryCode)
  @inContext(language: $language, country: $country) {
    predictiveSearch(query: $query, limit: 6, types: [PRODUCT]) {
      products { ...SuggestProduct }
    }
  }
` as const;

// Pages / articles / collections — native predictiveSearch (Fast Simon doesn't index these).
const CONTENT_QUERY = `#graphql
  query SuggestContent($query: String!, $language: LanguageCode, $country: CountryCode)
  @inContext(language: $language, country: $country) {
    predictiveSearch(query: $query, limit: 4, types: [PAGE, ARTICLE, COLLECTION]) {
      pages { title handle }
      articles { title handle blog { handle } image { url altText } }
      collections { title handle image { url altText } }
    }
  }
` as const;

export async function loader({ request, context }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const empty = { products: [], pages: [], articles: [], collections: [] };
  if (q.length < 2) return Response.json(empty);

  const language = detectLanguage(request);
  const inCtx = { language, country: "OM" as const };
  const sellable = (p: any) => parseFloat(p?.priceRange?.minVariantPrice?.amount ?? "0") > 0;

  // ── Products: Fast Simon ranking → hydrate; fall back to native predictive search ──
  let products: any[] = [];
  let correctedTerm: string | null = null;
  const fs = await fastSimonSearch(q, { limit: 6 });
  if (fs) {
    correctedTerm = fs.correctedTerm ?? null;
    const d: any = await context.storefront.query(PRODUCTS_BY_ID_QUERY, {
      variables: { ids: fs.productIds, ...inCtx },
    });
    const byId = new Map((d?.nodes ?? []).filter(Boolean).map((n: any) => [n.id, n]));
    products = fs.productIds.map((id) => byId.get(id)).filter(Boolean);
  }
  if (!products.length) {
    const d: any = await context.storefront.query(PRODUCTS_FALLBACK_QUERY, {
      variables: { query: q, ...inCtx },
    });
    products = d?.predictiveSearch?.products ?? [];
  }
  products = products
    .filter((p) => sellable(p) && !isJunk(p?.title) && !isRedirected("products", p?.handle))
    .slice(0, 6);

  // ── Pages / articles / collections: native ──
  let pages: any[] = [], articles: any[] = [], collections: any[] = [];
  try {
    const c: any = await context.storefront.query(CONTENT_QUERY, {
      variables: { query: q, ...inCtx },
    });
    const ps = c?.predictiveSearch ?? {};
    pages = (ps.pages ?? []).filter((p: any) => !isJunk(p?.title) && !isRedirected("pages", p?.handle));
    articles = (ps.articles ?? []).filter((a: any) => !isJunk(a?.title));
    collections = (ps.collections ?? []).filter((c: any) => !isJunk(c?.title) && !isRedirected("collections", c?.handle));
  } catch {
    /* content is best-effort; products still return */
  }

  return Response.json(
    { products, pages, articles, collections, correctedTerm },
    { headers: { "Cache-Control": "public, max-age=30" } },
  );
}
