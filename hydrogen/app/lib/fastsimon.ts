// Fast Simon (InstantSearch+) headless search client.
//
// Fast Simon's search engine ranks/relevance-tunes results (synonyms, merchandising, "top rated"
// boosts) far better than the raw Storefront search. We call its public full-text API server-side,
// take the RANKED Shopify product IDs it returns, and hydrate them through our own Storefront API
// so the storefront still renders our ProductCard (prices, badges, reviews, AR locale) unchanged.
//
// UUID + store_id are public identifiers (exposed in Fast Simon's browser widget), so keeping them
// in source is fine — they are not secrets.
const FASTSIMON_UUID = "ad04e860-974c-4e3a-82e0-df5fda0a8873";
const FASTSIMON_STORE_ID = "28537323629";
const FASTSIMON_ENDPOINT = "https://api.fastsimon.com/full_text_search";

export interface FastSimonSearch {
  /** Ranked Shopify product GIDs, in Fast Simon's relevance order. */
  productIds: string[];
  /** Total matches Fast Simon reports (for the "N products found" count). */
  total: number;
}

/**
 * Query Fast Simon full-text search. Returns ranked product GIDs, or null on any failure
 * (network error, timeout, non-200, or search disabled) so callers can fall back to native search.
 */
export async function fastSimonSearch(
  query: string,
  opts: { limit?: number; page?: number } = {},
): Promise<FastSimonSearch | null> {
  const q = query.trim();
  if (!q) return null;
  const limit = opts.limit ?? 24;
  const page = opts.page ?? 1;
  const url =
    `${FASTSIMON_ENDPOINT}?store_id=${FASTSIMON_STORE_ID}&UUID=${FASTSIMON_UUID}` +
    `&q=${encodeURIComponent(q)}&api_type=json&products_per_page=${limit}&page_num=${page}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const json = (await res.json()) as any;
    if (json?.fulltext_disabled) return null; // engine not powering search
    const items: any[] = Array.isArray(json?.items) ? json.items : [];
    const productIds = items
      .map((it) => it?.id)
      .filter((id) => id != null && String(id).length > 0)
      .map((id) => `gid://shopify/Product/${id}`);
    if (!productIds.length) return null;
    return { productIds, total: Number(json?.total_results) || productIds.length };
  } catch {
    return null; // timeout / network / parse → caller falls back
  }
}
