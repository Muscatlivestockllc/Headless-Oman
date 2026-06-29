#!/usr/bin/env node
/**
 * create-contact-metaobject.ts
 * Creates mls_contact_page metaobject definition and seeds default values.
 * Usage: npx tsx scripts/create-contact-metaobject.ts
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

const TYPE = "mls_contact_page";

// ── 1. Check if exists ────────────────────────────────────────────────────────
console.log("\n🔍  Checking definition...");
const existing = await cli<any>(`{ metaobjectDefinitionByType(type: "${TYPE}") { id } }`);

if (!existing?.metaobjectDefinitionByType?.id) {
  console.log("📦  Creating definition...");
  const res = await cli<any>(
    `mutation CreateDef($def: MetaobjectDefinitionCreateInput!) {
       metaobjectDefinitionCreate(definition: $def) {
         metaobjectDefinition { id type }
         userErrors { field message }
       }
     }`,
    {
      def: {
        type: TYPE,
        name: "Contact Page",
        access: { storefront: "PUBLIC_READ" },
        capabilities: { translatable: { enabled: true } },
        fieldDefinitions: [
          { key: "hero_title",    name: "Hero Title",           type: "single_line_text_field" },
          { key: "hero_subtitle", name: "Hero Subtitle",        type: "single_line_text_field" },
          { key: "hero_image",    name: "Hero Background Image",type: "file_reference" },
          { key: "phone",         name: "Phone / WhatsApp",     type: "single_line_text_field" },
          { key: "email",         name: "Email",                type: "single_line_text_field" },
          { key: "hours",         name: "Support Hours",        type: "single_line_text_field" },
          { key: "hours_sub",     name: "Hours Subtitle",       type: "single_line_text_field" },
          { key: "address_line1", name: "Address Line 1",       type: "single_line_text_field" },
          { key: "address_line2", name: "Address Line 2",       type: "single_line_text_field" },
          { key: "whatsapp_url",  name: "WhatsApp URL",         type: "single_line_text_field" },
          { key: "maps_url",      name: "Google Maps URL",      type: "single_line_text_field" },
        ],
      },
    }
  );
  const errs = res?.metaobjectDefinitionCreate?.userErrors ?? [];
  if (errs.length) { console.error("❌", errs.map((e: any) => e.message).join("; ")); process.exit(1); }
  console.log(`✅  Definition created: ${res?.metaobjectDefinitionCreate?.metaobjectDefinition?.id}`);
} else {
  console.log(`ℹ️   Definition already exists: ${existing.metaobjectDefinitionByType.id}`);
}

// ── 2. Seed default entry ─────────────────────────────────────────────────────
console.log("\n📦  Seeding default entry...");
const seedRes = await cli<any>(
  `mutation Create($o: MetaobjectCreateInput!) {
     metaobjectCreate(metaobject: $o) {
       metaobject { id handle }
       userErrors { field message }
     }
   }`,
  {
    o: {
      type: TYPE,
      handle: "contact-page",
      fields: [
        { key: "hero_title",    value: "Get in Touch" },
        { key: "hero_subtitle", value: "Questions about your order, custom cuts, or bulk buying? Our team responds within the hour." },
        { key: "phone",         value: "+971 50 451 6403" },
        { key: "email",         value: "contactus@mlsuae.ae" },
        { key: "hours",         value: "9 AM – 10 PM" },
        { key: "hours_sub",     value: "All days of the week" },
        { key: "address_line1", value: "E-09, Light Industrial Unit 6" },
        { key: "address_line2", value: "Dubai Silicon Oasis · Dubai · UAE" },
        { key: "whatsapp_url",  value: "https://wa.me/971504516403" },
        { key: "maps_url",      value: "https://maps.google.com/?q=Dubai+Silicon+Oasis+Dubai+UAE" },
      ],
    },
  }
);

const seedErrs = seedRes?.metaobjectCreate?.userErrors ?? [];
if (seedErrs.length) {
  const msg = seedErrs.map((e: any) => e.message).join("; ");
  if (msg.includes("taken") || msg.includes("already")) {
    console.log("ℹ️   Entry already exists — skipping seed.");
  } else {
    console.error("❌", msg);
  }
} else {
  console.log(`✅  Seeded: ${seedRes?.metaobjectCreate?.metaobject?.handle}`);
}

console.log("\n📋  Edit in Shopify Admin → Content → Metaobjects → Contact Page");
console.log("   Fields: hero_title, hero_subtitle, hero_image (upload image), phone, email, hours, address");
