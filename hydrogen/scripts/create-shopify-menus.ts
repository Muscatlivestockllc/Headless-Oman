#!/usr/bin/env node
/**
 * create-shopify-menus.ts
 * Creates native Shopify menus using inline GraphQL (items can't be variables).
 * Usage: npx tsx scripts/create-shopify-menus.ts
 */

import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";

const SHOP = "mls-uae.myshopify.com";
const BASE = `https://${SHOP}`;

async function cli<T = any>(query: string): Promise<T> {
  const qf = path.join(os.tmpdir(), `mls-q-${Date.now()}.graphql`);
  try {
    await fs.writeFile(qf, Buffer.from(query, "utf8"));
    const isMut = /^\s*mutation/i.test(query);
    const args = `npx shopify store execute --store ${SHOP} --query-file ${qf} --json${isMut ? " --allow-mutations" : ""}`;
    const out = execSync(args, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
    return JSON.parse(out) as T;
  } finally {
    await fs.unlink(qf).catch(() => {});
  }
}

// ── Build inline items string ─────────────────────────────────────────────────
type Item = { title: string; url: string; items?: Item[] };

function itemsStr(items: Item[]): string {
  return items.map(i => {
    const sub = i.items?.length ? ` items: [${itemsStr(i.items)}]` : "";
    return `{ title: ${JSON.stringify(i.title)} type: HTTP url: ${JSON.stringify(BASE + i.url)}${sub} }`;
  }).join("\n      ");
}

// ── Menu definitions ──────────────────────────────────────────────────────────
const MAIN: Item[] = [
  {
    title: "Beef", url: "/collections/all-beef",
    items: [
      { title: "By Cut", url: "/collections/all-beef", items: [
        { title: "Striploin",  url: "/collections/striploin" },
        { title: "Ribeye",     url: "/collections/ribeye-steak" },
        { title: "T-Bone",     url: "/collections/t-bone" },
        { title: "Tenderloin", url: "/collections/tenderloin" },
        { title: "Brisket",    url: "/collections/brisket" },
        { title: "Short Ribs", url: "/collections/short-ribs" },
        { title: "Mince",      url: "/collections/mince" },
        { title: "Shanks",     url: "/collections/shanks" },
        { title: "Chops",      url: "/collections/chops" },
      ]},
      { title: "By Origin", url: "/collections/all-beef", items: [
        { title: "Australian Wagyu",       url: "/collections/wagyu-beef" },
        { title: "Australian Black Angus", url: "/collections/black-angus" },
        { title: "Australian Grass-fed",   url: "/collections/australian-beef" },
        { title: "Japanese A5 Wagyu",      url: "/collections/japanese-wagyu" },
        { title: "Pakistani Beef",         url: "/collections/pakistani-beef" },
        { title: "Brazilian Grass-fed",    url: "/collections/brazilian-beef" },
        { title: "NZ Grass-fed Beef",      url: "/collections/new-zealand-beef" },
        { title: "South African Beef",     url: "/collections/south-african-beef" },
        { title: "US Black Angus",         url: "/collections/us-beef" },
      ]},
    ],
  },
  {
    title: "Lamb & Mutton", url: "/collections/lamb",
    items: [
      { title: "By Origin", url: "/collections/lamb", items: [
        { title: "Australian Grass-fed", url: "/collections/australian-lamb" },
        { title: "Pakistani Mutton",     url: "/collections/pakistani-lamb" },
        { title: "Somali Fresh Lamb",    url: "/collections/somali-lamb" },
        { title: "Indian Fresh Mutton",  url: "/collections/indian-lamb" },
        { title: "New Zealand Lamb",     url: "/collections/new-zealand-lamb" },
      ]},
      { title: "By Cut", url: "/collections/lamb", items: [
        { title: "Leg",    url: "/collections/lamb-leg" },
        { title: "Chops",  url: "/collections/lamb-chops" },
        { title: "Mince",  url: "/collections/lamb-mince" },
        { title: "Shanks", url: "/collections/lamb-shanks" },
        { title: "Rack",   url: "/collections/lamb-rack" },
      ]},
    ],
  },
  {
    title: "Wagyu", url: "/collections/wagyu-beef",
    items: [
      { title: "Wagyu Selection", url: "/collections/wagyu-beef", items: [
        { title: "Australian Wagyu MB4/5", url: "/collections/wagyu-beef" },
        { title: "Australian Wagyu MB6/7", url: "/collections/wagyu-mb6-7" },
        { title: "Japanese A5 Wagyu",      url: "/collections/japanese-wagyu" },
      ]},
    ],
  },
  {
    title: "Angus", url: "/collections/black-angus",
    items: [
      { title: "Angus Selection", url: "/collections/black-angus", items: [
        { title: "Australian Black Angus", url: "/collections/black-angus" },
        { title: "US Black Angus",         url: "/collections/us-beef" },
      ]},
    ],
  },
  { title: "Offers",  url: "/collections/sale" },
  { title: "Reviews", url: "/pages/reviews" },
];

const SECONDARY: Item[] = [
  { title: "Burgers",       url: "/collections/burgers" },
  { title: "BBQ & Mishkak", url: "/collections/bbq" },
  { title: "Boxes",         url: "/collections/boxes" },
  { title: "Build a Box",   url: "/pages/build-a-box" },
  { title: "About",         url: "/pages/about" },
  { title: "Explore",       url: "/pages/explore" },
];

// ── Upsert a menu ─────────────────────────────────────────────────────────────
async function upsertMenu(handle: string, title: string, items: Item[]) {
  // Check if exists
  const existing = await cli<any>(`{ menus(first: 20) { nodes { id handle } } }`);
  const existingId = existing?.menus?.nodes?.find((m: any) => m.handle === handle)?.id;

  const itemsInline = itemsStr(items);

  if (existingId) {
    console.log(`   ♻️  Updating "${title}"...`);
    const res = await cli<any>(`mutation {
      menuUpdate(
        id: ${JSON.stringify(existingId)}
        title: ${JSON.stringify(title)}
        handle: ${JSON.stringify(handle)}
        items: [${itemsInline}]
      ) {
        menu { id handle title }
        userErrors { field message }
      }
    }`);
    const errs = res?.menuUpdate?.userErrors ?? [];
    if (errs.length) throw new Error(errs.map((e: any) => e.message).join("; "));
    console.log(`   ✅  Updated "${res?.menuUpdate?.menu?.title}"`);
  } else {
    console.log(`   ➕  Creating "${title}"...`);
    const res = await cli<any>(`mutation {
      menuCreate(
        title: ${JSON.stringify(title)}
        handle: ${JSON.stringify(handle)}
        items: [${itemsInline}]
      ) {
        menu { id handle title }
        userErrors { field message }
      }
    }`);
    const errs = res?.menuCreate?.userErrors ?? [];
    if (errs.length) throw new Error(errs.map((e: any) => e.message).join("; "));
    console.log(`   ✅  Created "${res?.menuCreate?.menu?.title}"`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log("\n🚀  Building Shopify menus...\n");
await upsertMenu("main-menu",      "Main menu",      MAIN);
await upsertMenu("secondary-menu", "Secondary menu", SECONDARY);

console.log("\n✅  Done! Go to Shopify Admin → Content → Menus to see them.");
console.log("   main-menu:      Beef · Lamb · Wagyu · Angus · Offers · Reviews  (with mega menus)");
console.log("   secondary-menu: Burgers · BBQ · Boxes · Build a Box · About · Explore");
