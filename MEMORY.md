# MLS Oman — Project Memory

> Read this first, every time. It's the map of what this repo is, how the two apps relate,
> where things live, and the exact steps to run/build/deploy. Update it as the project evolves.

---

## 1. What this project is

**MLS Oman** = the headless Shopify storefront for **Muscat Livestock (MLS)** — a premium fresh
meat / butcher e-commerce brand in Oman. Fresh & Halal meat (beef, lamb, chicken, wagyu, kebab,
rubs, marinades, whole carcass, boxes, etc.).

This is an **Oman fork of the earlier MLS UAE storefront**. The store is being migrated from the
UAE Shopify store to the **Oman** Shopify store. Watch for leftover UAE references.

- **Oman store domain:** `muscat-livestock.myshopify.com`
- **Oman public site:** `mls.om` / `www.mls.om`
- **Currency:** OMR (Omani Rial) — **3-decimal** currency (see `formatPrice`)
- **Country context:** `OM`
- **Languages:** English (default, LTR) + Arabic (`/ar` prefix or `lang=ar` cookie, RTL)
- **Old UAE store (reference only):** `mls-uae.myshopify.com`, site `mlsuae.ae`, currency AED

⚠️ **Migration gotchas — UAE leftovers still in the code:**
- `hydrogen/.env.example` still lists `mls-uae.myshopify.com` + UAE storefront token/id.
- `hydrogen/README.md` header still says "MLS UAE" and references `mls-uae.myshopify.com`.
- Ad pixels (Meta/TikTok/Snapchat) were **removed** in `root.tsx` — the old IDs were UAE's.
  Re-add **Oman** pixel IDs at go-live. `dataLayer.ts` no-ops safely when they're absent.
- `INTERNAL_HOSTS` in `root.tsx` has a TODO: add the Oman Oxygen preview host once known.

---

## 2. Repo layout — TWO apps in one repo

This repo contains **two separate applications**. They coexist; neither deletes the other.

### `hydrogen/` — ⭐ THE REAL PRODUCTION STOREFRONT (work here)
Shopify **Hydrogen** (React Router v7 / Remix-style) app deployed on **Shopify Oxygen**.
This is the app that ships. Uses **npm** (Shopify CLI requires npm, not bun/pnpm).
- React 18, Hydrogen `2026.4.x`, `@shopify/remix-oxygen`, Tailwind v4.
- SSR on Oxygen (Cloudflare Workers runtime). Entry: `hydrogen/server.ts`.
- Cart lives in a **server cookie** (Hydrogen `createCartHandler`), not client Zustand.

### `src/` — the OLD TanStack Start scaffold (legacy / Lovable preview)
The original **TanStack Start** + TanStack Router app (built in Lovable). Runs on Cloudflare
Workers via `@tanstack/react-start`. Package name `tanstack_start_ts`. Uses **bun**.
- **Hydrogen cannot run in Lovable/Workers**, so this TanStack version was kept as the
  Lovable-previewable copy while the real app was ported to `hydrogen/`.
- Treat `src/` as legacy. New feature work goes in `hydrogen/`. `.lovable/plan.md` documents
  the original port plan (TanStack → Hydrogen).

**Rule of thumb:** unless told otherwise, **all real work happens in `hydrogen/`.**

---

## 3. Hydrogen app architecture (`hydrogen/app/`)

- `server.ts` — Oxygen entry. Creates storefront client, customer-account client, cart handler,
  session, and an `adminFetch` helper (Admin GraphQL API, 5s timeout). Detects locale from `/ar`
  prefix or `lang` cookie; for Arabic wraps storefront in a **Proxy** that injects
  `Accept-Language: ar` on every query/mutate (T Lab translations — `@inContext` alone isn't
  enough because AR isn't in the channel language settings).
- `app/root.tsx` — App shell. Root loader fetches **menus + footer + announcement bar + cart-drawer
  config + free-gift rules + mobile menus/banners** (via `LAYOUT_QUERY` storefront + `ADMIN_FOOTER_QUERY`
  admin). Injects all 3rd-party scripts: GTM (`GTM-K59CLCPC`, deferred), Klaviyo, Microsoft Clarity,
  PushOwl/Brevo push, Snowball referral, Richpanel chat widget. Has `PageLoader`, `ErrorBoundary`,
  `LocaleSync`, `DataLayerRouteTracker`.
- `app/routes.ts` — Explicit route table (NOT file-based auto-routing). Every EN route has an `/ar/...`
  twin, plus Arabic-slug aliases for CMS pages. Sitemaps, robots, llms.txt, cart.js, pushowl SW,
  api.* endpoints all declared here.
- `app/routes/` — loaders/actions/meta per route. Key: `_index` (home), `products.$handle`,
  `collections.$handle` + `_index`, `search`, `blogs.*`, `pages.*` (many CMS pages), `account.*`
  (Customer Account API OAuth), `cart`, `api.*` (reviews, globo-options, back-in-stock, discounts).
- `app/lib/` — `shopify.ts` (Storefront client, GraphQL fragments/queries, origin/flag mapping,
  `formatPrice` for OMR 3-decimals), `shopifyCustomer.ts`, `session.ts`, `locale.ts`, `judgeme.ts`
  (reviews), `globo.ts` (Globo product-options app), `dataLayer.ts` (GTM), `arImages.ts` (AR image
  swaps), `cartDrawerConfig.ts`, `sanitize.ts`, `utils.ts`.
- `app/components/` — `home/`, `layout/` (Header, Footer, MegaMenu, CartDrawer, AnnouncementBar,
  SearchAutosuggest), `product/`, `product-templates/` (per-product-type page layouts:
  Beef/Chicken/Lamb Rubs, Kebab, Picanha, WholeCuts, WholeCarcass, Box, etc.), `landing-pages/`,
  `reviews/` (Judge.me), `shared/`, `ui/` (shadcn/ui — new-york style, lucide icons).
- `app/stores/` — Zustand: `cartStore`, `wishlistStore` (client-side), `localeStore`,
  `quickBuyStore`, `recentlyViewedStore`.
- `app/hooks/` — `useCartSync`, `use-mobile`.
- `app/i18n/strings.ts` — EN/AR UI strings.

### Shopify content model — driven by **metaobjects**
Site chrome/content is **CMS-driven via Shopify metaobjects + native Menus**, read through the
Admin API in the root loader. Types include: `mls_footer_settings`, `mls_announcement_bar`,
`mls_cart_drawer_config`, `mls_free_gift_rule`, `mls_nav_item_image`, `mls_mobile_banner`, plus
nav/category/contact/delivery/gourmet/refer metaobjects. Native menus by handle:
`hydrogen-desktop`, `secondary-menu`, `mls-mobile-menu`, `mls-mobile-categories`, `about-mls`,
`customer-care`.

`hydrogen/scripts/` contains **tsx scripts to create/seed these metaobjects + menus** via the
Admin API (e.g. `generate-metaobjects.ts` — Claude-assisted schema+seed pipeline, plus
`create-nav-metaobjects`, `create-category-metaobjects`, `create-cart-drawer-metaobject`,
`seed-nav`, `sync-beef-origins`, etc.). Run via the npm scripts below.

### Integrations
Judge.me (reviews), Globo (product options), Klaviyo (email/onsite), Richpanel (chat),
PushOwl/Brevo (web push), Snowball (referral/affiliate), GTM, Microsoft Clarity.

---

## 4. Commands / the steps

### Hydrogen (the real app) — cd into `hydrogen/`, uses **npm**
```bash
cd hydrogen
npm install                       # one-time
shopify auth login                # one-time — authenticate Shopify CLI
npm run link                      # one-time — link to the Oman Hydrogen storefront (do NOT create new)
npm run env:pull                  # pull env vars from Shopify admin into .env
npm run dev                       # local dev → http://localhost:3000
npm run build
npm run preview
npm run codegen                   # regenerate GraphQL types
npm run typecheck                 # tsc --noEmit
npm run lint

# Metaobject / menu seeding scripts (need SHOPIFY_ADMIN_API_TOKEN, some need ANTHROPIC_API_KEY):
npm run generate:metaobjects
npm run create:nav
npm run create:categories
npm run create:cart-drawer
# other one-off scripts: npx tsx scripts/<name>.ts
```

### `.env` for hydrogen (copy from `.env.example`, then fill)
`PUBLIC_STORE_DOMAIN` (→ set to Oman), `PUBLIC_STOREFRONT_API_TOKEN`, `PRIVATE_STOREFRONT_API_TOKEN`,
`PUBLIC_CUSTOMER_ACCOUNT_CLIENT_ID`, `PUBLIC_CUSTOMER_ACCOUNT_API_URL`, `SESSION_SECRET`
(`openssl rand -base64 32`), `SHOPIFY_ADMIN_API_TOKEN`, `JUDGEME_API_TOKEN`.

### Legacy TanStack app (`src/`) — root dir, uses **bun**
```bash
bun install        # or npm — has both lockfiles
npm run dev        # vite dev
npm run build
```

---

## 5. Deployment — Shopify Oxygen (auto via GitHub Actions)

`.github/workflows/oxygen-deploy.yml` — Oman storefront id **1000153258**.
- Push to **`main`** → **Production**; push to **`staging`** → **Staging**. PRs → temp previews.
- Runs `npx shopify hydrogen deploy --env-branch <branch>` in `hydrogen/`.
- Oxygen auto-injects all `PUBLIC_*/PRIVATE_*/SESSION_SECRET` per environment.
- Only secret needed: `OXYGEN_DEPLOYMENT_TOKEN_1000153258` (auto-created by Shopify's Oxygen
  GitHub integration).
- Branch→environment linking is configured in Hydrogen admin (Storefront → Environments).

Manual deploy: `npm run deploy -- --env production` / `--env preview`.

**Customer Account API:** after deploy, whitelist callback/logout/JS-origin URLs in Shopify admin →
Settings → Customer accounts → Headless. Needs the Oman Oxygen preview URL + `mls.om`.

### Git / where we work
- **GitHub repo:** `faisalnazeer-arch/Headless-Oman`
  (https://github.com/faisalnazeer-arch/Headless-Oman)
- **Our working branch:** `Faraz-Dev-oman` — we develop AND deploy from this branch (per Faraz).
- ⚠️ The current deploy workflow only triggers on `main` / `staging`. So pushing `Faraz-Dev-oman`
  does **not** auto-deploy today unless that branch is linked to an Oxygen environment (or gets PR
  previews). **Open question (TBD):** confirm whether `Faraz-Dev-oman` has its own Oxygen env /
  auto-deploys, or whether we merge into `main`/`staging` to ship. If it should auto-deploy, add it
  to the `on.push.branches` list in `.github/workflows/oxygen-deploy.yml`.
- ⚠️ This local folder (`.../Faraz-Dev-oman/`) is **not yet a git checkout** — no `.git` here and
  `gh` CLI isn't installed. To wire it up: `git init` + `git remote add origin <repo>` +
  `git fetch` + `git checkout Faraz-Dev-oman` (or re-`git clone` the branch fresh).

---

## 6. Working notes / conventions
- Prices: always OMR, **3 decimals** — use `formatPrice(amount, "OMR")` from `app/lib/shopify.ts`.
- Locale: EN default; AR via `/ar` prefix OR `lang=ar` cookie → RTL. Every route needs an AR twin
  in `routes.ts`. AR images swap via `arImages.ts` (`*_ar` metaobject fields).
- Content changes for chrome/pages usually mean editing **Shopify metaobjects/menus**, not code —
  or running a `scripts/` seeder.
- Two package managers: `hydrogen/` = **npm**, `src/` = **bun**. Don't cross them.
- shadcn/ui new-york style, lucide icons, Tailwind v4, Zustand for client state.

---

## 7. Session log (append what we do each session)
<!-- Add dated bullets here as work progresses so future sessions have continuity. -->
- 2026-07-05 — Created this MEMORY.md; explored & documented the two-app structure, Hydrogen
  architecture, metaobject CMS model, dev/deploy workflow, and UAE→Oman migration leftovers.
- 2026-07-05 — Recorded git: repo `faisalnazeer-arch/Headless-Oman`, working branch
  `Faraz-Dev-oman` (dev + deploy). Deploy trigger for that branch is TBD. Local folder not yet a
  git checkout.
- 2026-07-06 — Landing-page builder (NEW `mls_*` system; Faraz rejected the old `lp_*` design).
  Built page 1 `beef-collection`:
  • `hydrogen/scripts/create-landing-pages.ts` — idempotent seeder: creates all `mls_*` defs
    (`mls_landing_page`, `mls_section_hero/icons/message/card_grid/product_carousel/reels`, child
    items `mls_icon_item/mls_card_item/mls_reel_item`), seeds beef-collection sections, sets the
    page's `custom.landing_page` metafield. Run: `npx tsx scripts/create-landing-pages.ts` (needs
    `.env` with `SHOPIFY_ADMIN_API_TOKEN` + `PUBLIC_STORE_DOMAIN`). `--defs-only` / `--page <h>` flags.
  • Components in `hydrogen/app/components/mls-landing/` (fields.ts + MlsHero/Icons/Message/CardGrid/
    ProductCarousel/Reels) — improved responsive design; reuse ProductCard/HScroller/ReelsCarousel.
  • Detection is METAFIELD-DRIVEN, no per-page code: `hydrogen/app/lib/mlsLanding.tsx` exports
    `loadLandingSections()` + `<MlsLandingSections>`. The existing `pages.$handle.tsx` loader calls
    `loadLandingSections` FIRST; if the page has `custom.landing_page` set → renders mls_* sections
    and skips the legacy lp_*/prose paths. NO routes.ts edits per page; works at natural /pages/<handle>.
  • YOU assign the page: the seeder creates the `custom.landing_page` PAGE metafield DEFINITION and the
    metaobjects, then PRINTS the mls_landing_page id — Faraz assigns it on the page in admin (it does
    NOT auto-link). Add a new landing page = create metaobjects + assign the metafield. That's it.
  • Arabic: text via Shopify T&A; only IMAGE fields have `_ar` twins (applyArImages). ≤20 images/entry
    enforced via child-item metaobjects. New files typecheck clean (38 pre-existing errors elsewhere,
    none mine). (Removed the earlier standalone `pages.landing.$handle.tsx` route + hardcoded routes.ts entries.)
  • TODO next run: create `.env` (SHOPIFY_ADMIN_API_TOKEN + PUBLIC_STORE_DOMAIN) → run
    `npx tsx scripts/create-landing-pages.ts` → in admin assign the page's Landing Page metafield +
    fill each section's images/collections/reels → `npm run dev` → check /pages/beef-collection responsiveness.
