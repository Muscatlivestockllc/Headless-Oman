#!/usr/bin/env node
/**
 * create-category-metaobjects.ts
 *
 * Creates metaobject definitions and sample entries for the Shop by Category section:
 *   mls_category_item    → single category card (heading, url, image)
 *   mls_category_section → section wrapper (eyebrow, heading, list of items)
 *
 * Usage:
 *   npm run create:categories
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

async function loadDotEnv() {
  try {
    const raw = await fs.readFile(path.join(ROOT, ".env"), "utf-8");
    for (const line of raw.split("\n")) {
      const m = line.trim().match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
      if (!m) continue;
      process.env[m[1]] ??= m[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch {}
}

await loadDotEnv();

const SHOP = process.env.PUBLIC_STORE_DOMAIN ?? "";
const TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN ?? "";
const API_VERSION = process.env.PUBLIC_STOREFRONT_API_VERSION ?? "2025-07";

if (!SHOP || !TOKEN) {
  console.error("❌  Set PUBLIC_STORE_DOMAIN and SHOPIFY_ADMIN_API_TOKEN in .env");
  process.exit(1);
}

async function adminGql<T = any>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(`https://${SHOP}/admin/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as any;
  if (json.errors?.length) throw new Error(json.errors.map((e: any) => e.message).join("; "));
  return json as T;
}

async function definitionExists(type: string): Promise<boolean> {
  const res = await adminGql(`
    query { metaobjectDefinitionByType(type: "${type}") { id } }
  `);
  return !!res.data?.metaobjectDefinitionByType?.id;
}

async function upsertDefinition(def: any): Promise<string> {
  const exists = await definitionExists(def.type);
  if (exists) {
    console.log(`  ↩ definition "${def.type}" already exists, skipping`);
    const res = await adminGql(`
      query { metaobjectDefinitionByType(type: "${def.type}") { id } }
    `);
    return res.data.metaobjectDefinitionByType.id;
  }
  const res = await adminGql(`
    mutation CreateDef($def: MetaobjectDefinitionCreateInput!) {
      metaobjectDefinitionCreate(definition: $def) {
        metaobjectDefinition { id type }
        userErrors { field message }
      }
    }
  `, { def });
  const errs = res.data?.metaobjectDefinitionCreate?.userErrors ?? [];
  if (errs.length) throw new Error(errs.map((e: any) => e.message).join("; "));
  const id = res.data.metaobjectDefinitionCreate.metaobjectDefinition.id;
  console.log(`  ✓ created definition "${def.type}" → ${id}`);
  return id;
}

async function upsertObject(type: string, handle: string, fields: any[]): Promise<string> {
  // Try to find existing
  const existing = await adminGql(`
    query { metaobjectByHandle(handle: { type: "${type}", handle: "${handle}" }) { id handle } }
  `);
  if (existing.data?.metaobjectByHandle?.id) {
    const id = existing.data.metaobjectByHandle.id;
    console.log(`  ↩ "${handle}" exists → ${id}, updating`);
    await adminGql(`
      mutation UpdateObj($id: ID!, $mo: MetaobjectUpdateInput!) {
        metaobjectUpdate(id: $id, metaobject: $mo) {
          metaobject { id handle }
          userErrors { field message }
        }
      }
    `, { id, mo: { fields } });
    return id;
  }
  const res = await adminGql(`
    mutation CreateObj($mo: MetaobjectCreateInput!) {
      metaobjectCreate(metaobject: $mo) {
        metaobject { id handle }
        userErrors { field message }
      }
    }
  `, { mo: { type, handle, fields } });
  const errs = res.data?.metaobjectCreate?.userErrors ?? [];
  if (errs.length) {
    console.warn(`  ⚠ errors for "${handle}":`, errs.map((e: any) => e.message).join("; "));
  }
  const id = res.data?.metaobjectCreate?.metaobject?.id ?? "";
  console.log(`  ✓ created "${handle}" → ${id}`);
  return id;
}

// ── Step 1: Create mls_category_item definition ─────────────────────────────
console.log("\n─── Creating mls_category_item definition ───");
await upsertDefinition({
  name: "Category Item",
  type: "mls_category_item",
  access: { storefront: "PUBLIC_READ" },
  capabilities: { translatable: { enabled: true } },
  fieldDefinitions: [
    { name: "Heading", key: "heading", type: "single_line_text_field", required: true },
    { name: "URL", key: "url", type: "url" },
    { name: "Image", key: "image", type: "file_reference" },
  ],
});

// ── Step 2: Get mls_category_item definition ID for reference field ──────────
const itemDefRes = await adminGql(`
  query { metaobjectDefinitionByType(type: "mls_category_item") { id } }
`);
const itemDefId = itemDefRes.data.metaobjectDefinitionByType.id;
console.log("mls_category_item definition ID:", itemDefId);

// ── Step 3: Create mls_category_section definition ──────────────────────────
console.log("\n─── Creating mls_category_section definition ───");
await upsertDefinition({
  name: "Category Section",
  type: "mls_category_section",
  access: { storefront: "PUBLIC_READ" },
  capabilities: { translatable: { enabled: true } },
  fieldDefinitions: [
    { name: "Eyebrow", key: "eyebrow", type: "single_line_text_field" },
    { name: "Heading", key: "heading", type: "single_line_text_field" },
    {
      name: "Items",
      key: "items",
      type: "list.metaobject_reference",
      validations: [{ name: "metaobject_definition_id", value: itemDefId }],
    },
  ],
});

// ── Step 4: Create category item entries ────────────────────────────────────
console.log("\n─── Creating category item entries ───");

const ITEMS = [
  { handle: "cat-beef",    heading: "Beef",    url: "/collections/all-beef" },
  { handle: "cat-lamb",    heading: "Lamb",    url: "/collections/all-lamb" },
  { handle: "cat-mutton",  heading: "Mutton",  url: "/collections/all-mutton" },
  { handle: "cat-wagyu",   heading: "Wagyu",   url: "/collections/australian-wagyu-beef-mb-4-5" },
  { handle: "cat-veal",    heading: "Veal",    url: "/collections/all" },
  { handle: "cat-ostrich", heading: "Ostrich", url: "/collections/all" },
  { handle: "cat-poultry", heading: "Poultry", url: "/collections/all" },
  { handle: "cat-sausages",heading: "Sausages",url: "/collections/all" },
];

const itemIds: string[] = [];
for (const item of ITEMS) {
  const id = await upsertObject("mls_category_item", item.handle, [
    { key: "heading", value: item.heading },
    { key: "url", value: item.url },
  ]);
  itemIds.push(id);
}

// ── Step 5: Create mls_category_section entry ───────────────────────────────
console.log("\n─── Creating category section entry ───");
await upsertObject("mls_category_section", "shop-by-category", [
  { key: "eyebrow", value: "Browse the Butcher" },
  { key: "heading", value: "Shop by Category" },
  { key: "items", value: JSON.stringify(itemIds) },
]);

console.log("\n--- All done! ---");
