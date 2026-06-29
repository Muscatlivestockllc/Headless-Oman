#!/usr/bin/env node
/**
 * create-nav-metaobjects.ts
 *
 * Creates the three metaobject definitions required for the dynamic header nav:
 *   mls_nav_link   → individual link (label + url)
 *   mls_nav_column → mega menu column (title + list of links)
 *   mls_nav_entry  → top-level nav item (label, url, menu, position, columns)
 *
 * Usage:
 *   npm run create:nav
 *
 * Requires in .env:
 *   SHOPIFY_ADMIN_API_TOKEN  — Admin API token with write_metaobject_definitions + write_metaobjects
 *   PUBLIC_STORE_DOMAIN      — e.g. mls-uae-test-store.myshopify.com
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

async function definitionId(type: string): Promise<string | null> {
  const data = await adminGql<any>(
    `query { metaobjectDefinitionByType(type: "${type}") { id } }`
  );
  return data?.data?.metaobjectDefinitionByType?.id ?? null;
}

async function createDefinition(def: {
  name: string;
  type: string;
  fields: Array<{ key: string; name: string; type: string }>;
}): Promise<string> {
  const data = await adminGql<any>(
    `mutation CreateDef($def: MetaobjectDefinitionCreateInput!) {
      metaobjectDefinitionCreate(definition: $def) {
        metaobjectDefinition { id type }
        userErrors { field message }
      }
    }`,
    {
      def: {
        name: def.name,
        type: def.type,
        access: { storefront: "PUBLIC_READ" },
        capabilities: { translatable: { enabled: true } },
        fieldDefinitions: def.fields.map((f) => ({
          key: f.key,
          name: f.name,
          type: f.type,
        })),
      },
    }
  );

  const result = data?.data?.metaobjectDefinitionCreate;
  if (result?.userErrors?.length) {
    throw new Error(result.userErrors.map((e: any) => `${e.field}: ${e.message}`).join("; "));
  }
  return result?.metaobjectDefinition?.id as string;
}

async function updateDefinitionWithReference(
  type: string,
  fieldKey: string,
  fieldName: string,
  referencedDefId: string
): Promise<void> {
  const currentId = await definitionId(type);
  if (!currentId) throw new Error(`Definition not found: ${type}`);

  const data = await adminGql<any>(
    `mutation UpdateDef($id: ID!, $def: MetaobjectDefinitionUpdateInput!) {
      metaobjectDefinitionUpdate(id: $id, definition: $def) {
        metaobjectDefinition { id }
        userErrors { field message }
      }
    }`,
    {
      id: currentId,
      def: {
        fieldDefinitions: [
          {
            create: {
              key: fieldKey,
              name: fieldName,
              type: "list.metaobject_reference",
              validations: [
                { name: "metaobject_definition_id", value: referencedDefId },
              ],
            },
          },
        ],
      },
    }
  );

  const result = data?.data?.metaobjectDefinitionUpdate;
  if (result?.userErrors?.length) {
    throw new Error(result.userErrors.map((e: any) => `${e.field}: ${e.message}`).join("; "));
  }
}

async function ensureDefinition(def: {
  name: string;
  type: string;
  fields: Array<{ key: string; name: string; type: string }>;
}): Promise<string> {
  const existing = await definitionId(def.type);
  if (existing) {
    console.log(`  ✓  ${def.type} already exists (${existing})`);
    return existing;
  }
  const id = await createDefinition(def);
  console.log(`  ✅  Created ${def.type} → ${id}`);
  return id;
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log(`\n🚀  Creating nav metaobject definitions`);
console.log(`    Store: ${SHOP}  API: ${API_VERSION}\n`);

// Step 1 — mls_nav_link (leaf link — label + url only, no references)
const linkId = await ensureDefinition({
  name: "Nav Link",
  type: "mls_nav_link",
  fields: [
    { key: "label", name: "Label", type: "single_line_text_field" },
    { key: "url",   name: "URL",   type: "single_line_text_field" },
  ],
});

// Step 2 — mls_nav_column (title + links reference — added after link def exists)
const colId = await ensureDefinition({
  name: "Nav Column",
  type: "mls_nav_column",
  fields: [
    { key: "title", name: "Title", type: "single_line_text_field" },
  ],
});

// Add the links list reference to mls_nav_column now that mls_nav_link exists
try {
  await updateDefinitionWithReference("mls_nav_column", "links", "Links", linkId);
  console.log(`  ✅  Added 'links' field to mls_nav_column → references mls_nav_link`);
} catch (e: any) {
  if (/already.*exist|duplicate/i.test(e.message)) {
    console.log(`  ✓  'links' field already exists on mls_nav_column`);
  } else {
    console.warn(`  ⚠  links field: ${e.message}`);
  }
}

// Step 3 — mls_nav_entry (top-level nav item, with columns reference)
await ensureDefinition({
  name: "Nav Entry",
  type: "mls_nav_entry",
  fields: [
    { key: "label",    name: "Label",    type: "single_line_text_field" },
    { key: "url",      name: "URL",      type: "single_line_text_field" },
    { key: "menu",     name: "Menu",     type: "single_line_text_field" },
    { key: "position", name: "Position", type: "number_integer" },
  ],
});

try {
  await updateDefinitionWithReference("mls_nav_entry", "columns", "Columns", colId);
  console.log(`  ✅  Added 'columns' field to mls_nav_entry → references mls_nav_column`);
} catch (e: any) {
  if (/already.*exist|duplicate/i.test(e.message)) {
    console.log(`  ✓  'columns' field already exists on mls_nav_entry`);
  } else {
    console.warn(`  ⚠  columns field: ${e.message}`);
  }
}

console.log(`\n✨  Done! Go to Shopify Admin → Content → Metaobjects to add your nav items.\n`);
