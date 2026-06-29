#!/usr/bin/env node
/**
 * fix-origin-section.ts
 *
 * Fetches all mls_origin_item IDs and updates the mls_origin_section
 * entry so its "items" list includes every origin item (all categories).
 *
 * Usage:
 *   npx tsx scripts/fix-origin-section.ts
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

// ── 1. Fetch all origin items ─────────────────────────────────────────────
console.log("\n🔍  Fetching all origin items...");
const itemsRes = await cli<any>(
  `{ metaobjects(type: "mls_origin_item", first: 50) { nodes { id handle fields { key value } } } }`
);

const allItems: Array<{ id: string; handle: string; category: string }> = (
  itemsRes?.metaobjects?.nodes ?? []
).map((n: any) => {
  const f = Object.fromEntries(n.fields.map((x: any) => [x.key, x.value]));
  return { id: n.id, handle: n.handle, category: f.category ?? "" };
});

console.log(`   Found ${allItems.length} items:`);
const byCategory: Record<string, string[]> = {};
for (const item of allItems) {
  (byCategory[item.category || "uncategorized"] ??= []).push(item.handle);
}
for (const [cat, handles] of Object.entries(byCategory)) {
  console.log(`   [${cat}] ${handles.join(", ")}`);
}

// ── 2. Fetch the origin section entry ─────────────────────────────────────
console.log("\n🔍  Fetching origin section...");
const sectionRes = await cli<any>(
  `{ metaobjects(type: "mls_origin_section", first: 1) { nodes { id handle } } }`
);

const sectionNode = sectionRes?.metaobjects?.nodes?.[0];
if (!sectionNode) {
  console.error("❌  No mls_origin_section entry found.");
  process.exit(1);
}
console.log(`   Found: ${sectionNode.handle} (${sectionNode.id})`);

// ── 3. Sort items: beef first, then lamb, ostrich, veal, venison, others ──
const TAB_ORDER = ["beef", "lamb", "ostrich", "veal", "venison"];
const sorted = [
  ...TAB_ORDER.flatMap(cat => allItems.filter(i => i.category === cat)),
  ...allItems.filter(i => !TAB_ORDER.includes(i.category)),
];

console.log(`\n📦  Updating section items list (${sorted.length} items)...`);
const updateRes = await cli<any>(
  `mutation Update($id: ID!, $fields: [MetaobjectFieldInput!]!) {
     metaobjectUpdate(id: $id, metaobject: { fields: $fields }) {
       metaobject { id handle }
       userErrors { field message }
     }
   }`,
  {
    id: sectionNode.id,
    fields: [
      {
        key: "items",
        value: JSON.stringify(sorted.map(i => i.id)),
      },
    ],
  }
);

const errs = updateRes?.metaobjectUpdate?.userErrors ?? [];
if (errs.length) {
  console.error("❌  Errors:", errs.map((e: any) => e.message).join("; "));
  process.exit(1);
}

console.log(`✅  Section updated with ${sorted.length} items across ${Object.keys(byCategory).length} categories`);
console.log(`\n   Tabs on home page: ${TAB_ORDER.join(" | ")}`);
