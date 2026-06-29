#!/usr/bin/env node
/**
 * cleanup-origin-duplicates.ts
 * Deletes the duplicate origin items (handles ending in -1) and
 * re-saves the section with only the clean items.
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

// ── 1. Fetch all items ─────────────────────────────────────────────────────
const itemsRes = await cli<any>(
  `{ metaobjects(type: "mls_origin_item", first: 50) { nodes { id handle fields { key value } } } }`
);
const allItems: Array<{ id: string; handle: string; category: string }> = (
  itemsRes?.metaobjects?.nodes ?? []
).map((n: any) => {
  const f = Object.fromEntries(n.fields.map((x: any) => [x.key, x.value]));
  return { id: n.id, handle: n.handle, category: f.category ?? "" };
});

const duplicates = allItems.filter(i => i.handle.endsWith("-1"));
const clean = allItems.filter(i => !i.handle.endsWith("-1"));

console.log(`\n🗑  Deleting ${duplicates.length} duplicate items...`);
for (const dup of duplicates) {
  const res = await cli<any>(
    `mutation Del($id: ID!) { metaobjectDelete(id: $id) { deletedId userErrors { message } } }`,
    { id: dup.id }
  );
  const errs = res?.metaobjectDelete?.userErrors ?? [];
  if (errs.length) {
    console.warn(`   ⚠  ${dup.handle}: ${errs.map((e: any) => e.message).join(", ")}`);
  } else {
    console.log(`   🗑  Deleted ${dup.handle}`);
  }
}

// ── 2. Update section with only clean items ────────────────────────────────
const TAB_ORDER = ["beef", "lamb", "ostrich", "veal", "venison"];
const sorted = [
  ...TAB_ORDER.flatMap(cat => clean.filter(i => i.category === cat)),
  ...clean.filter(i => !TAB_ORDER.includes(i.category)),
];

const sectionRes = await cli<any>(
  `{ metaobjects(type: "mls_origin_section", first: 1) { nodes { id } } }`
);
const sectionId = sectionRes?.metaobjects?.nodes?.[0]?.id;

console.log(`\n📦  Updating section with ${sorted.length} clean items...`);
const updateRes = await cli<any>(
  `mutation Update($id: ID!, $fields: [MetaobjectFieldInput!]!) {
     metaobjectUpdate(id: $id, metaobject: { fields: $fields }) {
       metaobject { handle }
       userErrors { field message }
     }
   }`,
  { id: sectionId, fields: [{ key: "items", value: JSON.stringify(sorted.map(i => i.id)) }] }
);

const errs = updateRes?.metaobjectUpdate?.userErrors ?? [];
if (errs.length) {
  console.error("❌", errs.map((e: any) => e.message).join("; "));
} else {
  console.log(`✅  Section now has ${sorted.length} items`);
  const byCategory: Record<string, number> = {};
  for (const i of sorted) (byCategory[i.category] ??= 0, byCategory[i.category]++);
  for (const [cat, count] of Object.entries(byCategory)) {
    console.log(`   [${cat}] ${count} items`);
  }
}
