#!/usr/bin/env node
/**
 * create-refer-metaobject.ts
 * Creates mls_refer_step + mls_refer_page metaobject definitions and seeds default data.
 * Usage: npx tsx scripts/create-refer-metaobject.ts
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
if (!SHOP || !TOKEN) { console.error("❌ Set PUBLIC_STORE_DOMAIN and SHOPIFY_ADMIN_API_TOKEN in .env"); process.exit(1); }

const GQL_URL = `https://${SHOP}/admin/api/2024-10/graphql.json`;

async function gql<T = any>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(GQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": TOKEN },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json() as any;
  if (json.errors) throw new Error(json.errors[0].message);
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
         metaobjectDefinition { id }
         userErrors { field message }
       }
     }`,
    { def: { type, name, access: { storefront: "PUBLIC_READ" }, fieldDefinitions } }
  );
  const errs = res?.metaobjectDefinitionCreate?.userErrors ?? [];
  if (errs.length) { console.error("❌", errs.map((e: any) => e.message).join("; ")); process.exit(1); }
  console.log(`✅  Created`);
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
  console.log(`✅  Seeded: ${handle}`);
  return res?.metaobjectCreate?.metaobject?.id as string;
}

// ── 1. mls_refer_step ─────────────────────────────────────────────────────────
await ensureDefinition("mls_refer_step", "Refer Step", [
  { key: "label",       name: "Label",       type: "single_line_text_field" },
  { key: "description", name: "Description", type: "multi_line_text_field" },
  { key: "icon_name",   name: "Icon Name (User/Users/Mail/Gift/Trophy/ShoppingCart/Tag/Smile)", type: "single_line_text_field" },
]);

// ── 2. mls_faq_item (reuse if exists) ─────────────────────────────────────────
await ensureDefinition("mls_faq_item", "FAQ Item", [
  { key: "question", name: "Question", type: "single_line_text_field" },
  { key: "answer",   name: "Answer",   type: "multi_line_text_field" },
]);

// ── 3. mls_refer_page ─────────────────────────────────────────────────────────
const referStepDef = await gql<any>(`{ metaobjectDefinitionByType(type: "mls_refer_step") { id } }`);
const faqDef       = await gql<any>(`{ metaobjectDefinitionByType(type: "mls_faq_item") { id } }`);
const referStepDefId = referStepDef?.metaobjectDefinitionByType?.id ?? "";
const faqDefId       = faqDef?.metaobjectDefinitionByType?.id ?? "";

await ensureDefinition("mls_refer_page", "Refer a Friend Page", [
  { key: "hero_title",               name: "Hero Title",                    type: "single_line_text_field" },
  { key: "hero_subtitle",            name: "Hero Subtitle",                  type: "multi_line_text_field" },
  { key: "how_to_refer_title",       name: "How to Refer — Section Title",   type: "single_line_text_field" },
  { key: "how_to_get_steaks_title",  name: "How to Get Steaks — Section Title", type: "single_line_text_field" },
  { key: "video_url",                name: "Video Embed URL (YouTube /embed/ID)", type: "single_line_text_field" },
  { key: "video_section_title",      name: "Video Section Title",            type: "single_line_text_field" },
  {
    key: "referral_steps", name: "How to Refer Steps",
    type: "list.metaobject_reference",
    validations: [{ name: "metaobject_definition_id", value: referStepDefId }],
  },
  {
    key: "steaks_steps", name: "How to Get Steaks Steps",
    type: "list.metaobject_reference",
    validations: [{ name: "metaobject_definition_id", value: referStepDefId }],
  },
  {
    key: "faq_items", name: "FAQ Items",
    type: "list.metaobject_reference",
    validations: [{ name: "metaobject_definition_id", value: faqDefId }],
  },
]);

// ── 4. Seed referral steps ────────────────────────────────────────────────────
console.log("\n📦  Seeding referral steps...");
const REFERRAL_STEPS = [
  { handle: "refer-step-login",   label: "Log In / Sign Up",              icon: "User",         desc: "Sign up/ log in to your account. Go to the page called, Refer Your Friend. Enter your email and press next." },
  { handle: "refer-step-page",    label: 'Go to "Refer Your Friend" Page',icon: "Users",        desc: "Navigate to the Refer Your Friend section and enter your email address." },
  { handle: "refer-step-email",   label: "Enter Your Friend's Email",     icon: "Mail",         desc: "Submit your friend's email address. They'll receive a referral link and a unique code via email. You can also copy and share the link via SMS, WhatsApp, or Messenger." },
  { handle: "refer-step-gift",    label: "Your Friend Gets a Free Gift",  icon: "Gift",         desc: "Your friend needs to: Check their email. Copy the referral code. Add the MLS Referral Box to their cart. Paste the code at checkout to get the box for free." },
  { handle: "refer-step-reward",  label: "You Get Rewarded Too!",         icon: "Trophy",       desc: "Once your friend completes their order using your code, you'll receive 2 Striploin Steaks (250g each) as a thank-you!" },
];
const referralStepIds: string[] = [];
for (const s of REFERRAL_STEPS) {
  const id = await seedEntry("mls_refer_step", s.handle, [
    { key: "label",       value: s.label },
    { key: "description", value: s.desc },
    { key: "icon_name",   value: s.icon },
  ]);
  if (id) referralStepIds.push(id);
}

// ── 5. Seed steaks steps ──────────────────────────────────────────────────────
console.log("\n📦  Seeding steaks steps...");
const STEAKS_STEPS = [
  { handle: "steaks-step-cart",    label: "Add to Cart",  icon: "ShoppingCart", desc: "Add this product into your cart: https://mlsuae.ae/products/mls-referral-box" },
  { handle: "steaks-step-code",    label: "Apply Code",   icon: "Tag",          desc: "Apply the discount code in our checkout which you received in the email." },
  { handle: "steaks-step-enjoy",   label: "Enjoy!",       icon: "Smile",        desc: "Enjoy your gift." },
];
const steaksStepIds: string[] = [];
for (const s of STEAKS_STEPS) {
  const id = await seedEntry("mls_refer_step", s.handle, [
    { key: "label",       value: s.label },
    { key: "description", value: s.desc },
    { key: "icon_name",   value: s.icon },
  ]);
  if (id) steaksStepIds.push(id);
}

// ── 6. Seed FAQ items ─────────────────────────────────────────────────────────
console.log("\n📦  Seeding FAQ items...");
const FAQS = [
  { handle: "refer-faq-1", question: "Can I refer only one friend?",     answer: "No, you can refer as many friends as you want. The more friends you refer, the more discount you get." },
  { handle: "refer-faq-2", question: "What is a successful referral?",   answer: "Your referred friend should complete a purchase of minimum AED 150 via referral link; it should be your friend's first purchase." },
  { handle: "refer-faq-3", question: "What causes a referral to fail?",  answer: "If the referred customer clicked on the referral link; but then made the purchase on a different IP address or user agent, the referring customer would not get the kickback." },
  { handle: "refer-faq-4", question: "How does the MLS reward work?",    answer: "Browse the MLS Rewards program at /pages/rewards." },
];
const faqIds: string[] = [];
for (const f of FAQS) {
  const id = await seedEntry("mls_faq_item", f.handle, [
    { key: "question", value: f.question },
    { key: "answer",   value: f.answer },
  ]);
  if (id) faqIds.push(id);
}

// ── 7. Fetch existing IDs if already seeded ───────────────────────────────────
const allReferralIds = referralStepIds.length ? referralStepIds
  : ((await gql<any>(`{ metaobjects(type: "mls_refer_step", first: 10) { nodes { id handle } } }`)
    )?.metaobjects?.nodes?.filter((n: any) => n.handle?.startsWith("refer-step")).map((n: any) => n.id) ?? []);

const allSteaksIds = steaksStepIds.length ? steaksStepIds
  : ((await gql<any>(`{ metaobjects(type: "mls_refer_step", first: 10) { nodes { id handle } } }`)
    )?.metaobjects?.nodes?.filter((n: any) => n.handle?.startsWith("steaks-step")).map((n: any) => n.id) ?? []);

const allFaqIds = faqIds.length ? faqIds
  : ((await gql<any>(`{ metaobjects(type: "mls_faq_item", first: 30) { nodes { id handle } } }`)
    )?.metaobjects?.nodes?.filter((n: any) => n.handle?.startsWith("refer-faq")).map((n: any) => n.id) ?? []);

// ── 8. Seed page entry ────────────────────────────────────────────────────────
console.log("\n📦  Seeding page entry...");
await seedEntry("mls_refer_page", "refer-page", [
  { key: "hero_title",              value: "Refer a Friend & Earn Rewards" },
  { key: "hero_subtitle",           value: "Share MLS with friends and family — you both get rewarded with exclusive discounts on premium halal meat." },
  { key: "how_to_refer_title",      value: "How can I refer friends?" },
  { key: "how_to_get_steaks_title", value: "How to get your free steaks?" },
  { key: "video_url",               value: "https://www.youtube.com/embed/_9VUPq3SxOc" },
  { key: "video_section_title",     value: "See How It Works" },
  { key: "referral_steps",          value: JSON.stringify(allReferralIds) },
  { key: "steaks_steps",            value: JSON.stringify(allSteaksIds) },
  { key: "faq_items",               value: JSON.stringify(allFaqIds) },
]);

console.log(`
✅  Done!

📋  Edit in Shopify Admin → Content → Metaobjects:
   • "Refer a Friend Page" → hero, section titles, video URL, step order, FAQ order
   • "Refer Step"          → label, description, icon name
   • "FAQ Item"            → question & answer

📌  Available icon names: User, Users, Mail, Gift, Trophy, ShoppingCart, Tag, Smile
`);
