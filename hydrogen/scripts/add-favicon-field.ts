#!/usr/bin/env node
/**
 * add-favicon-field.ts
 * Adds a `favicon` (file_reference) field to the mls_footer_settings metaobject definition.
 * Run once: npx tsx scripts/add-favicon-field.ts
 *
 * After running, go to Shopify Admin → Content → Metaobjects → Footer Settings
 * and upload your favicon image to the new "Favicon" field.
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

const SHOP        = process.env.PUBLIC_STORE_DOMAIN ?? "";
const TOKEN       = process.env.SHOPIFY_ADMIN_API_TOKEN ?? "";
const API_VERSION = "2024-10";

if (!SHOP || !TOKEN) {
  console.error("❌  Set PUBLIC_STORE_DOMAIN and SHOPIFY_ADMIN_API_TOKEN in .env");
  process.exit(1);
}

const GQL_URL = `https://${SHOP}/admin/api/${API_VERSION}/graphql.json`;

async function gql<T = any>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(GQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": TOKEN },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json() as any;
  if (json.errors) {
    console.error("GraphQL errors:", JSON.stringify(json.errors, null, 2));
    throw new Error(json.errors[0].message);
  }
  return json.data as T;
}

// 1. Get the mls_footer_settings definition ID
console.log("🔍  Looking up mls_footer_settings definition...");
const defData = await gql<any>(`{ metaobjectDefinitionByType(type: "mls_footer_settings") { id } }`);
const defId = defData?.metaobjectDefinitionByType?.id;

if (!defId) {
  console.error("❌  mls_footer_settings definition not found. Has it been created?");
  process.exit(1);
}
console.log(`✅  Found definition: ${defId}`);

// 2. Add the favicon field
console.log("📦  Adding favicon field...");
const result = await gql<any>(
  `mutation AddFaviconField($id: ID!, $def: MetaobjectDefinitionUpdateInput!) {
     metaobjectDefinitionUpdate(id: $id, definition: $def) {
       metaobjectDefinition { id }
       userErrors { field message }
     }
   }`,
  {
    id: defId,
    def: {
      fieldDefinitions: [
        {
          create: {
            key:  "favicon",
            name: "Favicon",
            type: "file_reference",
          },
        },
      ],
    },
  }
);

const errs = result?.metaobjectDefinitionUpdate?.userErrors ?? [];
if (errs.length) {
  const msg = errs.map((e: any) => e.message).join("; ");
  if (msg.toLowerCase().includes("taken") || msg.toLowerCase().includes("already")) {
    console.log("ℹ️   favicon field already exists — nothing to do.");
  } else {
    console.error("❌", msg);
    process.exit(1);
  }
} else {
  console.log("✅  favicon field added successfully.");
}

console.log(`
Next steps:
  1. Go to Shopify Admin → Content → Metaobjects → Footer Settings
  2. Open the existing entry
  3. Upload your favicon image to the new "Favicon" field
  4. Save — the site will use it automatically on next page load
`);
