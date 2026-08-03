import type { LoaderFunctionArgs } from "@shopify/remix-oxygen";
import { fastSimonSearch } from "~/lib/fastsimon";
import { detectLanguage } from "~/lib/locale";
import { isJunk, isRedirected } from "~/lib/searchFilters";

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

// Native predictiveSearch does true as-you-type PREFIX matching across title/description, so a
// half-typed word like "whole car" matches "Whole Carcass" — which Fast Simon's full-text endpoint
// does not (it drops the partial word). We take its products AND the pages / articles / collections
// (Fast Simon only indexes products).
const CONTENT_QUERY = `#graphql
  ${PRODUCT_FIELDS}
  query SuggestContent($query: String!, $language: LanguageCode, $country: CountryCode)
  @inContext(language: $language, country: $country) {
    predictiveSearch(query: $query, limit: 6, types: [PRODUCT, PAGE, ARTICLE, COLLECTION]) {
      products { ...SuggestProduct }
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

  // ── Products: hybrid — Fast Simon ranking (whole words) + native prefix matching ──
  let correctedTerm: string | null = null;
  let fsProducts: any[] = [];
  const fs = await fastSimonSearch(q, { limit: 6 });
  // Did Fast Simon just drop a half-typed last word? (its matched term is a prefix of the query)
  const truncated = !!(fs?.correctedTerm && q.toLowerCase().startsWith(fs.correctedTerm.toLowerCase() + " "));
  if (fs) {
    const d: any = await context.storefront.query(PRODUCTS_BY_ID_QUERY, {
      variables: { ids: fs.productIds, ...inCtx },
    });
    const byId = new Map((d?.nodes ?? []).filter(Boolean).map((n: any) => [n.id, n]));
    fsProducts = fs.productIds.map((id) => byId.get(id)).filter(Boolean);
    // Show "did you mean" only for a real typo fix — not a half-typed-word truncation.
    correctedTerm = truncated ? null : (fs.correctedTerm ?? null);
  }

  // Native predictiveSearch — prefix matching (products) + pages / articles / collections.
  let nativeProducts: any[] = [], pages: any[] = [], articles: any[] = [], collections: any[] = [];
  try {
    const c: any = await context.storefront.query(CONTENT_QUERY, {
      variables: { query: q, ...inCtx },
    });
    const ps = c?.predictiveSearch ?? {};
    nativeProducts = ps.products ?? [];
    pages = (ps.pages ?? []).filter((p: any) => !isJunk(p?.title) && !isRedirected("pages", p?.handle));
    articles = (ps.articles ?? []).filter((a: any) => !isJunk(a?.title));
    collections = (ps.collections ?? []).filter((c: any) => !isJunk(c?.title) && !isRedirected("collections", c?.handle));
  } catch {
    /* content is best-effort; products still return */
  }

  // Merge: when Fast Simon truncated a half-typed word, native prefix matches are the real intent →
  // lead with them; otherwise Fast Simon's ranking leads. Dedupe by id, drop junk, cap at 6.
  const seen = new Set<string>();
  const products = (truncated ? [...nativeProducts, ...fsProducts] : [...fsProducts, ...nativeProducts])
    .filter((p: any) => {
      if (!p || seen.has(p.id)) return false;
      seen.add(p.id);
      return sellable(p) && !isJunk(p?.title) && !isRedirected("products", p?.handle);
    })
    .slice(0, 6);

  return Response.json(
    { products, pages, articles, collections, correctedTerm },
    { headers: { "Cache-Control": "public, max-age=30" } },
  );
}
