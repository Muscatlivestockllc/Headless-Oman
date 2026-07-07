const JUDGEME_BASE = "https://judge.me/api/v1";

export interface JudgemeReviewer {
  name: string;
}

export interface JudgemeReview {
  id: number;
  title: string;
  body: string;
  rating: number;
  reviewer: JudgemeReviewer;
  created_at: string;
  verified: "verified_buyer" | "unverified" | string;
  pictures: { urls: { original: string; small: string } }[];
}

export interface JudgemeReviewsResponse {
  reviews: JudgemeReview[];
  current_page: number;
  per_page: number;
  total_count?: number;
  rating?: number;
}

export interface JudgemeRatingSummary {
  average: number;
  count: number;
  /** Distribution: index 0 = 1-star count … index 4 = 5-star count */
  histogram: [number, number, number, number, number];
}

// Parse Judge.me widget HTML into structured review objects.
// The /api/v1/reviews?product_external_id= filter is unreliable for this account —
// it ignores the product filter and returns shop-wide reviews. The widget endpoint
// returns product-specific reviews, so we parse its HTML instead.
function parseWidgetHtml(html: string, page: number, perPage: number): JudgemeReviewsResponse {
  const clean = (s: string) =>
    s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim();

  // Aggregate stats
  const avgMatch   = html.match(/data-average-rating='([^']+)'/);
  const cntMatch   = html.match(/data-number-of-reviews='([^']+)'/);
  const totalCount = cntMatch ? parseInt(cntMatch[1], 10) : undefined;
  const ratingAvg  = avgMatch ? parseFloat(avgMatch[1]) : undefined;

  // Histogram: data-rating + data-frequency pairs in the histogram section
  const histogram: [number,number,number,number,number] = [0, 0, 0, 0, 0];
  for (const m of html.matchAll(/data-rating='(\d+)' data-frequency='(\d+)'/g)) {
    const star = parseInt(m[1], 10);
    if (star >= 1 && star <= 5) histogram[star - 1] = parseInt(m[2], 10);
  }

  // Each review is identified by its unique data-review-id UUID
  const reviewIds = [...html.matchAll(/data-review-id='([^']+)'/g)].map(m => m[1]);

  const reviews: JudgemeReview[] = reviewIds.slice(0, perPage).map((id, idx) => {
    const start = html.indexOf(`data-review-id='${id}'`);
    if (start === -1) return null;

    // Chunk covers the review div and all its children (~2500 chars is enough)
    const chunk = html.substring(start, start + 2500);
    // Look slightly before start to capture verified-buyer attr on the parent div
    const context = html.substring(Math.max(0, start - 300), start + 100);

    const scoreM  = chunk.match(/class='jdgm-rev__rating'[^>]*data-score='(\d+)'/);
    const verM    = context.match(/data-verified-buyer='(true|false)'/);
    const authorM = chunk.match(/<span class='jdgm-rev__author'>([^<]+)<\/span>/);
    const dateM   = chunk.match(/class='jdgm-rev__timestamp[^']*'[^>]*data-content='([^']+)'/);
    const titleM  = chunk.match(/<b class='jdgm-rev__title'>([^<]*)<\/b>/);
    const bodyM   = chunk.match(/<div class='jdgm-rev__body'>([\s\S]*?)<\/div>/);
    const picMs   = [...chunk.matchAll(/href='(https:\/\/(?:(?:review-images|judgeme(?:-public-images)?)\.judge\.me|judgeme(?:-public-images)?\.imgix\.net|cdn\.judge\.me\/reviews\/pictures)[^']+)'/g)];

    let createdAt = new Date().toISOString();
    try { if (dateM?.[1]) createdAt = new Date(dateM[1]).toISOString(); } catch { /* keep default */ }

    return {
      id: parseInt(id.replace(/-/g, "").substring(0, 8), 16) || (page * 1000 + idx),
      title:     titleM  ? clean(titleM[1])  : "",
      body:      bodyM   ? clean(bodyM[1])   : "",
      rating:    scoreM  ? parseInt(scoreM[1], 10) : 5,
      reviewer:  { name: authorM ? clean(authorM[1]) : "Customer" },
      created_at: createdAt,
      verified:  verM?.[1] === "true" ? "verified_buyer" : "unverified",
      pictures:  picMs.slice(0, 5).map(m => ({ urls: { original: m[1], small: m[1] } })),
    } as JudgemeReview;
  }).filter((r): r is JudgemeReview => r !== null && (!!r.body || !!r.title));

  return { reviews, current_page: page, per_page: perPage, total_count: totalCount, rating: ratingAvg };
}

export async function fetchJudgemeReviews(
  handle: string,
  shopDomain: string,
  apiToken: string | undefined,
  page = 1,
  perPage = 10,
  _externalId?: string,
): Promise<JudgemeReviewsResponse> {
  if (!apiToken) return emptyResponse(page, perPage);

  // Use the widget endpoint — it returns product-specific reviews reliably.
  // The /api/v1/reviews?product_external_id= filter ignores the product filter
  // for many Judge.me accounts and returns store-wide reviews instead.
  const url =
    `${JUDGEME_BASE}/widgets/product_review` +
    `?shop_domain=${encodeURIComponent(shopDomain)}` +
    `&handle=${encodeURIComponent(handle)}` +
    `&per_page=${perPage}&page=${page}` +
    `&api_token=${encodeURIComponent(apiToken)}`;

  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return emptyResponse(page, perPage);
    const data = (await res.json()) as { widget?: string; product_external_id?: number };
    if (!data.widget) return emptyResponse(page, perPage);
    return parseWidgetHtml(data.widget, page, perPage);
  } catch {
    return emptyResponse(page, perPage);
  }
}

export async function fetchJudgemeRating(
  _shopifyProductGid: string,
  _shopDomain: string,
  _apiToken: string | undefined,
): Promise<JudgemeRatingSummary> {
  // The /api/v1/products/:id endpoint returns 404 for most products on this account.
  // Rating is now derived from the widget response inside fetchJudgemeReviews via
  // buildRatingSummary — no separate rating fetch needed.
  return emptySummary();
}

/**
 * Build a JudgemeRatingSummary from a reviews API response.
 * Uses the `rating` field from the response for the average (most accurate),
 * and computes the histogram from the loaded reviews.
 */
export function buildRatingSummary(
  data: JudgemeReviewsResponse
): JudgemeRatingSummary {
  // Use the widget-provided rating average when available (most accurate)
  const average = data.rating != null && data.rating > 0 ? data.rating : (() => {
    let sum = 0;
    for (const r of data.reviews) sum += r.rating;
    return data.reviews.length > 0 ? sum / data.reviews.length : 0;
  })();

  // Build histogram from loaded reviews (widget parser already fills this in)
  const histogram: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  for (const r of data.reviews) {
    const idx = Math.min(Math.max(Math.round(r.rating) - 1, 0), 4);
    histogram[idx]++;
  }

  return { average, count: data.total_count ?? 0, histogram };
}

export async function fetchJudgemeStoreReviews(
  shopDomain: string,
  apiToken: string | undefined,
  page = 1,
  perPage = 10,
): Promise<JudgemeReviewsResponse> {
  if (!apiToken) return emptyResponse(page, perPage);
  const url =
    `${JUDGEME_BASE}/reviews?api_token=${encodeURIComponent(apiToken)}` +
    `&shop_domain=${encodeURIComponent(shopDomain)}` +
    `&rating=4,5&page=${page}&per_page=${perPage}`;
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return emptyResponse(page, perPage);
    const data = (await res.json()) as JudgemeReviewsResponse;
    return data;
  } catch {
    return emptyResponse(page, perPage);
  }
}

export async function fetchJudgemeShopStats(
  shopDomain: string,
  apiToken: string | undefined,
): Promise<{ average: number; count: number }> {
  if (!apiToken) return { average: 0, count: 0 };
  const url =
    `${JUDGEME_BASE}/shops/judgeme_widgets?api_token=${encodeURIComponent(apiToken)}` +
    `&shop_domain=${encodeURIComponent(shopDomain)}&_type=site_reviews&per_page=0`;
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return { average: 0, count: 0 };
    const data = (await res.json()) as any;
    return {
      average: data?.rating ?? data?.average ?? 0,
      count: data?.total_count ?? data?.count ?? 0,
    };
  } catch {
    return { average: 0, count: 0 };
  }
}

function emptyResponse(page: number, perPage: number): JudgemeReviewsResponse {
  return { reviews: [], current_page: page, per_page: perPage, total_count: undefined };
}

function emptySummary(): JudgemeRatingSummary {
  return { average: 0, count: 0, histogram: [0, 0, 0, 0, 0] };
}
