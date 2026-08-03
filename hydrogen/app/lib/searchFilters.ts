import { REDIRECTS } from "~/lib/redirects";

// Shared search hygiene, used by both the autosuggest API and the /search results page.
// The Storefront API already excludes true drafts; this drops published-but-not-customer-facing
// items — "TEST …", "… copy", bracketed dev titles — and anything we 301-redirect as a duplicate.
export const isJunk = (title?: string | null) => {
  const s = (title ?? "").trim();
  return !s || s.startsWith("[") || /\b(test|draft|copy|demo|dummy)\b/i.test(s);
};

export const isRedirected = (kind: "pages" | "collections" | "products", handle?: string | null) =>
  !!handle && !!REDIRECTS[`/${kind}/${handle}`];
