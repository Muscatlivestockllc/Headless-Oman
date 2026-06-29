#!/usr/bin/env node
/**
 * create-gourmet-metaobject.ts
 * Creates mls_gourmet_store + mls_gourmet_page metaobject definitions and seeds default data.
 * Usage: npx tsx scripts/create-gourmet-metaobject.ts
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

const SHOP  = process.env.PUBLIC_STORE_DOMAIN ?? "";
const TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN ?? "";
const API_VERSION = "2024-10";

if (!SHOP || !TOKEN) {
  console.error("❌  Set PUBLIC_STORE_DOMAIN and SHOPIFY_ADMIN_API_TOKEN in .env");
  process.exit(1);
}

const GQL_URL = `https://${SHOP}/admin/api/${API_VERSION}/graphql.json`;

async function gql<T = any>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(GQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json() as any;
  if (json.errors) {
    console.error("GraphQL errors:", JSON.stringify(json.errors, null, 2));
    throw new Error(json.errors[0].message);
  }
  return json.data as T;
}

async function ensureDefinition(type: string, name: string, fieldDefinitions: any[]) {
  console.log(`\n🔍  Checking: ${type}`);
  const existing = await gql<any>(
    `{ metaobjectDefinitionByType(type: "${type}") { id } }`
  );
  if (existing?.metaobjectDefinitionByType?.id) {
    console.log(`ℹ️   Already exists: ${existing.metaobjectDefinitionByType.id}`);
    return;
  }
  console.log(`📦  Creating: ${type}`);
  const res = await gql<any>(
    `mutation CreateDef($def: MetaobjectDefinitionCreateInput!) {
       metaobjectDefinitionCreate(definition: $def) {
         metaobjectDefinition { id type }
         userErrors { field message }
       }
     }`,
    { def: { type, name, access: { storefront: "PUBLIC_READ" }, fieldDefinitions } }
  );
  const errs = res?.metaobjectDefinitionCreate?.userErrors ?? [];
  if (errs.length) { console.error("❌", errs.map((e: any) => e.message).join("; ")); process.exit(1); }
  console.log(`✅  Created: ${res?.metaobjectDefinitionCreate?.metaobjectDefinition?.id}`);
}

async function seedEntry(type: string, handle: string, fields: any[]): Promise<string | null> {
  const res = await gql<any>(
    `mutation Create($o: MetaobjectCreateInput!) {
       metaobjectCreate(metaobject: $o) {
         metaobject { id handle }
         userErrors { field message }
       }
     }`,
    { o: { type, handle, fields } }
  );
  const errs = res?.metaobjectCreate?.userErrors ?? [];
  if (errs.length) {
    const msg = errs.map((e: any) => e.message).join("; ");
    if (msg.toLowerCase().includes("taken") || msg.toLowerCase().includes("already")) {
      console.log(`ℹ️   "${handle}" already exists — skipping.`);
      return null;
    }
    console.error("❌", msg); return null;
  }
  console.log(`✅  Seeded: ${res?.metaobjectCreate?.metaobject?.handle}`);
  return res?.metaobjectCreate?.metaobject?.id as string;
}

// ── 1. mls_gourmet_store ──────────────────────────────────────────────────────
await ensureDefinition("mls_gourmet_store", "Gourmet Store Location", [
  { key: "name",        name: "Store Name",               type: "single_line_text_field" },
  { key: "address",     name: "Address",                  type: "multi_line_text_field" },
  { key: "hours",       name: "Opening Hours",            type: "single_line_text_field" },
  { key: "phone",       name: "Phone Number",             type: "single_line_text_field" },
  { key: "maps_url",    name: "Google Maps URL",          type: "single_line_text_field" },
  { key: "embed_url",   name: "Map Embed URL (iframe)",   type: "single_line_text_field" },
  { key: "store_image", name: "Store Photo",              type: "file_reference" },
]);

// ── 2. mls_faq_item (reuse if exists) ─────────────────────────────────────────
await ensureDefinition("mls_faq_item", "FAQ Item", [
  { key: "question", name: "Question", type: "single_line_text_field" },
  { key: "answer",   name: "Answer",   type: "multi_line_text_field" },
]);

// ── 3. mls_gourmet_page ───────────────────────────────────────────────────────
// Fetch definition IDs needed for list.metaobject_reference validations
const storeDef = await gql<any>(`{ metaobjectDefinitionByType(type: "mls_gourmet_store") { id } }`);
const faqDef   = await gql<any>(`{ metaobjectDefinitionByType(type: "mls_faq_item") { id } }`);
const storeDefId = storeDef?.metaobjectDefinitionByType?.id ?? "";
const faqDefId   = faqDef?.metaobjectDefinitionByType?.id ?? "";

await ensureDefinition("mls_gourmet_page", "Gourmet Page", [
  { key: "hero_title",      name: "Hero Title",      type: "single_line_text_field" },
  { key: "hero_subtitle",   name: "Hero Subtitle",   type: "multi_line_text_field" },
  {
    key: "store_locations", name: "Store Locations",
    type: "list.metaobject_reference",
    validations: [{ name: "metaobject_definition_id", value: storeDefId }],
  },
  {
    key: "faq_items",       name: "FAQ Items",
    type: "list.metaobject_reference",
    validations: [{ name: "metaobject_definition_id", value: faqDefId }],
  },
]);

// ── 4. Seed stores ────────────────────────────────────────────────────────────
console.log("\n📦  Seeding store locations...");
const STORES = [
  { handle: "gourmet-store-motor-city",    name: "MLS Gourmet Butchery - Motorcity",            address: "Motor City - Business Park Motor City - Dubai - United Arab Emirates",                hours: "Everyday: 10am to 9pm", mapsUrl: "https://www.google.com/maps/search/MLS+UAE+Gourmet+Butchery+Motor+City+Dubai",           embedUrl: "https://maps.google.com/maps?q=MLS+UAE+Gourmet+Butchery+Motor+City+Dubai&t=&z=15&ie=UTF8&iwloc=&output=embed" },
  { handle: "gourmet-store-abu-dhabi",     name: "MLS Gourmet Butchery - Abu Dhabi",            address: "Meat Market, Mushrif Mall, Abu Dhabi",                                                hours: "Everyday: 10am to 9pm", mapsUrl: "https://www.google.com/maps/search/MLS+UAE+Gourmet+Butchery+Mushrif+Mall+Abu+Dhabi",     embedUrl: "https://maps.google.com/maps?q=MLS+UAE+Gourmet+Butchery+Mushrif+Mall+Abu+Dhabi&t=&z=15&ie=UTF8&iwloc=&output=embed" },
  { handle: "gourmet-store-dubai-marina",  name: "MLS Gourmet Butchery - Dubai Marina",         address: "GO KITCHEN MARINA - Marsa Dubai - Dubai Marina - Dubai - United Arab Emirates",      hours: "Everyday: 10am to 9pm", mapsUrl: "https://www.google.com/maps/search/MLS+UAE+Gourmet+Butchery+Dubai+Marina",               embedUrl: "https://maps.google.com/maps?q=MLS+UAE+Gourmet+Butchery+Dubai+Marina&t=&z=15&ie=UTF8&iwloc=&output=embed" },
  { handle: "gourmet-store-silicon-oasis", name: "MLS Gourmet Butchery - Dubai Silicon Oasis",  address: "E-09, Light Industrial Unit 5 - Dubai Silicon Oasis - Dubai - United Arab Emirates", hours: "Everyday: 10am to 9pm", mapsUrl: "https://www.google.com/maps/search/MLS+UAE+Gourmet+Butchery+Dubai+Silicon+Oasis",         embedUrl: "https://maps.google.com/maps?q=MLS+UAE+Gourmet+Butchery+Dubai+Silicon+Oasis&t=&z=15&ie=UTF8&iwloc=&output=embed" },
  { handle: "gourmet-store-al-quoz",       name: "MLS Gourmet Butchery - Al Quoz Dubai",        address: "592J+V8G - Al Quoz Industrial First - Al Quoz - Dubai - United Arab Emirates",        hours: "Everyday: 10am to 9pm", mapsUrl: "https://www.google.com/maps/search/MLS+UAE+Central+Warehouse+Al+Quoz+Dubai",             embedUrl: "https://maps.google.com/maps?q=MLS+UAE+Central+Warehouse+Al+Quoz+Dubai&t=&z=15&ie=UTF8&iwloc=&output=embed" },
];
const storeIds: string[] = [];
for (const s of STORES) {
  const id = await seedEntry("mls_gourmet_store", s.handle, [
    { key: "name",      value: s.name },
    { key: "address",   value: s.address },
    { key: "hours",     value: s.hours },
    { key: "maps_url",  value: s.mapsUrl },
    { key: "embed_url", value: s.embedUrl },
  ]);
  if (id) storeIds.push(id);
}

// ── 5. Seed FAQ items ─────────────────────────────────────────────────────────
console.log("\n📦  Seeding FAQ items...");
const FAQS = [
  { handle: "gourmet-faq-fresh",   question: "Is your meat fresh?",                    answer: "Yes, all of our meat arrives freshly imported, packed with ice from its country of origin. We prepare and store all the meat ourselves ensuring only the most stringent processes are followed. Our fridges are consistently checked for optimum cooling temperatures and all our staff are fully trained in identifying good and bad meat." },
  { handle: "gourmet-faq-halal",   question: "Is your meat halal?",                    answer: "All our meat is prepared and prescribed in accordance with Islamic law." },
  { handle: "gourmet-faq-where",   question: "Where should you go to buy fresh meat?", answer: "Reputable butchers are the best source for fresh meat. As experts in the trade, we are best able to identify the good from the bad. At MLS, we pride ourselves on delivering premium quality meats." },
  { handle: "gourmet-faq-best",    question: "What is the best meat to buy?",           answer: "With exotic meats available from far and wide, we have a huge range for you to choose from. The most premium of our meats are the Wagyu steaks. Looking for lamb? Why not try some of our New Zealand lamb cuts." },
  { handle: "gourmet-faq-lamb",    question: "Is lamb better than beef?",               answer: "This is all down to personal preference. Lamb tends to be higher in calories, fats and cholesterol, whilst beef is rich in protein, iron and zinc." },
  { handle: "gourmet-faq-online",  question: "Can I buy meat online?",                  answer: "Absolutely! MLS delivers anywhere in Dubai on same day delivery." },
];
const faqIds: string[] = [];
for (const f of FAQS) {
  const id = await seedEntry("mls_faq_item", f.handle, [
    { key: "question", value: f.question },
    { key: "answer",   value: f.answer },
  ]);
  if (id) faqIds.push(id);
}

// ── 6. Fetch existing IDs if already seeded ───────────────────────────────────
const allStoreIds = storeIds.length ? storeIds
  : ((await gql<any>(`{ metaobjects(type: "mls_gourmet_store", first: 10) { nodes { id } } }`)
    )?.metaobjects?.nodes?.map((n: any) => n.id) ?? []);

const allFaqIds = faqIds.length ? faqIds
  : ((await gql<any>(`{ metaobjects(type: "mls_faq_item", first: 30) { nodes { id handle } } }`)
    )?.metaobjects?.nodes?.filter((n: any) => n.handle?.startsWith("gourmet-faq")).map((n: any) => n.id) ?? []);

// ── 7. Seed page entry ────────────────────────────────────────────────────────
console.log("\n📦  Seeding page entry...");
await seedEntry("mls_gourmet_page", "gourmet-page", [
  { key: "hero_title",      value: "MLS Gourmet Butcher Shops" },
  { key: "hero_subtitle",   value: "MLS Gourmet butcher shop only supplies the finest red meats. We source our meat from far and wide, to bring you some of the world's most revered cattle and cuts. Our specially trained butchers work tirelessly to keep every aspect of our produce and service to the highest standard." },
  { key: "store_locations", value: JSON.stringify(allStoreIds) },
  { key: "faq_items",       value: JSON.stringify(allFaqIds) },
]);

console.log(`
✅  All done!

📋  Edit content any time in Shopify Admin → Content → Metaobjects:
   • "Gourmet Page"           → hero title, subtitle, store order, FAQ order
   • "Gourmet Store Location" → name, address, hours, Google Maps URL, embed URL, store photo
   • "FAQ Item"               → question & answer

⚠️  To add store photos: open each store in Shopify Admin → Metaobjects → upload image to "Store Photo"
⚠️  To fix map embeds: paste the exact Google Maps iframe src into "Map Embed URL" for each store
`);
