#!/usr/bin/env node
/**
 * create-search-config-metaobject.ts
 * Creates the mls_search_config metaobject (translatable) that holds the search UI text —
 * popular-search terms + labels — so the team manages Arabic in T Lab instead of in code.
 * Usage: npx tsx scripts/create-search-config-metaobject.ts
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const raw = await fs.readFile(path.join(ROOT, ".env"), "utf-8");
for (const line of raw.split("\n")) {
  const m = line.trim().match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].trim().replace(/^["']|["']$/g, "");
}
const SHOP = process.env.PUBLIC_STORE_DOMAIN!;
const TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN!;
const V = process.env.PUBLIC_STOREFRONT_API_VERSION || "2025-07";
if (!SHOP || !TOKEN) { console.error("❌  Missing PUBLIC_STORE_DOMAIN / SHOPIFY_ADMIN_API_TOKEN in .env"); process.exit(1); }

async function gql<T = any>(query: string, variables?: any): Promise<T> {
  const r = await fetch(`https://${SHOP}/admin/api/${V}/graphql.json`, {
    method: "POST",
    headers: { "X-Shopify-Access-Token": TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const j: any = await r.json();
  if (j.errors) throw new Error(JSON.stringify(j.errors));
  return j.data as T;
}

const TYPE = "mls_search_config";

// ── 1. Definition (translatable so T Lab can localize every field) ────────────
const existing = await gql<any>(`{ metaobjectDefinitionByType(type: "${TYPE}") { id } }`);
if (!existing?.metaobjectDefinitionByType?.id) {
  console.log("📦  Creating definition…");
  const res = await gql<any>(
    `mutation Create($def: MetaobjectDefinitionCreateInput!) {
       metaobjectDefinitionCreate(definition: $def) {
         metaobjectDefinition { id }
         userErrors { field message }
       }
     }`,
    {
      def: {
        type: TYPE,
        name: "Search Config",
        access: { storefront: "PUBLIC_READ" },
        capabilities: { translatable: { enabled: true } },
        fieldDefinitions: [
          { key: "popular_terms",     name: "Popular search terms (| separated)", type: "single_line_text_field" },
          { key: "label_recent",      name: "Label: Recent searches",  type: "single_line_text_field" },
          { key: "label_popular",     name: "Label: Popular searches", type: "single_line_text_field" },
          { key: "label_clear",       name: "Label: Clear",            type: "single_line_text_field" },
          { key: "label_collections", name: "Label: Collections",      type: "single_line_text_field" },
          { key: "label_pages",       name: "Label: Pages",            type: "single_line_text_field" },
          { key: "label_articles",    name: "Label: Articles",         type: "single_line_text_field" },
          { key: "label_showing_for", name: "Label: Showing results for", type: "single_line_text_field" },
        ],
      },
    }
  );
  const errs = res?.metaobjectDefinitionCreate?.userErrors ?? [];
  if (errs.length) { console.error("❌", JSON.stringify(errs)); process.exit(1); }
  console.log("✅  Definition created.");
} else {
  console.log("ℹ️   Definition already exists.");
}

// ── 2. Seed the English entry (team translates these in T Lab → Metaobjects) ──
console.log("📦  Seeding English entry…");
const seed = await gql<any>(
  `mutation Create($o: MetaobjectCreateInput!) {
     metaobjectCreate(metaobject: $o) { metaobject { handle } userErrors { field message } }
   }`,
  {
    o: {
      type: TYPE,
      handle: "search-config",
      fields: [
        { key: "popular_terms",     value: "Wagyu|Angus Beef|Burgers|Lamb Carcass|Mishkak|Ribeye|Chicken" },
        { key: "label_recent",      value: "Recent searches" },
        { key: "label_popular",     value: "Popular searches" },
        { key: "label_clear",       value: "Clear" },
        { key: "label_collections", value: "Collections" },
        { key: "label_pages",       value: "Pages" },
        { key: "label_articles",    value: "Articles" },
        { key: "label_showing_for", value: "Showing results for" },
      ],
    },
  }
);
const serrs = seed?.metaobjectCreate?.userErrors ?? [];
if (serrs.length) {
  const msg = JSON.stringify(serrs);
  if (/taken|already/i.test(msg)) console.log("ℹ️   Entry already exists — skipping seed.");
  else console.error("❌", msg);
} else {
  console.log("✅  Seeded entry 'search-config'.");
}
console.log("\n📋  Team translates in: Shopify → Apps → T Lab → Metaobjects → Search Config (Arabic).");
