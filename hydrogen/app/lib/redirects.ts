// Server-side 301 redirects for duplicate URLs, applied in server.ts BEFORE routing.
//
// Why this is needed: Shopify Admin "URL Redirects" — and Hydrogen's storefrontRedirect() — only
// fire when the source path would otherwise 404. The duplicate pages/products/collections below
// still exist as live 200 resources, so the Admin redirect is never consulted and the old URL keeps
// resolving. Intercepting the request here 301s it regardless of whether the duplicate still exists.
//
// Keys are the canonical path WITHOUT the /ar locale prefix. resolveRedirect() matches both
// "/<path>" and "/ar/<path>" and preserves the locale on the target, so one entry covers both
// locales. Add new duplicate → canonical pairs here.
export const REDIRECTS: Record<string, string> = {
  "/collections/burger": "/collections/burgers",
  "/products/aus-grass-fed-beef-oxtail-copy": "/products/aus-grass-fed-beef-oxtail",
  "/pages/aus-angus-beef": "/pages/australian-black-angus-beef",
  "/pages/australian-lamb-lp": "/pages/australian-lamb",
  "/pages/fresh-poultry-1": "/pages/fresh-poultry",
  "/pages/fresh-poultry-new": "/pages/fresh-poultry",
  "/pages/our-story-new": "/pages/our-story",
  "/products/aus-grass-fed-boneless-lamb-rump-roast-200gm-copy": "/products/aus-grass-fed-boneless-lamb-rump-roast-200gm",
};

/**
 * Resolves the 301 target for a request pathname, or null if there's no redirect.
 * Handles the /ar locale prefix on both the source and the target, and ignores a trailing slash.
 */
export function resolveRedirect(pathname: string): string | null {
  const clean = pathname.replace(/\/+$/, "") || "/";
  const isAr = clean === "/ar" || clean.startsWith("/ar/");
  const base = isAr ? clean.slice(3) || "/" : clean; // strip leading "/ar"
  const target = REDIRECTS[base];
  if (!target) return null;
  return isAr ? `/ar${target}` : target;
}
