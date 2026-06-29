#!/usr/bin/env node
/**
 * seed-nav.ts
 *
 * Rebuilds the full 3-level navigation via Shopify CLI auth (no admin token needed).
 *
 * Level 1 → mls_nav_entry  (top-level nav item: label, url, menu, position, columns)
 * Level 2 → mls_nav_column (mega-menu column header: title, links)
 * Level 3 → mls_nav_link   (link inside a column: label, url)
 *
 * Usage:  npx tsx scripts/seed-nav.ts
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

// ─────────────────────────────────────────────────────────────────────────────
// NAV STRUCTURE
// ─────────────────────────────────────────────────────────────────────────────
type Link   = { label: string; url: string };
type Column = { title: string; links: Link[] };
type Entry  = { handle: string; label: string; url: string; menu: "main" | "secondary"; position: number; columns: Column[] };

const NAV: Entry[] = [
  // ── MAIN MENU ─────────────────────────────────────────────────────────────
  {
    handle: "beef", label: "Beef", url: "/collections/all-beef", menu: "main", position: 1,
    columns: [
      {
        title: "By Cut",
        links: [
          { label: "Striploin",   url: "/collections/striploin" },
          { label: "Ribeye",      url: "/collections/ribeye-steak" },
          { label: "T-Bone",      url: "/collections/t-bone" },
          { label: "Tenderloin",  url: "/collections/tenderloin" },
          { label: "Brisket",     url: "/collections/brisket" },
          { label: "Short Ribs",  url: "/collections/short-ribs" },
          { label: "Mince",       url: "/collections/mince" },
          { label: "Shanks",      url: "/collections/shanks" },
          { label: "Chops",       url: "/collections/chops" },
        ],
      },
      {
        title: "By Origin",
        links: [
          { label: "Australian Wagyu",       url: "/collections/wagyu-beef" },
          { label: "Australian Black Angus", url: "/collections/black-angus" },
          { label: "Australian Grass-fed",   url: "/collections/australian-beef" },
          { label: "Japanese A5 Wagyu",      url: "/collections/japanese-wagyu" },
          { label: "Pakistani Beef",         url: "/collections/pakistani-beef" },
          { label: "Brazilian Grass-fed",    url: "/collections/brazilian-beef" },
          { label: "NZ Grass-fed Beef",      url: "/collections/new-zealand-beef" },
          { label: "South African Beef",     url: "/collections/south-african-beef" },
          { label: "US Black Angus",         url: "/collections/us-beef" },
        ],
      },
    ],
  },
  {
    handle: "lamb", label: "Lamb & Mutton", url: "/collections/lamb", menu: "main", position: 2,
    columns: [
      {
        title: "By Origin",
        links: [
          { label: "Australian Grass-fed", url: "/collections/australian-lamb" },
          { label: "Pakistani Mutton",     url: "/collections/pakistani-lamb" },
          { label: "Somali Fresh Lamb",    url: "/collections/somali-lamb" },
          { label: "Indian Fresh Mutton",  url: "/collections/indian-lamb" },
          { label: "New Zealand Lamb",     url: "/collections/new-zealand-lamb" },
        ],
      },
      {
        title: "By Cut",
        links: [
          { label: "Leg",    url: "/collections/lamb-leg" },
          { label: "Chops",  url: "/collections/lamb-chops" },
          { label: "Mince",  url: "/collections/lamb-mince" },
          { label: "Shanks", url: "/collections/lamb-shanks" },
          { label: "Rack",   url: "/collections/lamb-rack" },
        ],
      },
    ],
  },
  {
    handle: "wagyu", label: "Wagyu", url: "/collections/wagyu-beef", menu: "main", position: 3,
    columns: [
      {
        title: "Wagyu Selection",
        links: [
          { label: "Australian Wagyu MB4/5", url: "/collections/wagyu-beef" },
          { label: "Australian Wagyu MB6/7", url: "/collections/wagyu-mb6-7" },
          { label: "Japanese A5 Wagyu",      url: "/collections/japanese-wagyu" },
        ],
      },
    ],
  },
  {
    handle: "angus", label: "Angus", url: "/collections/black-angus", menu: "main", position: 4,
    columns: [
      {
        title: "Angus Selection",
        links: [
          { label: "Australian Black Angus", url: "/collections/black-angus" },
          { label: "US Black Angus",         url: "/collections/us-beef" },
        ],
      },
    ],
  },
  {
    handle: "offers",  label: "Offers",  url: "/collections/sale",     menu: "main", position: 5, columns: [],
  },
  {
    handle: "reviews", label: "Reviews", url: "/pages/reviews",         menu: "main", position: 6, columns: [],
  },

  // ── SECONDARY MENU ────────────────────────────────────────────────────────
  { handle: "burgers",    label: "Burgers",       url: "/collections/burgers",    menu: "secondary", position: 1, columns: [] },
  { handle: "bbq",        label: "BBQ & Mishkak", url: "/collections/bbq",        menu: "secondary", position: 2, columns: [] },
  { handle: "boxes",      label: "Boxes",          url: "/collections/boxes",      menu: "secondary", position: 3, columns: [] },
  { handle: "build-box",  label: "Build a Box",    url: "/pages/build-a-box",      menu: "secondary", position: 4, columns: [] },
  { handle: "about",      label: "About",          url: "/pages/about",            menu: "secondary", position: 5, columns: [] },
  { handle: "explore",    label: "Explore",        url: "/pages/explore",          menu: "secondary", position: 6, columns: [] },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
async function deleteAll(type: string) {
  const res = await cli<any>(`{ metaobjects(type: "${type}", first: 100) { nodes { id handle } } }`);
  const nodes: any[] = res?.metaobjects?.nodes ?? [];
  for (const n of nodes) {
    await cli<any>(`mutation { metaobjectDelete(id: "${n.id}") { deletedId } }`);
    process.stdout.write(`   🗑  ${n.handle}\n`);
  }
}

async function createLink(link: Link): Promise<string> {
  const res = await cli<any>(
    `mutation C($o: MetaobjectCreateInput!) { metaobjectCreate(metaobject: $o) { metaobject { id } userErrors { message } } }`,
    { o: { type: "mls_nav_link", fields: [{ key: "label", value: link.label }, { key: "url", value: link.url }] } }
  );
  const errs = res?.metaobjectCreate?.userErrors ?? [];
  if (errs.length) throw new Error(errs.map((e: any) => e.message).join("; "));
  return res.metaobjectCreate.metaobject.id as string;
}

async function createColumn(col: Column, linkIds: string[]): Promise<string> {
  const res = await cli<any>(
    `mutation C($o: MetaobjectCreateInput!) { metaobjectCreate(metaobject: $o) { metaobject { id } userErrors { message } } }`,
    {
      o: {
        type: "mls_nav_column",
        fields: [
          { key: "title", value: col.title },
          { key: "links", value: JSON.stringify(linkIds) },
        ],
      },
    }
  );
  const errs = res?.metaobjectCreate?.userErrors ?? [];
  if (errs.length) throw new Error(errs.map((e: any) => e.message).join("; "));
  return res.metaobjectCreate.metaobject.id as string;
}

async function createEntry(entry: Entry, columnIds: string[]): Promise<string> {
  const fields: any[] = [
    { key: "label",    value: entry.label },
    { key: "url",      value: entry.url },
    { key: "menu",     value: entry.menu },
    { key: "position", value: String(entry.position) },
  ];
  if (columnIds.length > 0) fields.push({ key: "columns", value: JSON.stringify(columnIds) });

  const res = await cli<any>(
    `mutation C($o: MetaobjectCreateInput!) { metaobjectCreate(metaobject: $o) { metaobject { id handle } userErrors { message } } }`,
    { o: { type: "mls_nav_entry", handle: entry.handle, fields } }
  );
  const errs = res?.metaobjectCreate?.userErrors ?? [];
  if (errs.length) throw new Error(errs.map((e: any) => e.message).join("; "));
  return res.metaobjectCreate.metaobject.id as string;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n🗑  Clearing existing nav...");
await deleteAll("mls_nav_entry");
await deleteAll("mls_nav_column");
await deleteAll("mls_nav_link");

console.log("\n📦  Building menu...\n");
for (const entry of NAV) {
  const columnIds: string[] = [];

  for (const col of entry.columns) {
    // Level 3 — links
    const linkIds: string[] = [];
    for (const link of col.links) {
      linkIds.push(await createLink(link));
    }
    // Level 2 — column
    columnIds.push(await createColumn(col, linkIds));
  }

  // Level 1 — entry
  await createEntry(entry, columnIds);

  const icon = entry.menu === "main" ? "🟥" : "🔲";
  const cols = entry.columns.length ? ` → ${entry.columns.map(c => c.title || "—").join(" | ")}` : "";
  console.log(`   ${icon}  [${entry.menu}] ${entry.label}${cols}`);
}

console.log("\n✅  Navigation built!");
console.log("   Main menu:      Beef · Lamb & Mutton · Wagyu · Angus · Offers · Reviews");
console.log("   Secondary menu: Burgers · BBQ & Mishkak · Boxes · Build a Box · About · Explore");
console.log("   Mega menus:     Beef (By Cut + By Origin) · Lamb (By Origin + By Cut)");
console.log("                   Wagyu (Wagyu Selection) · Angus (Angus Selection)");
