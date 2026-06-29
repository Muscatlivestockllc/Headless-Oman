# Hydrogen + Oxygen setup (parallel scaffold)

## Reality check first

Lovable's preview/publish runs on Cloudflare Workers. Hydrogen apps cannot run there — they need either:
- **Local dev**: `shopify hydrogen dev` on your machine
- **Hosting**: Shopify Oxygen (`shopify hydrogen deploy`)

I can scaffold the Hydrogen project and write all the code here in the repo, but **the `shopify` CLI itself must run on your computer** — not in the Lovable sandbox. Your Shopify login, browser-based OAuth, and Oxygen storefront link all happen there.

So the work splits into two halves:

---

## Part A — What I do in the repo (parallel folder)

Create `/hydrogen` alongside the existing TanStack `src/`. The current store keeps working in Lovable preview untouched.

**Files I create under `/hydrogen`:**

1. **Project skeleton** (Hydrogen 2025.x / Remix / Vite / Tailwind v4 / TS)
   - `hydrogen/package.json` — scripts: `dev`, `build`, `preview`, `deploy` (using `@shopify/cli` + `@shopify/cli-hydrogen`)
   - `hydrogen/vite.config.ts` — `@shopify/hydrogen/vite` + `@remix-run/dev`
   - `hydrogen/tsconfig.json`, `hydrogen/.eslintrc`, `hydrogen/.gitignore`
   - `hydrogen/server.ts` — Oxygen entry: `createStorefrontClient`, `createCartHandler`, `createCustomerAccountClient`, session
   - `hydrogen/app/entry.client.tsx`, `hydrogen/app/entry.server.tsx`, `hydrogen/app/root.tsx`
   - `hydrogen/app/lib/session.ts`, `hydrogen/app/lib/context.ts`

2. **Env template** — `hydrogen/.env.example`
   ```
   PUBLIC_STORE_DOMAIN=mls-uae-test-store.myshopify.com
   PUBLIC_STOREFRONT_API_TOKEN=73936922b12f6960d20479931fc05c1c
   PUBLIC_STOREFRONT_API_VERSION=2025-07
   PUBLIC_CUSTOMER_ACCOUNT_CLIENT_ID=06daa3bf-add3-4f50-b81c-9e2d1314b5e1
   PUBLIC_CUSTOMER_ACCOUNT_API_URL=https://shopify.com/59406614597
   SESSION_SECRET=replace-me
   PUBLIC_CHECKOUT_DOMAIN=mls-uae-test-store.myshopify.com
   ```

3. **Ported source** — copy `src/components`, `src/stores`, `src/i18n`, `src/lib/utils.ts`, `src/styles.css`, fonts → `hydrogen/app/...` and rewrite imports:
   - `@tanstack/react-router` → `@remix-run/react`
   - `<Link to="/products/$handle" params={{handle}}>` → `<Link to={\`/products/${handle}\`}>`
   - Remove `useCartSync` and Zustand cart write paths; cart drawer reads from `useLoaderData` / `CartForm`

4. **Routes** — Remix versions of every existing route:
   - `app/routes/_index.tsx` (home)
   - `app/routes/collections.$handle.tsx`
   - `app/routes/products.$handle.tsx`
   - `app/routes/search.tsx`
   - `app/routes/account.tsx` (layout) + `account._index.tsx`
   - `app/routes/account_.authorize.tsx` (OAuth callback — replaces `api/auth.callback.tsx`)
   - `app/routes/account_.logout.tsx`
   - `app/routes/cart.tsx` (action handler for `CartForm`)
   - Each route gets `loader`, `meta`, and (where needed) `action`

5. **Storefront client** — `hydrogen/app/lib/shopify.ts` keeps every GraphQL string from current `src/lib/shopify.ts`; `storefrontApiRequest` deleted, calls become `context.storefront.query(QUERY, { variables })` inside loaders.

6. **README** — `hydrogen/README.md` with the exact commands from Part B below.

I do **not** delete anything in `src/`. Both apps coexist.

---

## Part B — What you run on your machine (one-time)

```bash
# 1. Install Shopify CLI globally
npm i -g @shopify/cli @shopify/cli-hydrogen

# 2. Pull this repo locally, then:
cd hydrogen
npm install
cp .env.example .env        # SESSION_SECRET: run `openssl rand -base64 32`

# 3. Log into Shopify
shopify auth login

# 4. Link to your storefront on Shopify
#    (first install the "Hydrogen" sales channel in Shopify admin if not present:
#     Admin → Settings → Apps and sales channels → Shopify App Store → "Hydrogen")
shopify hydrogen link
#    pick: mls-uae-test-store → "Create new storefront" → name "MLS UAE Test"

# 5. Run locally
shopify hydrogen dev
#    opens http://localhost:3000 with hot reload + Shopify GraphiQL

# 6. Deploy a preview to Oxygen
shopify hydrogen deploy --env preview
#    prints a https://*.o2.myshopify.dev URL

# 7. Deploy to production when ready
shopify hydrogen deploy --env production
```

After step 4, env vars (`PUBLIC_STOREFRONT_API_TOKEN`, etc.) can be set in **Shopify admin → Hydrogen → your storefront → Environments** so production doesn't depend on your local `.env`.

---

## Trade-offs to confirm before I start

- The Lovable preview at `id-preview--…lovable.app` will keep showing the **TanStack** version. The Hydrogen version is only viewable via `localhost:3000` or the Oxygen URLs.
- Cart state in the Hydrogen app moves to a server cookie (Hydrogen standard). Wishlist stays client-side.
- Customer Account client ID and shop ID get re-used as-is — no Shopify admin changes needed unless redirect URIs need updating (you'll add the Oxygen preview URL + production domain to the allowed redirects in Shopify admin → Customer Account API settings).

## Open question
The Customer Account API allowed redirect URIs currently only list the Lovable domains. After you get the Oxygen preview URL from `shopify hydrogen deploy`, you'll need to add it (and eventually your custom domain) to the allowed list. Want me to include that exact step + screenshots-style instructions in the README I generate?
