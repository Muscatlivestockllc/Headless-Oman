#!/usr/bin/env node
/**
 * create-cart-drawer-metaobject.ts
 *
 * Creates the mls_cart_drawer_config metaobject definition and seeds one entry.
 *
 * Usage:
 *   npx tsx scripts/create-cart-drawer-metaobject.ts
 *
 * Requires in .env:
 *   SHOPIFY_ADMIN_API_TOKEN  — Admin API token with write_metaobject_definitions + write_metaobjects
 *   PUBLIC_STORE_DOMAIN      — e.g. your-store.myshopify.com
 *
 * In Shopify Admin you can then edit the values at:
 *   Content → Metaobjects → Cart Drawer Config → cart-drawer-config
 *
 * Supported text formatting in delivery items:
 *   **bold text** → renders as <strong> in the cart drawer
 *   Plain text is rendered as-is.
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
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${TOKEN}` },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as any;
  if (json.errors?.length) throw new Error(json.errors.map((e: any) => e.message).join("; "));
  return json as T;
}

async function definitionExists(type: string): Promise<boolean> {
  const data = await adminGql<any>(
    `query { metaobjectDefinitionByType(type: "${type}") { id } }`
  );
  return !!data?.data?.metaobjectDefinitionByType?.id;
}

// ── 1. Create definition ──────────────────────────────────────────────────────
const TYPE = "mls_cart_drawer_config";

if (await definitionExists(TYPE)) {
  console.log(`ℹ️  Definition "${TYPE}" already exists — skipping creation.`);
} else {
  const res = await adminGql<any>(
    `mutation CreateDef($def: MetaobjectDefinitionCreateInput!) {
       metaobjectDefinitionCreate(definition: $def) {
         metaobjectDefinition { id type }
         userErrors { field message }
       }
     }`,
    {
      def: {
        name: "Cart Drawer Config",
        type: TYPE,
        access: { storefront: "PUBLIC_READ" },
        capabilities: { translatable: { enabled: true } },
        fieldDefinitions: [
          { key: "free_shipping_threshold", name: "Free Shipping Threshold (AED)", type: "number_integer", required: true },
          { key: "delivery_item_1", name: "Delivery Item 1", type: "multi_line_text_field" },
          { key: "delivery_item_2", name: "Delivery Item 2", type: "multi_line_text_field" },
          { key: "delivery_item_3", name: "Delivery Item 3", type: "multi_line_text_field" },
          { key: "delivery_item_4", name: "Delivery Item 4", type: "multi_line_text_field" },
          { key: "delivery_item_5", name: "Delivery Item 5", type: "multi_line_text_field" },
          { key: "delivery_item_6", name: "Delivery Item 6", type: "multi_line_text_field" },
        ],
      },
    }
  );
  const errs = res?.data?.metaobjectDefinitionCreate?.userErrors ?? [];
  if (errs.length) throw new Error(errs.map((e: any) => e.message).join("; "));
  console.log(`✅  Created definition "${TYPE}"`);
}

// ── 2. Seed one entry ─────────────────────────────────────────────────────────
const seedRes = await adminGql<any>(
  `mutation CreateObj($obj: MetaobjectCreateInput!) {
     metaobjectCreate(metaobject: $obj) {
       metaobject { id handle }
       userErrors { field message }
     }
   }`,
  {
    obj: {
      type: TYPE,
      handle: "cart-drawer-config",
      fields: [
        { key: "free_shipping_threshold", value: "350" },
        {
          key: "delivery_item_1",
          value:
            "Delivered within **2hrs** in Dubai. For Sharjah and Ajman same day delivery for orders confirmed before **1:00 PM**",
        },
        { key: "delivery_item_2", value: "**10% off** on AED 600 purchase." },
        {
          key: "delivery_item_3",
          value:
            "🎁 **Special Offer Activated:** FREE gift of 2x Angus beef burgers and 1x AUS Grass-fed Beef Striploin on orders above **AED 40** with your first purchase!",
        },
        { key: "delivery_item_4", value: "**Free Shipping** above AED 350" },
        { key: "delivery_item_5", value: "" },
        { key: "delivery_item_6", value: "" },
      ],
    },
  }
);

const seedErrs = seedRes?.data?.metaobjectCreate?.userErrors ?? [];
if (seedErrs.length) {
  console.warn(
    "⚠️  Could not seed entry (may already exist):",
    seedErrs.map((e: any) => e.message).join("; ")
  );
} else {
  console.log(
    `✅  Seeded entry handle="cart-drawer-config" — edit it at Shopify Admin → Content → Metaobjects → Cart Drawer Config`
  );
}
