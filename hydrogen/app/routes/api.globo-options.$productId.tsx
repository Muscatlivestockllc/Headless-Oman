import type { LoaderFunctionArgs } from "@shopify/remix-oxygen";
import { extractGloboOptionsFromHtml, type GloboOptionSet } from "~/lib/globo";

// ── Globo Product Options — client-side fallback fetch ────────────────────────
//
// Globo is a client-rendered theme-app-extension. Its option-set definitions are
// NOT in Shopify product metafields — they live in the app and are injected into
// the storefront at runtime. The one place they are emitted server-side (so we can
// scrape them headlessly) is Globo's search view:
//
//     /search?view=gpo&q=handles:{handle}
//
// That page embeds EVERY store option set as `window.GPOConfigs.options[ID] = {...}`,
// each carrying its own product-targeting rule (all / manual ids / automate by
// collection). extractGloboOptionsFromHtml() parses those blocks and keeps only the
// sets that apply to this product (matched by numeric product id + collection ids).
//
// The product's collection ids come from Globo's own product endpoint
// (/apps/options/new-products) so we match against exactly the ids Globo uses.
//
// The route param is the numeric product id; the handle is passed as ?handle= by the
// PDP (needed for the search query). If handle is missing we can't build the query.

function searchViewUrl(domain: string, handle: string): string {
  return `https://${domain}/search?view=gpo&q=handles:${encodeURIComponent(handle)}`;
}

function productProxyUrl(domain: string, handle: string): string {
  return `https://${domain}/apps/options/new-products?handles=${encodeURIComponent(handle)}`;
}

// Fetch the product's numeric collection ids from Globo's product app-proxy.
// Returns [] on any failure — matching then falls back to non-collection rules.
async function fetchCollectionIds(domains: string[], handle: string): Promise<number[]> {
  for (const d of domains) {
    try {
      const res = await fetch(productProxyUrl(d, handle), {
        headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(2500),
      });
      if (!res.ok) continue;
      const data = (await res.json()) as any;
      const product = Array.isArray(data) ? data[0] : data;
      const ids = (product?.collections ?? [])
        .map((c: any) => Number(typeof c === "object" ? c.id ?? c : c))
        .filter((n: number) => Number.isFinite(n));
      if (ids.length > 0) return ids;
    } catch {
      /* try next domain */
    }
  }
  return [];
}

export async function loader({ params, context, request }: LoaderFunctionArgs) {
  const { productId } = params;
  const handle = new URL(request.url).searchParams.get("handle") ?? "";
  if (!productId || !handle) return Response.json({ optionSets: [] });

  const numId = Number(productId);
  const shopDomain = context.env.PUBLIC_STORE_DOMAIN;
  const liveDomain = (context.env as any).PUBLIC_LIVE_STORE_DOMAIN ?? shopDomain;
  // Live custom domain first — that's where the Globo-enabled Shopify theme runs.
  const domains = [...new Set([liveDomain, shopDomain])];

  // Collection IDs are REQUIRED to match collection-targeted option sets to this product.
  // Try Globo's app-proxy first; if it returns nothing (e.g. the Arabic PDP passes a handle the
  // proxy can't resolve), fall back to the Storefront API. Without ids, collection-rule sets are
  // NOT matched (see lib/globo) to avoid attaching every store set to the product.
  let collectionIds = await fetchCollectionIds(domains, handle);
  if (collectionIds.length === 0) {
    try {
      const d = (await context.storefront.query(
        `query($handle: String!){ product(handle: $handle){ collections(first: 50){ nodes { id } } } }`,
        { variables: { handle }, cache: context.storefront.CacheShort() },
      )) as any;
      collectionIds = (d?.product?.collections?.nodes ?? [])
        .map((c: any) => Number(String(c.id).split("/").pop()))
        .filter((n: number) => Number.isFinite(n));
    } catch {
      /* keep empty */
    }
  }

  for (const d of domains) {
    try {
      const res = await fetch(searchViewUrl(d, handle), {
        headers: { Accept: "text/html", "User-Agent": "Mozilla/5.0" },
        redirect: "follow",
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) continue;
      const html = await res.text();
      const optionSets: GloboOptionSet[] = extractGloboOptionsFromHtml(
        html,
        numId,
        collectionIds.length > 0 ? collectionIds : undefined,
      );
      if (optionSets.length > 0) return Response.json({ optionSets });
    } catch {
      /* try next domain */
    }
  }

  return Response.json({ optionSets: [] });
}
