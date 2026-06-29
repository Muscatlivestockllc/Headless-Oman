#!/usr/bin/env node
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

// ── Name + country_code updates for existing items ────────────────────────────
const UPDATES: Record<string, { heading: string; country_code: string }> = {
  "beef-australian-wagyu-mb":    { heading: "Australian Wagyu Beef",      country_code: "au" },
  "beef-australian-black-angus": { heading: "Australian Black Angus Beef", country_code: "au" },
  "beef-australian-grass-fed":   { heading: "AUS Grass-fed Beef",          country_code: "au" },
  "beef-nz-grass-fed":           { heading: "NZ Grass-fed Beef",           country_code: "nz" },
  "beef-south-african":          { heading: "South African Grass-fed Beef",country_code: "za" },
  "beef-pakistani":              { heading: "Pakistani Beef",              country_code: "pk" },
  "beef-us-black-angus":         { heading: "US Black Angus Beef",         country_code: "us" },
  "beef-brazilian-grass-fed":    { heading: "Brazilian Grass-fed Beef",    country_code: "br" },
  "beef-japanese-a5-wagyu":      { heading: "Japanese A5 Wagyu Beef",      country_code: "jp" },
};

// ── New items to create ───────────────────────────────────────────────────────
const NEW_ITEMS = [
  { handle: "beef-argentina-angus", heading: "Argentina Angus Beef", link: "/collections/argentina-beef", category: "beef", country_code: "ar" },
  { handle: "beef-seasoned",        heading: "Seasoned Beef",         link: "/collections/seasoned-beef",  category: "beef", country_code: "" },
  { handle: "beef-offals",          heading: "Beef Offals",           link: "/collections/beef-offals",    category: "beef", country_code: "" },
];

// ── 1. Fetch existing items ───────────────────────────────────────────────────
console.log("\n🔍  Fetching existing beef items...");
const itemsRes = await cli<any>(`{ metaobjects(type: "mls_origin_item", first: 50) { nodes { id handle } } }`);
const existing: Record<string, string> = Object.fromEntries(
  (itemsRes?.metaobjects?.nodes ?? []).map((n: any) => [n.handle, n.id])
);

// ── 2. Update existing items ──────────────────────────────────────────────────
console.log("\n📝  Updating existing beef items...");
for (const [handle, data] of Object.entries(UPDATES)) {
  const id = existing[handle];
  if (!id) { console.warn(`   ⚠  Not found: ${handle}`); continue; }
  const res = await cli<any>(
    `mutation Up($id: ID!, $fields: [MetaobjectFieldInput!]!) {
       metaobjectUpdate(id: $id, metaobject: { fields: $fields }) {
         metaobject { handle }
         userErrors { field message }
       }
     }`,
    { id, fields: [
      { key: "heading",      value: data.heading },
      { key: "country_code", value: data.country_code },
    ]}
  );
  const errs = res?.metaobjectUpdate?.userErrors ?? [];
  if (errs.length) console.warn(`   ⚠  ${handle}: ${errs.map((e: any) => e.message).join(", ")}`);
  else console.log(`   ✅  ${handle} → "${data.heading}"`);
}

// ── 3. Create new items ───────────────────────────────────────────────────────
console.log("\n➕  Creating new beef items...");
const newIds: string[] = [];
for (const item of NEW_ITEMS) {
  if (existing[item.handle]) {
    console.log(`   ⏭  ${item.handle} already exists`);
    newIds.push(existing[item.handle]);
    continue;
  }
  const res = await cli<any>(
    `mutation C($o: MetaobjectCreateInput!) { metaobjectCreate(metaobject: $o) { metaobject { id handle } userErrors { message } } }`,
    { o: { type: "mls_origin_item", handle: item.handle, fields: [
      { key: "heading",      value: item.heading },
      { key: "link",         value: item.link },
      { key: "category",     value: item.category },
      { key: "country_code", value: item.country_code },
    ]}}
  );
  const errs = res?.metaobjectCreate?.userErrors ?? [];
  if (errs.length) console.warn(`   ⚠  ${item.handle}: ${errs.map((e: any) => e.message).join(", ")}`);
  else {
    console.log(`   ✅  Created "${item.heading}"`);
    newIds.push(res.metaobjectCreate.metaobject.id);
  }
}

// ── 4. Update section to include new items ────────────────────────────────────
console.log("\n📦  Updating origin section...");
const sectionRes = await cli<any>(`{ metaobjects(type: "mls_origin_section", first: 1) { nodes { id fields { key value references(first:50){nodes{...on Metaobject{id}}} } } } }`);
const section = sectionRes?.metaobjects?.nodes?.[0];
const currentIds: string[] = section?.fields?.find((f: any) => f.key === "items")?.references?.nodes?.map((n: any) => n.id) ?? [];

// Add new IDs (avoid duplicates)
const allIds = [...new Set([...currentIds, ...newIds])];

const updateRes = await cli<any>(
  `mutation Up($id: ID!, $fields: [MetaobjectFieldInput!]!) {
     metaobjectUpdate(id: $id, metaobject: { fields: $fields }) {
       metaobject { handle }
       userErrors { field message }
     }
   }`,
  { id: section.id, fields: [{ key: "items", value: JSON.stringify(allIds) }] }
);
const errs = updateRes?.metaobjectUpdate?.userErrors ?? [];
if (errs.length) console.error("❌", errs.map((e: any) => e.message).join("; "));
else console.log(`✅  Section updated with ${allIds.length} total items`);

console.log("\n🎉  Done! Beef items in Shop by Origin:");
console.log("   Argentina Angus Beef · South African Grass-fed · Brazilian Grass-fed");
console.log("   AUS Grass-fed · NZ Grass-fed · Australian Black Angus · Australian Wagyu");
console.log("   US Black Angus · Pakistani · Japanese A5 Wagyu · Seasoned Beef · Beef Offals");
