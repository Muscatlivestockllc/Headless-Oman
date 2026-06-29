#!/usr/bin/env node
/**
 * update-origin-item-def.ts
 *
 * Adds a "category" field to the existing mls_origin_item metaobject definition
 * using Shopify CLI (shopify store execute) — no API token needed.
 *
 * Usage:
 *   npx tsx scripts/update-origin-item-def.ts
 */

import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

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
if (!SHOP) {
  console.error("❌  Set PUBLIC_STORE_DOMAIN in .env");
  process.exit(1);
}

async function shopifyCli<T = any>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const tmp = os.tmpdir();
  const queryFile = path.join(tmp, `mls-q-${Date.now()}.graphql`);
  const varFile = path.join(tmp, `mls-v-${Date.now()}.json`);
  const isMutation = /^\s*mutation/i.test(query);

  try {
    await fs.writeFile(queryFile, Buffer.from(query, "utf8"));
    if (variables) await fs.writeFile(varFile, Buffer.from(JSON.stringify(variables), "utf8"));

    const args = [
      "shopify", "store", "execute",
      "--store", SHOP,
      "--query-file", queryFile,
      "--json",
      ...(variables ? ["--variable-file", varFile] : []),
      ...(isMutation ? ["--allow-mutations"] : []),
    ];

    const raw = execSync(`npx ${args.join(" ")}`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });

    const result = JSON.parse(raw) as any;
    if (result.errors?.length) {
      throw new Error(`GraphQL: ${result.errors.map((e: any) => e.message).join("; ")}`);
    }
    return result as T;
  } finally {
    await fs.unlink(queryFile).catch(() => {});
    if (variables) await fs.unlink(varFile).catch(() => {});
  }
}

// ── 1. Fetch the definition ID ─────────────────────────────────────────────
const TYPE = "mls_origin_item";

console.log(`\n🔍  Looking up definition for "${TYPE}"...`);
const queryRes = await shopifyCli<any>(
  `query { metaobjectDefinitionByType(type: "${TYPE}") { id type fieldDefinitions { key } } }`
);
const def = queryRes?.metaobjectDefinitionByType;
if (!def?.id) {
  console.error(`❌  Definition "${TYPE}" not found. Run create-origin-item-def.graphql first.`);
  process.exit(1);
}

console.log(`✅  Found: ${def.id}`);
const existingKeys: string[] = def.fieldDefinitions.map((f: any) => f.key);
console.log(`   Existing fields: ${existingKeys.join(", ")}`);

if (existingKeys.includes("category")) {
  console.log(`ℹ️   "category" field already exists — nothing to do.`);
  process.exit(0);
}

// ── 2. Add the category field ──────────────────────────────────────────────
console.log(`\n📦  Adding "category" field...`);
const updateRes = await shopifyCli<any>(
  `mutation UpdateDef($id: ID!, $def: MetaobjectDefinitionUpdateInput!) {
     metaobjectDefinitionUpdate(id: $id, definition: $def) {
       metaobjectDefinition { id type }
       userErrors { field message }
     }
   }`,
  {
    id: def.id,
    def: {
      fieldDefinitions: [
        {
          create: {
            key: "category",
            name: "Category",
            type: "single_line_text_field",
            description: "Meat category: beef | lamb | ostrich | veal | venison",
          },
        },
      ],
    },
  }
);

const errs = updateRes?.metaobjectDefinitionUpdate?.userErrors ?? [];
if (errs.length) {
  console.error("❌  Errors:", errs.map((e: any) => e.message).join("; "));
  process.exit(1);
}

console.log(`✅  "category" field added to "${TYPE}"`);
console.log(`\n📋  Next steps:`);
console.log(`   1. Go to Shopify Admin → Content → Metaobjects → Origin Item`);
console.log(`   2. Edit each origin item and set the "Category" field:`);
console.log(`      e.g.  beef | lamb | ostrich | veal | venison  (lowercase)`);
console.log(`   3. The tabs on the home page will appear automatically.`);
