#!/usr/bin/env node
/**
 * reseed-origin-items.ts
 *
 * 1. Deletes all existing mls_origin_item entries
 * 2. Creates clean items matching the Liquid theme data
 *    (Image field left empty — upload via Shopify Admin)
 * 3. Re-links them into the mls_origin_section entry
 *
 * Usage:
 *   npx tsx scripts/reseed-origin-items.ts
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

// ── Target items matching Liquid theme ────────────────────────────────────
// Add image GIDs later via Shopify Admin → Content → Metaobjects → Origin Item
const ITEMS: Array<{ handle: string; heading: string; link: string; category: string }> = [
  // Beef
  { handle: "beef-australian-wagyu-mb",    heading: "Australian Wagyu Beef MB4/5",  link: "/collections/wagyu-beef",              category: "beef" },
  { handle: "beef-australian-black-angus", heading: "Australian Black Angus",        link: "/collections/black-angus",             category: "beef" },
  { handle: "beef-australian-grass-fed",   heading: "Australian Grass-fed Beef",     link: "/collections/australian-beef",         category: "beef" },
  { handle: "beef-nz-grass-fed",           heading: "New Zealand Grass-fed Beef",    link: "/collections/new-zealand-beef",        category: "beef" },
  { handle: "beef-south-african",          heading: "South African Grass-fed Beef",  link: "/collections/south-african-beef",      category: "beef" },
  { handle: "beef-pakistani",              heading: "Pakistani Beef",                link: "/collections/pakistani-beef",          category: "beef" },
  { handle: "beef-us-black-angus",         heading: "US Black Angus",                link: "/collections/us-beef",                 category: "beef" },
  { handle: "beef-brazilian-grass-fed",    heading: "Brazilian Grass-fed Beef",      link: "/collections/brazilian-beef",          category: "beef" },
  { handle: "beef-japanese-a5-wagyu",      heading: "Japanese A5 Wagyu Beef",        link: "/collections/japanese-wagyu",          category: "beef" },

  // Lamb
  { handle: "lamb-australian-grass-fed",   heading: "Australian Grass-fed Mutton",   link: "/collections/australian-lamb",         category: "lamb" },
  { handle: "lamb-pakistani",              heading: "Pakistani Mutton",              link: "/collections/pakistani-lamb",          category: "lamb" },
  { handle: "lamb-somali",                 heading: "Somali Fresh Lamb",             link: "/collections/somali-lamb",             category: "lamb" },
  { handle: "lamb-indian",                 heading: "Indian Fresh Mutton",           link: "/collections/indian-lamb",             category: "lamb" },
  { handle: "lamb-nz",                     heading: "New Zealand Lamb",              link: "/collections/new-zealand-lamb",        category: "lamb" },

  // Ostrich
  { handle: "ostrich-south-african",       heading: "South African Ostrich",         link: "/collections/ostrich",                 category: "ostrich" },
  { handle: "ostrich-namibian",            heading: "Namibian Ostrich",              link: "/collections/ostrich",                 category: "ostrich" },

  // Veal
  { handle: "veal-dutch-frozen",           heading: "Frozen Dutch Veal",             link: "/collections/veal",                    category: "veal" },
  { handle: "veal-french",                 heading: "French Veal",                   link: "/collections/veal",                    category: "veal" },
  { handle: "veal-australian",             heading: "Australian Veal",               link: "/collections/veal",                    category: "veal" },

  // Venison
  { handle: "venison-nz",                  heading: "New Zealand Grass-fed Venison", link: "/collections/venison",                 category: "venison" },
  { handle: "venison-scottish",            heading: "Scottish Venison",              link: "/collections/venison",                 category: "venison" },
];

// ── 1. Fetch & delete all existing items ──────────────────────────────────
console.log("\n🔍  Fetching existing origin items...");
const existing = await cli<any>(
  `{ metaobjects(type: "mls_origin_item", first: 50) { nodes { id handle } } }`
);
const existingNodes: Array<{ id: string; handle: string }> = existing?.metaobjects?.nodes ?? [];
console.log(`   Found ${existingNodes.length} existing items — deleting...`);

for (const node of existingNodes) {
  const res = await cli<any>(
    `mutation Del($id: ID!) { metaobjectDelete(id: $id) { deletedId userErrors { message } } }`,
    { id: node.id }
  );
  const errs = res?.metaobjectDelete?.userErrors ?? [];
  if (errs.length) {
    console.warn(`   ⚠  ${node.handle}: ${errs.map((e: any) => e.message).join(", ")}`);
  } else {
    console.log(`   🗑  Deleted ${node.handle}`);
  }
}

// ── 2. Create new items ───────────────────────────────────────────────────
console.log(`\n📦  Creating ${ITEMS.length} origin items...`);
const createdIds: string[] = [];

for (const item of ITEMS) {
  const res = await cli<any>(
    `mutation Create($obj: MetaobjectCreateInput!) {
       metaobjectCreate(metaobject: $obj) {
         metaobject { id handle }
         userErrors { field message }
       }
     }`,
    {
      obj: {
        type: "mls_origin_item",
        handle: item.handle,
        fields: [
          { key: "heading",  value: item.heading },
          { key: "link",     value: item.link },
          { key: "category", value: item.category },
          // image left blank — upload via Shopify Admin
        ],
      },
    }
  );
  const errs = res?.metaobjectCreate?.userErrors ?? [];
  if (errs.length) {
    console.warn(`   ⚠  ${item.handle}: ${errs.map((e: any) => e.message).join(", ")}`);
  } else {
    const id = res?.metaobjectCreate?.metaobject?.id;
    if (id) createdIds.push(id);
    console.log(`   ✅  [${item.category}] ${item.heading}`);
  }
}

// ── 3. Update section items list ──────────────────────────────────────────
console.log(`\n📦  Updating origin section with ${createdIds.length} items...`);
const sectionRes = await cli<any>(
  `{ metaobjects(type: "mls_origin_section", first: 1) { nodes { id } } }`
);
const sectionId = sectionRes?.metaobjects?.nodes?.[0]?.id;

const updateRes = await cli<any>(
  `mutation Update($id: ID!, $fields: [MetaobjectFieldInput!]!) {
     metaobjectUpdate(id: $id, metaobject: { fields: $fields }) {
       metaobject { handle }
       userErrors { field message }
     }
   }`,
  { id: sectionId, fields: [{ key: "items", value: JSON.stringify(createdIds) }] }
);

const errs = updateRes?.metaobjectUpdate?.userErrors ?? [];
if (errs.length) {
  console.error("❌", errs.map((e: any) => e.message).join("; "));
} else {
  console.log(`✅  Done! ${createdIds.length} items linked to section.`);
  console.log(`\n📋  Next: add flag images in Shopify Admin → Content → Metaobjects → Origin Item`);
  console.log(`   Each item has: Heading ✅ | Link ✅ | Category ✅ | Image ⬜ (upload manually)`);
}
