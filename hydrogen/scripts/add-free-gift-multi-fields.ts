#!/usr/bin/env node
/**
 * add-free-gift-multi-fields.ts
 *
 * Adds the multi-gift slots to the Oman `mls_free_gift_rule` metaobject definition so a single
 * rule can hand out up to 4 free products in one order (matching the UAE store). The storefront
 * engine already reads these fields (see parseFreeGiftRules in app/root.tsx); this just extends the
 * schema so they can be populated in Admin → Content → Metaobjects → Free Gift Rule.
 *
 * Idempotent: only creates fields that don't already exist.
 *
 * Usage: npx tsx scripts/add-free-gift-multi-fields.ts
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
if (!SHOP) { console.error("❌  Set PUBLIC_STORE_DOMAIN in .env"); process.exit(1); }
if (!TOKEN) { console.error("❌  Set SHOPIFY_ADMIN_API_TOKEN in .env (needs write_metaobject_definitions)"); process.exit(1); }

// Talks to the Admin GraphQL API directly with the private token (no Shopify CLI auth required).
async function cli<T = any>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(`https://${SHOP}/admin/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: { "X-Shopify-Access-Token": TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const json: any = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data as T;
}

const TYPE = "mls_free_gift_rule";

// The multi-gift slots (variant + quantity), matching the UAE definition. free_variant (slot 1)
// already exists; free_variant_qty is added so slot 1 can also have a quantity.
const WANT: Array<{ key: string; name: string; type: string }> = [
  { key: "free_variant_qty",   name: "Free variant 1 quantity", type: "number_integer" },
  { key: "free_variant_2",     name: "Free variant 2",          type: "variant_reference" },
  { key: "free_variant_2_qty", name: "Free variant 2 quantity", type: "number_integer" },
  { key: "free_variant_3",     name: "Free variant 3",          type: "variant_reference" },
  { key: "free_variant_3_qty", name: "Free variant 3 quantity", type: "number_integer" },
  { key: "free_variant_4",     name: "Free variant 4",          type: "variant_reference" },
  { key: "free_variant_4_qty", name: "Free variant 4 quantity", type: "number_integer" },
];

// ── 1. Read current definition ────────────────────────────────────────────────
console.log(`\n🔍  Reading ${TYPE} definition...`);
const cur = await cli<any>(
  `{ metaobjectDefinitionByType(type: "${TYPE}") { id fieldDefinitions { key } } }`
);
const def = cur?.metaobjectDefinitionByType;
if (!def?.id) { console.error(`❌  Definition ${TYPE} not found.`); process.exit(1); }

const existing = new Set((def.fieldDefinitions ?? []).map((f: any) => f.key));
const toAdd = WANT.filter((f) => !existing.has(f.key));

if (toAdd.length === 0) {
  console.log("ℹ️   All multi-gift fields already exist — nothing to do.");
  process.exit(0);
}
console.log(`📦  Adding ${toAdd.length} field(s): ${toAdd.map((f) => f.key).join(", ")}`);

// ── 2. Add the missing fields ─────────────────────────────────────────────────
const res = await cli<any>(
  `mutation Upd($id: ID!, $def: MetaobjectDefinitionUpdateInput!) {
     metaobjectDefinitionUpdate(id: $id, definition: $def) {
       metaobjectDefinition { id fieldDefinitions { key } }
       userErrors { field message code }
     }
   }`,
  {
    id: def.id,
    def: { fieldDefinitions: toAdd.map((f) => ({ create: { key: f.key, name: f.name, type: f.type } })) },
  }
);

const errs = res?.metaobjectDefinitionUpdate?.userErrors ?? [];
if (errs.length) {
  console.error("❌", JSON.stringify(errs, null, 2));
  process.exit(1);
}

const keys = (res?.metaobjectDefinitionUpdate?.metaobjectDefinition?.fieldDefinitions ?? [])
  .map((f: any) => f.key);
console.log("✅  Done. Definition now has fields:");
console.log("   " + keys.join(", "));
console.log("\n📋  Configure gifts in Shopify Admin → Content → Metaobjects → Free Gift Rule");
console.log("   Each rule can now set free_variant + free_variant_2/3/4 (with per-slot quantities).");
