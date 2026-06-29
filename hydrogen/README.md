# MLS Hydrogen — Oxygen Setup

Headless Shopify Hydrogen storefront for MLS UAE (`mls-uae.myshopify.com`), deployed on Shopify Oxygen.

---

## Prerequisites

- Node.js ≥ 18.20
- Access to the `mls-uae.myshopify.com` Shopify admin
- The **Hydrogen** sales channel already installed in that store

## One-time setup

```bash
# 1. Install Shopify CLI globally (skip if already installed)
npm i -g @shopify/cli @shopify/cli-hydrogen

# 2. Install dependencies
cd hydrogen
npm install

# 3. Authenticate with Shopify
shopify auth login

# 4. Link to the existing Hydrogen storefront in the Shopify admin
npm run link
#   - select store: mls-uae.myshopify.com
#   - select the existing "MLS UAE" storefront (do NOT create a new one)

# 5. Pull all env vars from Shopify admin (fills .env automatically)
npm run env:pull
```

> If `env:pull` is unavailable, copy `.env.example` to `.env` and fill in:
> - `PRIVATE_STOREFRONT_API_TOKEN` — Shopify admin → Hydrogen → Environments
> - `SHOPIFY_ADMIN_API_TOKEN` — Shopify admin → Apps → Develop apps
> - `SESSION_SECRET` — run `openssl rand -base64 32` and paste the output
> - `JUDGEME_API_TOKEN` — Judge.me dashboard → Settings → API

## Daily development

```bash
npm run dev
# → http://localhost:3000
```

## Deploy

```bash
# Production
npm run deploy -- --env production

# Preview (staging)
npm run deploy -- --env preview
```

## Customer Account API redirect URIs

After deploying, whitelist your URLs in:
**Shopify admin → Settings → Customer accounts → Headless customer accounts**

Add to **Application callback URIs**:
```
http://localhost:3000/account/authorize
https://<your-oxygen-preview>.o2.myshopify.dev/account/authorize
https://mlsuae.ae/account/authorize
```

Add matching `/account/logout` URLs to **Logout URIs** and domain origins to **Javascript origins**.

## Notes

- This folder uses `npm` (not bun or pnpm) — Shopify CLI requires npm for Hydrogen projects.
- Secrets (`PRIVATE_STOREFRONT_API_TOKEN`, `SHOPIFY_ADMIN_API_TOKEN`, etc.) are never committed — use `env:pull` or set them manually in `.env`.
