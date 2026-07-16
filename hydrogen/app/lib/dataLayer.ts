// Tiny, bulletproof GTM dataLayer helper. Pushes GA4-style ecommerce events that GTM can
// forward to GA4 / Meta / TikTok / Ads tags. Fully guarded: never throws, no-ops on the
// server, and creates window.dataLayer if GTM hasn't yet — so it can't disturb the app.
export function pushDataLayer(event: string, data: Record<string, any> = {}) {
  try {
    if (typeof window === "undefined") return;
    const w = window as any;
    w.dataLayer = w.dataLayer || [];
    // GA4 best practice: clear the previous ecommerce object before pushing a new one.
    if (data && "ecommerce" in data) w.dataLayer.push({ ecommerce: null });
    w.dataLayer.push({ event, ...data });
  } catch {
    /* analytics must never break the storefront */
  }
  // Mirror the same events to the ad pixels (Meta / TikTok / Snapchat) loaded in root.tsx.
  firePixels(event, data);
  // …and forward ecommerce events to GA4 directly (GTM has no GA4 ecommerce tags on the headless
  // storefront). Uses the isolated gtag (window.__mlsGtag) loaded in root.tsx.
  fireGA4(event, data);
}

// Send GA4 ecommerce events (view_item / add_to_cart / begin_checkout) via the isolated gtag from
// root.tsx. page_view stays with GTM's GA4 config (this gtag has send_page_view:false), so no double
// counting. The dataLayer items are already in GA4 shape (item_id/item_name/price/quantity).
function fireGA4(event: string, data: Record<string, any>) {
  try {
    if (typeof window === "undefined") return;
    const g = (window as any).__mlsGtag;
    if (typeof g !== "function") return;
    if (event !== "view_item" && event !== "add_to_cart" && event !== "begin_checkout") return;
    const ec = (data && data.ecommerce) || {};
    const items: any[] = Array.isArray(ec.items) ? ec.items : [];
    const rawCurrency = String(ec.currency || "OMR").trim().toUpperCase();
    const currency = /^[A-Z]{3}$/.test(rawCurrency) ? rawCurrency : "OMR";
    const value = typeof ec.value === "number" ? ec.value : 0;
    g("event", event, { currency, value, items });
  } catch {
    /* analytics must never break the storefront */
  }
}

// Forward GA4-style ecommerce events to the Meta, TikTok and Snapchat pixels. These are loaded
// directly in Hydrogen (root.tsx) because Shopify's Web Pixels (Customer Events) don't run on a
// headless storefront. Fully guarded — a missing pixel or bad payload never throws.
function firePixels(event: string, data: Record<string, any>, attempt = 0) {
  try {
    if (typeof window === "undefined") return;
    const w = window as any;
    const fbq = w.fbq, ttq = w.ttq, snaptr = w.snaptr;
    if (!fbq && !ttq && !snaptr) {
      // The ad pixels load AFTER hydration (see <MarketingPixels/> in root.tsx), so an early
      // event — notably view_item, which fires on product mount before the pixels exist — would
      // be dropped. Retry briefly (up to ~6s) until a pixel is ready, then fire once.
      if (attempt < 15) setTimeout(() => firePixels(event, data, attempt + 1), 400);
      return;
    }

    const ec = (data && data.ecommerce) || {};
    const items: any[] = Array.isArray(ec.items) ? ec.items : [];
    const ids = items.map((i) => i.item_id).filter(Boolean);
    const value = typeof ec.value === "number" ? ec.value : 0;
    // Meta/TikTok/Snap require a valid ISO-4217 3-letter code (e.g. "OMR"). Normalize and guard —
    // a symbol, lower-case, or padded value triggers Meta's "invalid currency parameter format" warning.
    const rawCurrency = String(ec.currency || "OMR").trim().toUpperCase();
    const currency = /^[A-Z]{3}$/.test(rawCurrency) ? rawCurrency : "OMR";
    const fbContents = items.map((i) => ({ id: i.item_id, quantity: i.quantity || 1 }));
    const ttContents = items.map((i) => ({ content_id: i.item_id, content_type: "product", content_name: i.item_name, quantity: i.quantity || 1, price: i.price || 0 }));

    switch (event) {
      case "page_view":
        if (fbq) fbq("track", "PageView");
        if (ttq && ttq.page) ttq.page();
        if (snaptr) snaptr("track", "PAGE_VIEW");
        break;
      case "view_item":
        if (fbq) fbq("track", "ViewContent", { content_ids: ids, content_type: "product", contents: fbContents, value, currency });
        if (ttq && ttq.track) ttq.track("ViewContent", { contents: ttContents, value, currency });
        if (snaptr) snaptr("track", "VIEW_CONTENT", { item_ids: ids, price: value, currency });
        break;
      case "add_to_cart":
        if (fbq) fbq("track", "AddToCart", { content_ids: ids, content_type: "product", contents: fbContents, value, currency });
        if (ttq && ttq.track) ttq.track("AddToCart", { contents: ttContents, value, currency });
        if (snaptr) snaptr("track", "ADD_CART", { item_ids: ids, price: value, currency });
        break;
      // NOTE: InitiateCheckout + Purchase are intentionally NOT fired here — they fire on the
      // Shopify-hosted checkout via Customer Events, so firing from Hydrogen would double-count.
    }
  } catch {
    /* analytics must never break the storefront */
  }
}

// Build a GA4 ecommerce "items" entry from a product-ish shape.
export function gaItem(opts: {
  id?: string | null;
  name?: string | null;
  price?: string | number | null;
  quantity?: number;
  variant?: string | null;
}) {
  const item: Record<string, any> = {
    item_id: opts.id ?? "",
    item_name: opts.name ?? "",
    price: opts.price != null ? parseFloat(String(opts.price)) || 0 : 0,
    quantity: opts.quantity ?? 1,
  };
  if (opts.variant && opts.variant !== "Default Title") item.item_variant = opts.variant;
  return item;
}
