#!/usr/bin/env node
/**
 * add-country-codes.ts
 * 1. Adds country_code field to mls_origin_item definition
 * 2. Seeds ISO 3166-1 alpha-2 codes for all items
 *
 * Usage: npx tsx scripts/add-country-codes.ts
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
if (!SHOP) { console.error("❌  Set PUBLIC_STORE_DOMAIN in .env"); process.exit(1); }

async function cli<T = any>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const tmp = os.tmpdir();
  const qf = path.join(tmp, `mls-q-${Date.now()}.graphql`);
  const vf = path.join(tmp, `mls-v-${Date.now()}.json`);
  const isMut = /^\s*mutation/i.test(query);
  try {
    await fs.writeFile(qf, Buffer.from(query, "utf8"));
    if (variables) await fs.writeFile(vf, Buffer.from(JSON.stringify(variables), "utf8"));
    const args = ["shopify", "store", "execute", "--store", SHOP, "--query-file", qf, "--json",
      ...(variables ? ["--variable-file", vf] : []), ...(isMut ? ["--allow-mutations"] : [])];
    const raw = execSync(`npx ${args.join(" ")}`, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
    return JSON.parse(raw) as T;
  } finally {
    await fs.unlink(qf).catch(() => {});
    if (variables) await fs.unlink(vf).catch(() => {});
  }
}

// ── Handle → ISO country code ─────────────────────────────────────────────
const HANDLE_CODES: Record<string, string> = {
  "beef-australian-wagyu-mb":    "au",
  "beef-australian-black-angus": "au",
  "beef-australian-grass-fed":   "au",
  "beef-nz-grass-fed":           "nz",
  "beef-south-african":          "za",
  "beef-pakistani":              "pk",
  "beef-us-black-angus":         "us",
  "beef-brazilian-grass-fed":    "br",
  "beef-japanese-a5-wagyu":      "jp",
  "lamb-australian-grass-fed":   "au",
  "lamb-pakistani":              "pk",
  "lamb-somali":                 "so",
  "lamb-indian":                 "in",
  "lamb-nz":                     "nz",
  "ostrich-south-african":       "za",
  "ostrich-namibian":            "na",
  "veal-dutch-frozen":           "nl",
  "veal-french":                 "fr",
  "veal-australian":             "au",
  "venison-nz":                  "nz",
  "venison-scottish":            "gb",
};

// ── 1. Check / add country_code field ────────────────────────────────────
console.log("\n🔍  Checking mls_origin_item definition...");
const defRes = await cli<any>(
  `{ metaobjectDefinitionByType(type: "mls_origin_item") { id fieldDefinitions { key } } }`
);
const def = defRes?.metaobjectDefinitionByType;
const existingKeys: string[] = def?.fieldDefinitions?.map((f: any) => f.key) ?? [];
console.log(`   Fields: ${existingKeys.join(", ")}`);

if (!existingKeys.includes("country_code")) {
  console.log(`   Adding "country_code" field...`);
  const addRes = await cli<any>(
    `mutation Up($id: ID!, $def: MetaobjectDefinitionUpdateInput!) {
       metaobjectDefinitionUpdate(id: $id, definition: $def) {
         metaobjectDefinition { id }
         userErrors { field message }
       }
     }`,
    {
      id: def.id,
      def: {
        fieldDefinitions: [{
          create: {
            key: "country_code",
            name: "Country Code",
            type: "single_line_text_field",
            description: "ISO 3166-1 alpha-2 code (e.g. au, nz, pk) — used for flag display",
          },
        }],
      },
    }
  );
  const errs = addRes?.metaobjectDefinitionUpdate?.userErrors ?? [];
  if (errs.length) { console.error("❌", errs.map((e: any) => e.message).join("; ")); process.exit(1); }
  console.log(`   ✅  "country_code" field added`);
} else {
  console.log(`   ℹ️   "country_code" already exists`);
}

// ── 2. Fetch all items and seed country codes ──────────────────────────────
console.log(`\n📦  Seeding country codes...`);
const itemsRes = await cli<any>(
  `{ metaobjects(type: "mls_origin_item", first: 50) { nodes { id handle } } }`
);
const items: Array<{ id: string; handle: string }> = itemsRes?.metaobjects?.nodes ?? [];

for (const item of items) {
  const code = HANDLE_CODES[item.handle];
  if (!code) {
    console.warn(`   ⚠  No code mapped for handle: ${item.handle}`);
    continue;
  }
  const res = await cli<any>(
    `mutation Up($id: ID!, $fields: [MetaobjectFieldInput!]!) {
       metaobjectUpdate(id: $id, metaobject: { fields: $fields }) {
         metaobject { handle }
         userErrors { field message }
       }
     }`,
    { id: item.id, fields: [{ key: "country_code", value: code }] }
  );
  const errs = res?.metaobjectUpdate?.userErrors ?? [];
  if (errs.length) {
    console.warn(`   ⚠  ${item.handle}: ${errs.map((e: any) => e.message).join(", ")}`);
  } else {
    console.log(`   ✅  ${item.handle} → ${code}`);
  }
}

console.log(`\n✅  Done! Country codes seeded for ${items.length} items.`);
