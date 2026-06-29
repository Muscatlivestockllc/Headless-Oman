#!/usr/bin/env node
/**
 * create-delivery-metaobject.ts
 * Creates mls_delivery_city, mls_delivery_faq, and mls_delivery_page
 * metaobject definitions and seeds default data.
 * Usage: npx tsx scripts/create-delivery-metaobject.ts
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
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": TOKEN },
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
  const existing = await gql<any>(`{ metaobjectDefinitionByType(type: "${type}") { id } }`);
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
      // fetch the existing ID
      const existing = await gql<any>(`{ metaobjectByHandle(handle: { type: "${type}", handle: "${handle}" }) { id } }`);
      return existing?.metaobjectByHandle?.id ?? null;
    }
    console.error("❌", msg); return null;
  }
  console.log(`✅  Seeded: ${res?.metaobjectCreate?.metaobject?.handle}`);
  return res?.metaobjectCreate?.metaobject?.id as string;
}

// ── 1. mls_delivery_city ──────────────────────────────────────────────────────
await ensureDefinition("mls_delivery_city", "Delivery City", [
  { key: "label",           name: "City Name",         type: "single_line_text_field" },
  { key: "emoji",           name: "Emoji",             type: "single_line_text_field" },
  { key: "cutoff",          name: "Order Cutoff Time", type: "single_line_text_field" },
  { key: "delivery_window", name: "Delivery Window",   type: "single_line_text_field" },
  { key: "hours",           name: "Operating Hours",   type: "single_line_text_field" },
  { key: "fee",             name: "Delivery Fee",      type: "single_line_text_field" },
  { key: "notes",           name: "Notes (one per line)", type: "multi_line_text_field" },
]);

// ── 2. mls_delivery_faq ───────────────────────────────────────────────────────
await ensureDefinition("mls_delivery_faq", "Delivery FAQ", [
  { key: "question", name: "Question", type: "single_line_text_field" },
  { key: "answer",   name: "Answer",   type: "multi_line_text_field" },
]);

// ── 3. mls_delivery_page ─────────────────────────────────────────────────────
const cityDef = await gql<any>(`{ metaobjectDefinitionByType(type: "mls_delivery_city") { id } }`);
const faqDef  = await gql<any>(`{ metaobjectDefinitionByType(type: "mls_delivery_faq") { id } }`);
const cityDefId = cityDef?.metaobjectDefinitionByType?.id ?? "";
const faqDefId  = faqDef?.metaobjectDefinitionByType?.id ?? "";

await ensureDefinition("mls_delivery_page", "Delivery Page", [
  { key: "hero_subtitle",  name: "Hero Subtitle",   type: "single_line_text_field" },
  { key: "returns_title",  name: "Returns Title",   type: "single_line_text_field" },
  { key: "returns_items",  name: "Returns Items (one per line)", type: "multi_line_text_field" },
  {
    key: "city_items", name: "City Cards",
    type: "list.metaobject_reference",
    validations: [{ name: "metaobject_definition_id", value: cityDefId }],
  },
  {
    key: "faq_items", name: "FAQ Items",
    type: "list.metaobject_reference",
    validations: [{ name: "metaobject_definition_id", value: faqDefId }],
  },
]);

// ── 4. Seed cities ────────────────────────────────────────────────────────────
console.log("\n📦  Seeding city entries...");
const cityIds: string[] = [];

const CITIES = [
  {
    handle: "delivery-city-dubai",
    label: "Dubai",
    emoji: "🏙️",
    cutoff: "8:30 PM",
    window: "2 hours",
    hours: "10 AM – 8:30 PM, all days",
    fee: "AED 15",
    notes: "Express 2-hour delivery across all Dubai areas\nOrder anytime up to 8:30 PM for same-day delivery\nNo minimum order value\nDeliveries continue until 10:30 PM",
  },
  {
    handle: "delivery-city-abu-dhabi",
    label: "Abu Dhabi",
    emoji: "🌴",
    cutoff: "8:30 PM",
    window: "2 hours",
    hours: "10 AM – 8:30 PM, all days",
    fee: "AED 20",
    notes: "Express 2-hour delivery across Abu Dhabi\nOrder anytime up to 8:30 PM for same-day delivery\nNo minimum order value\nDeliveries continue until 10:30 PM",
  },
  {
    handle: "delivery-city-sharjah-ajman",
    label: "Sharjah & Ajman",
    emoji: "🏡",
    cutoff: "1:00 PM",
    window: "Same day",
    hours: "Confirm before 1:00 PM",
    fee: "AED 15",
    notes: "Same-day delivery when ordered before 1:00 PM\nNo minimum order value\nOrder after 1:00 PM = next-day delivery\nDelivery across Sharjah and Ajman areas",
  },
];

for (const c of CITIES) {
  const id = await seedEntry("mls_delivery_city", c.handle, [
    { key: "label",           value: c.label },
    { key: "emoji",           value: c.emoji },
    { key: "cutoff",          value: c.cutoff },
    { key: "delivery_window", value: c.window },
    { key: "hours",           value: c.hours },
    { key: "fee",             value: c.fee },
    { key: "notes",           value: c.notes },
  ]);
  if (id) cityIds.push(id);
}

// ── 5. Seed FAQs ──────────────────────────────────────────────────────────────
console.log("\n📦  Seeding FAQ entries...");
const faqIds: string[] = [];

const FAQS = [
  {
    handle: "delivery-faq-minimum-order",
    question: "Is there a minimum order?",
    answer: "No minimum order value. Our standard delivery fee is AED 15. Free delivery on orders above AED 350.",
  },
  {
    handle: "delivery-faq-tip-driver",
    question: "Do I need to tip my driver?",
    answer: "There's no need to tip — we pay our delivery team a living wage that doesn't depend on tips.",
  },
  {
    handle: "delivery-faq-packaging",
    question: "How is my meat packaged?",
    answer: "All orders are packed in insulated boxes using sustainable MULTIVAC packaging to maintain freshness during transit.",
  },
  {
    handle: "delivery-faq-not-home",
    question: "What if I'm not home?",
    answer: "Our drivers will attempt to call you. You can leave delivery instructions in your order notes or reschedule.",
  },
  {
    handle: "delivery-faq-tracking",
    question: "Can I track my order?",
    answer: "Yes — you'll receive an SMS with real-time tracking once your order is out for delivery.",
  },
];

for (const f of FAQS) {
  const id = await seedEntry("mls_delivery_faq", f.handle, [
    { key: "question", value: f.question },
    { key: "answer",   value: f.answer },
  ]);
  if (id) faqIds.push(id);
}

// ── 6. Seed page entry ────────────────────────────────────────────────────────
console.log("\n📦  Seeding mls_delivery_page...");
await seedEntry("mls_delivery_page", "delivery-page-main", [
  { key: "hero_subtitle",  value: "Same-day delivery across the UAE. Fresh, chilled, and on time." },
  { key: "returns_title",  value: "100% Free Replacements & Returns" },
  {
    key: "returns_items",
    value: "Drop a WhatsApp message or send us an email within 24 hours after delivery.\nWe will exchange the product and deliver it again to your door, or you can pick it up if you want.\nYou will receive the product or a refund. Refunds will be processed within 14 working days.",
  },
  { key: "city_items", value: JSON.stringify(cityIds) },
  { key: "faq_items",  value: JSON.stringify(faqIds) },
]);

console.log("\n🎉  Done! Delivery page metaobjects are ready.");
console.log("   Edit them at: Shopify Admin → Content → Metaobjects");
