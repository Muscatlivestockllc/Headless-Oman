#!/usr/bin/env node
/**
 * seed-origin-categories.ts
 *
 * 1. Updates existing mls_origin_item entries with a "category" value.
 * 2. Creates new origin items (with better names) to cover Beef, Lamb,
 *    Ostrich, Veal, and Venison tabs shown in the design.
 *
 * Usage:
 *   npx tsx scripts/seed-origin-categories.ts
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
    const args = [
      "shopify", "store", "execute",
      "--store", SHOP,
      "--query-file", qf,
      "--json",
      ...(variables ? ["--variable-file", vf] : []),
      ...(isMut ? ["--allow-mutations"] : []),
    ];
    const raw = execSync(`npx ${args.join(" ")}`, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
    return JSON.parse(raw) as T;
  } finally {
    await fs.unlink(qf).catch(() => {});
    if (variables) await fs.unlink(vf).catch(() => {});
  }
}

// ── Category mapping for existing items (GID → category) ─────────────────
const ID_CATEGORY_MAP: Array<{ id: string; handle: string; category: string }> = [
  { id: "gid://shopify/Metaobject/276416266309", handle: "origin-australia",   category: "beef" },
  { id: "gid://shopify/Metaobject/276416331845", handle: "origin-new-zealand", category: "lamb" },
  { id: "gid://shopify/Metaobject/276416364613", handle: "origin-japan",       category: "beef" },
  { id: "gid://shopify/Metaobject/276416397381", handle: "origin-south-africa",category: "beef" },
  { id: "gid://shopify/Metaobject/276416430149", handle: "origin-usa",         category: "beef" },
  { id: "gid://shopify/Metaobject/276416495685", handle: "origin-pakistan",    category: "beef" },
  { id: "gid://shopify/Metaobject/276416528453", handle: "origin-grass-fed",   category: "beef" },
];

// ── New items to create (to fill all tabs) ────────────────────────────────
const NEW_ITEMS: Array<{ handle: string; heading: string; code: string; link: string; category: string }> = [
  // Beef
  { handle: "origin-brazil-beef",     heading: "Brazilian Grass-fed Beef", code: "BR", link: "/search?q=brazil+beef",      category: "beef" },
  { handle: "origin-uk-beef",         heading: "British Beef",              code: "GB", link: "/search?q=british+beef",     category: "beef" },
  { handle: "origin-ireland-beef",    heading: "Irish Grass-fed Beef",      code: "IE", link: "/search?q=ireland+beef",     category: "beef" },
  // Lamb
  { handle: "origin-australia-lamb",  heading: "Australian Lamb",           code: "AU", link: "/search?q=australia+lamb",   category: "lamb" },
  { handle: "origin-pakistan-lamb",   heading: "Pakistani Lamb",            code: "PK", link: "/search?q=pakistan+lamb",    category: "lamb" },
  { handle: "origin-spain-lamb",      heading: "Spanish Lamb",              code: "ES", link: "/search?q=spain+lamb",       category: "lamb" },
  // Ostrich
  { handle: "origin-sa-ostrich",      heading: "South African Ostrich",     code: "ZA", link: "/search?q=ostrich",          category: "ostrich" },
  { handle: "origin-namibia-ostrich", heading: "Namibian Ostrich",          code: "NA", link: "/search?q=namibia+ostrich",  category: "ostrich" },
  // Veal
  { handle: "origin-france-veal",     heading: "French Veal",               code: "FR", link: "/search?q=veal+france",      category: "veal" },
  { handle: "origin-netherlands-veal",heading: "Dutch Veal",                code: "NL", link: "/search?q=veal+netherlands", category: "veal" },
  { handle: "origin-australia-veal",  heading: "Australian Veal",           code: "AU", link: "/search?q=veal+australia",   category: "veal" },
  // Venison
  { handle: "origin-nz-venison",      heading: "New Zealand Venison",       code: "NZ", link: "/search?q=venison+new+zealand", category: "venison" },
  { handle: "origin-scotland-venison",heading: "Scottish Venison",          code: "GB", link: "/search?q=venison+scotland",  category: "venison" },
];

// ── 1. Update existing items with category ────────────────────────────────
console.log("\n📦  Updating existing origin items with categories...");
for (const { id, handle, category } of ID_CATEGORY_MAP) {
  try {
    const res = await cli<any>(
      `mutation Update($id: ID!, $fields: [MetaobjectFieldInput!]!) {
         metaobjectUpdate(id: $id, metaobject: { fields: $fields }) {
           metaobject { handle }
           userErrors { field message }
         }
       }`,
      { id, fields: [{ key: "category", value: category }] }
    );
    const errs = res?.metaobjectUpdate?.userErrors ?? [];
    if (errs.length) {
      console.warn(`   ⚠  ${handle}: ${errs.map((e: any) => e.message).join(", ")}`);
    } else {
      console.log(`   ✅  ${handle} → ${category}`);
    }
  } catch (e: any) {
    console.warn(`   ⚠  ${handle}: ${e.message}`);
  }
}

// ── 2. Create new items ────────────────────────────────────────────────────
console.log("\n📦  Creating new origin items...");
for (const item of NEW_ITEMS) {
  try {
    const res = await cli<any>(
      `mutation Create($obj: MetaobjectCreateInput!) {
         metaobjectCreate(metaobject: $obj) {
           metaobject { handle }
           userErrors { field message }
         }
       }`,
      {
        obj: {
          type: "mls_origin_item",
          handle: item.handle,
          fields: [
            { key: "heading",  value: item.heading },
            { key: "code",     value: item.code },
            { key: "link",     value: item.link },
            { key: "category", value: item.category },
          ],
        },
      }
    );
    const errs = res?.metaobjectCreate?.userErrors ?? [];
    if (errs.length) {
      const msg = errs.map((e: any) => e.message).join(", ");
      if (msg.includes("taken") || msg.includes("already")) {
        console.log(`   ⏭  ${item.handle} already exists`);
      } else {
        console.warn(`   ⚠  ${item.handle}: ${msg}`);
      }
    } else {
      console.log(`   ✅  Created ${item.handle} [${item.category}]`);
    }
  } catch (e: any) {
    console.warn(`   ⚠  ${item.handle}: ${e.message}`);
  }
}

console.log("\n✅  Done! The ShopByOrigin tabs will now show:");
console.log("   beef | lamb | ostrich | veal | venison");
console.log("\n   Add flag images via Shopify Admin → Content → Metaobjects → Origin Item");
