#!/usr/bin/env node
/**
 * generate-metaobjects.ts
 *
 * Full automation pipeline:
 *   Static Lovable component
 *     → Claude designs metaobject schema
 *     → Shopify Admin API creates definition + sample entries
 *     → Claude rewrites component to be data-driven
 *     → GraphQL query file written
 *     → Review diff, then push to GitHub
 *
 * Prerequisites (add to .env):
 *   SHOPIFY_ADMIN_API_TOKEN  Custom App token — Shopify Admin → Settings → Apps → Develop apps
 *                            Scopes needed: write_metaobject_definitions, write_metaobjects
 *   ANTHROPIC_API_KEY        From console.anthropic.com
 *
 * Usage:
 *   npm run generate:metaobjects
 *   npm run generate:metaobjects -- --component PromoSideBySide
 *   npm run generate:metaobjects -- --dry-run
 *   npm run generate:metaobjects -- --skip-rewrite
 */

import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

// ── Setup ──────────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

// Simple .env parser — no dotenv dependency needed
async function loadDotEnv() {
  try {
    const raw = await fs.readFile(path.join(ROOT, ".env"), "utf-8");
    for (const line of raw.split("\n")) {
      const m = line.trim().match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
      if (!m) continue;
      const val = m[2].trim().replace(/^["']|["']$/g, "");
      process.env[m[1]] ??= val;
    }
  } catch {}
}

await loadDotEnv();

// ── Validate ───────────────────────────────────────────────────────────────

const SHOP = process.env.PUBLIC_STORE_DOMAIN ?? "";
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY ?? "";
const API_VERSION = process.env.PUBLIC_STOREFRONT_API_VERSION ?? "2025-07";

const missing: string[] = [];
if (!SHOP) missing.push("PUBLIC_STORE_DOMAIN (already in .env)");
if (!ANTHROPIC_KEY) missing.push("ANTHROPIC_API_KEY — get from console.anthropic.com");

if (missing.length) {
  console.error("\n❌ Missing required environment variables:\n");
  missing.forEach((m) => console.error(`   ${m}\n`));
  process.exit(1);
}

// ── CLI args ───────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const getArg = (flag: string) => { const i = argv.indexOf(flag); return i !== -1 ? argv[i + 1] : undefined; };
const hasFlag = (flag: string) => argv.includes(flag);

const TARGET = getArg("--component");           // process only this component
const COMPONENTS_DIR = path.resolve(ROOT, getArg("--dir") ?? "app/components/home");
const DRY_RUN = hasFlag("--dry-run");           // no file writes, no API calls
const SKIP_REWRITE = hasFlag("--skip-rewrite"); // only create Shopify definition, skip rewrite

// ── Clients ────────────────────────────────────────────────────────────────

const claude = new Anthropic({ apiKey: ANTHROPIC_KEY });

// Uses `shopify store execute` (Shopify CLI stored auth — no token needed)
// Run once to authenticate: npx shopify store auth --store <shop> --scopes read_metaobject_definitions,write_metaobject_definitions,read_metaobjects,write_metaobjects
async function shopifyAdmin<T = any>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const tmp = os.tmpdir();
  const queryFile = path.join(tmp, `mls-q-${Date.now()}.graphql`);
  const varFile = path.join(tmp, `mls-v-${Date.now()}.json`);
  const isMutation = /^\s*mutation/i.test(query);

  try {
    // Buffer.from avoids BOM — Shopify CLI rejects UTF-8 BOM in query files
    await fs.writeFile(queryFile, Buffer.from(query, "utf8"));
    if (variables) await fs.writeFile(varFile, Buffer.from(JSON.stringify(variables), "utf8"));

    const args = [
      "shopify", "store", "execute",
      "--store", SHOP,
      "--query-file", queryFile,
      "--json",
      ...(variables ? ["--variable-file", varFile] : []),
      ...(isMutation ? ["--allow-mutations"] : []),
    ];

    const raw = execSync(`npx ${args.join(" ")}`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });

    const result = JSON.parse(raw) as any;
    if (result.errors?.length) {
      throw new Error(`GraphQL: ${result.errors.map((e: any) => e.message).join("; ")}`);
    }
    return result as T;
  } finally {
    await fs.unlink(queryFile).catch(() => {});
    if (variables) await fs.unlink(varFile).catch(() => {});
  }
}

// ── Static component detection ─────────────────────────────────────────────

// Signals that suggest a component has hardcoded CMS content
const STATIC_SIGNALS = [
  /const\s+[A-Z_]+\s*[=:]\s*\[/,        // const ARRAY = [
  /\{\s*label:\s*["']/,                   // { label: "..."
  /\{\s*title:\s*["']/,                   // { title: "..."
  /\{\s*heading:\s*["']/,                 // { heading: "..."
  /\{\s*href:\s*["']/,                    // { href: "..."
  /\{\s*handle:\s*["']/,                  // { handle: "..."
  /<h[1-6][^>]*>[^{<]{10,}/,             // hardcoded heading text
  /<p[^>]*>[^{<]{20,}/,                   // hardcoded paragraph text
];

// Signals that mean the component is already data-driven
const DYNAMIC_SIGNALS = [
  /useLoaderData/,
  /LoaderFunctionArgs/,
  /\.query\s*\(/,
  /metaobjects\s*\(/,
  /\$language.*LanguageCode/,
  /import.*storefront/i,
];

function isLikelyStatic(code: string): boolean {
  const dynamicScore = DYNAMIC_SIGNALS.filter((r) => r.test(code)).length;
  if (dynamicScore >= 2) return false;
  const staticScore = STATIC_SIGNALS.filter((r) => r.test(code)).length;
  return staticScore >= 2;
}

// ── Types ──────────────────────────────────────────────────────────────────

interface FieldDef {
  key: string;
  name: string;
  type: string;
  required?: boolean;
  description?: string;
}

interface SchemaDef {
  type: string;
  displayName: string;
  description: string;
  fields: FieldDef[];
}

interface EntryDef {
  handle: string;
  fields: Array<{ key: string; value: string }>;
}

// ── Claude helpers ─────────────────────────────────────────────────────────

function extract(text: string, tag: string): string | null {
  const m = text.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1].trim() : null;
}

async function designSchema(name: string, code: string): Promise<SchemaDef> {
  const msg = await claude.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 2048,
    messages: [{
      role: "user",
      content: `You are a Shopify developer designing metaobject schemas for a Hydrogen storefront (UAE premium meat shop — MLS UAE).

Analyze this React component and design a Shopify metaobject schema that makes all hardcoded/static content editable via Shopify Admin.

Component name: ${name}
\`\`\`tsx
${code}
\`\`\`

Rules:
- metaobject type must be snake_case (e.g. "promo_section", "shop_by_category_item")
- field keys must be snake_case
- Only valid Shopify field types: single_line_text_field, multi_line_text_field, url, file_reference, boolean, number_integer, color, json
- Use file_reference for images, url for links/CTAs, single_line_text_field for short text, multi_line_text_field for descriptions
- Only include fields for actual CMS content (not layout/styling)
- If the component shows a list (e.g. categories), the type should represent ONE item in the list

Output ONLY the JSON — no explanation, no markdown fences:
<schema>
{
  "type": "...",
  "displayName": "...",
  "description": "...",
  "fields": [
    { "key": "...", "name": "...", "type": "...", "required": true, "description": "..." }
  ]
}
</schema>`,
    }],
  });

  const raw = extract((msg.content[0] as any).text, "schema");
  if (!raw) throw new Error(`No <schema> from Claude for ${name}`);
  return JSON.parse(raw) as SchemaDef;
}

async function generateEntries(name: string, schema: SchemaDef): Promise<EntryDef[]> {
  const fields = schema.fields
    .filter((f) => f.type !== "file_reference") // skip images — need manual upload
    .map((f) => ({ key: f.key, type: f.type, name: f.name }));

  const msg = await claude.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 1500,
    messages: [{
      role: "user",
      content: `Generate 3 realistic sample Shopify metaobject entries for a UAE premium meat shop (MLS UAE — beef, lamb, wagyu cuts, halal certified).

Metaobject type: ${schema.type} (${schema.displayName})
Component context: ${name}
Fields (skip file_reference, already excluded): ${JSON.stringify(fields)}

Rules:
- handle must be unique kebab-case (e.g. "beef-category", "wagyu-promo")
- url fields: use relative paths like /collections/all-beef
- Values should be realistic, professional, branded for a premium meat delivery store
- color fields: use hex like #8B0000
- number fields: realistic integers

Output ONLY JSON — no explanation:
<entries>
[
  {
    "handle": "...",
    "fields": [{ "key": "...", "value": "..." }]
  }
]
</entries>`,
    }],
  });

  const raw = extract((msg.content[0] as any).text, "entries");
  if (!raw) throw new Error(`No <entries> from Claude for ${name}`);
  return JSON.parse(raw) as EntryDef[];
}

async function rewriteComponent(
  name: string,
  code: string,
  schema: SchemaDef
): Promise<{ component: string; query: string }> {
  const msg = await claude.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 5000,
    messages: [{
      role: "user",
      content: `Rewrite this Hydrogen React component to fetch its content from Shopify metaobjects.

Component: ${name}
Metaobject type: "${schema.type}"
Fields:
${schema.fields.map((f) => `  ${f.key} (${f.type})${f.required ? " — required" : ""}`).join("\n")}

Original component:
\`\`\`tsx
${code}
\`\`\`

Requirements:
1. Add a typed props interface matching the metaobject fields
   - single_line_text_field / multi_line_text_field → string | null
   - file_reference → { url: string; altText?: string | null } | null
   - url → string | null
   - boolean → boolean | null
   - number_integer / number_decimal → number | null
2. The component receives an array of items as props (e.g. \`items: SchemaType[]\`)
3. Keep 100% identical visual design — same Tailwind classes, same layout
4. Handle null/undefined gracefully with optional chaining and fallbacks
5. Keep all existing imports unchanged; add new ones if needed
6. The component must be completely self-contained (no external data dependencies inside)

Also write a GraphQL Storefront API query FRAGMENT (not a full query) to fetch this metaobject type.
The fragment should use: metaobjects(type: "${schema.type}", first: 20)

Output ONLY code — no explanation:

<component>
[complete rewritten TSX file]
</component>

<query>
[GraphQL fragment only]
</query>`,
    }],
  });

  const text = (msg.content[0] as any).text as string;
  const component = extract(text, "component");
  const query = extract(text, "query") ?? "";

  if (!component) throw new Error(`No <component> from Claude for ${name}`);
  return { component, query };
}

// ── Shopify Admin API operations ───────────────────────────────────────────

async function definitionExists(type: string): Promise<boolean> {
  try {
    const data = await shopifyAdmin<any>(
      `query { metaobjectDefinitionByType(type: "${type}") { id } }`
    );
    return !!data?.metaobjectDefinitionByType?.id;
  } catch {
    return false;
  }
}

async function createDefinition(schema: SchemaDef): Promise<string> {
  const data = await shopifyAdmin<any>(
    `mutation CreateDef($def: MetaobjectDefinitionCreateInput!) {
      metaobjectDefinitionCreate(definition: $def) {
        metaobjectDefinition { id type }
        userErrors { field message }
      }
    }`,
    {
      def: {
        type: schema.type,
        name: schema.displayName,
        description: schema.description,
        access: { storefront: "PUBLIC_READ" },
        capabilities: { translatable: { enabled: true } },
        fieldDefinitions: schema.fields.map((f) => ({
          key: f.key,
          name: f.name,
          type: f.type,
          required: f.required ?? false,
          description: f.description ?? "",
        })),
      },
    }
  );

  const result = data.metaobjectDefinitionCreate;
  if (result.userErrors?.length) {
    throw new Error(result.userErrors.map((e: any) => `${e.field}: ${e.message}`).join("; "));
  }
  return result.metaobjectDefinition.id as string;
}

async function createEntry(type: string, entry: EntryDef): Promise<string | null> {
  const data = await shopifyAdmin<any>(
    `mutation CreateEntry($m: MetaobjectCreateInput!) {
      metaobjectCreate(metaobject: $m) {
        metaobject { id handle }
        userErrors { field message }
      }
    }`,
    { m: { type, handle: entry.handle, fields: entry.fields } }
  );

  const result = data.metaobjectCreate;
  if (result.userErrors?.length) {
    const msg = result.userErrors.map((e: any) => e.message).join(", ");
    console.warn(`    ⚠  Entry '${entry.handle}': ${msg}`);
    return null;
  }
  return result.metaobject.handle as string;
}

// ── File helpers ───────────────────────────────────────────────────────────

async function writeWithBackup(filePath: string, content: string): Promise<string> {
  const bak = filePath + ".bak";
  try { await fs.copyFile(filePath, bak); } catch {}
  await fs.writeFile(filePath, content, "utf-8");
  return bak;
}

// ── Pipeline: process one component ───────────────────────────────────────

interface Result {
  name: string;
  schema: SchemaDef;
  entries: string[];
  rewritten: boolean;
  queryPath?: string;
}

async function processComponent(filePath: string): Promise<Result | null> {
  const name = path.basename(filePath, ".tsx");
  console.log(`\n🔍  ${name}`);

  const code = await fs.readFile(filePath, "utf-8");

  if (!isLikelyStatic(code)) {
    console.log("    ↷  Already dynamic — skipping");
    return null;
  }
  console.log("    ✓  Static content detected");

  // ── 1. Design schema ────────────────────────────────────────────────────
  console.log("    🤖  Designing schema with Claude...");
  const schema = await designSchema(name, code);
  console.log(`    📐  Type: ${schema.type}  (${schema.fields.length} fields)`);
  for (const f of schema.fields) {
    console.log(`        ${f.key.padEnd(22)} ${f.type}`);
  }

  // ── 2. Create Shopify definition ────────────────────────────────────────
  const createdEntries: string[] = [];

  if (!DRY_RUN) {
    const exists = await definitionExists(schema.type);
    if (exists) {
      console.log(`    ℹ  Definition '${schema.type}' already exists — skipping`);
    } else {
      console.log(`    📦  Creating metaobject definition...`);
      const id = await createDefinition(schema);
      console.log(`    ✅  Created: ${id}`);
    }

    // ── 3. Sample entries ──────────────────────────────────────────────
    console.log("    🤖  Generating sample entries with Claude...");
    const entries = await generateEntries(name, schema);
    for (const entry of entries) {
      console.log(`    📝  Creating entry '${entry.handle}'...`);
      const handle = await createEntry(schema.type, entry);
      if (handle) {
        createdEntries.push(handle);
        console.log(`    ✅  ${handle}`);
      }
    }
  } else {
    console.log("    [dry-run]  Would create definition + entries in Shopify");
  }

  if (SKIP_REWRITE) {
    return { name, schema, entries: createdEntries, rewritten: false };
  }

  // ── 4. Rewrite component ────────────────────────────────────────────────
  console.log("    🤖  Rewriting component to be data-driven...");
  const { component: newCode, query } = await rewriteComponent(name, code, schema);

  if (!DRY_RUN) {
    const bak = await writeWithBackup(filePath, newCode);
    console.log(`    💾  Backup: ${path.relative(ROOT, bak)}`);
    console.log(`    ✅  Component rewritten: ${path.relative(ROOT, filePath)}`);

    let queryPath: string | undefined;
    if (query) {
      const queryDir = path.join(ROOT, "app/lib/queries");
      await fs.mkdir(queryDir, { recursive: true });
      queryPath = path.join(queryDir, `${schema.type}.graphql`);
      await fs.writeFile(queryPath, query, "utf-8");
      console.log(`    📄  Query: ${path.relative(ROOT, queryPath)}`);
    }

    return { name, schema, entries: createdEntries, rewritten: true, queryPath };
  } else {
    console.log("    [dry-run]  Schema design:\n");
    console.log(JSON.stringify(schema, null, 4));
    return { name, schema, entries: createdEntries, rewritten: false };
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║   Shopify Metaobject Generator                ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log(`  Store   : ${SHOP}`);
  console.log(`  API     : ${API_VERSION}`);
  console.log(`  Target  : ${TARGET ?? "all static components"}`);
  if (DRY_RUN) console.log("  Mode    : DRY RUN (no writes, no API calls)");
  if (SKIP_REWRITE) console.log("  Mode    : schema + entries only (no component rewrite)");

  // Discover component files
  const allFiles = await fs.readdir(COMPONENTS_DIR);
  const tsxFiles = allFiles
    .filter((f) => f.endsWith(".tsx") && !f.endsWith(".test.tsx") && !f.endsWith(".stories.tsx"))
    .map((f) => path.join(COMPONENTS_DIR, f));

  const targets = TARGET
    ? tsxFiles.filter((f) => path.basename(f, ".tsx") === TARGET)
    : tsxFiles;

  if (targets.length === 0) {
    console.error(`\n❌  No components found${TARGET ? ` matching '${TARGET}'` : ""} in ${COMPONENTS_DIR}`);
    process.exit(1);
  }

  console.log(`\n  Found ${targets.length} component(s) to analyze\n`);

  const results: Result[] = [];
  for (const file of targets) {
    try {
      const result = await processComponent(file);
      if (result) results.push(result);
    } catch (err: any) {
      console.error(`\n  ❌  ${path.basename(file, ".tsx")}: ${err.message}`);
    }
  }

  // ── Summary ────────────────────────────────────────────────────────────
  console.log("\n\n══════════════════════════════════════════════════");
  console.log("  SUMMARY");
  console.log("══════════════════════════════════════════════════");

  if (results.length === 0) {
    console.log("\n  All components are already data-driven 🎉");
  } else {
    for (const r of results) {
      console.log(`\n  ✅  ${r.name}`);
      console.log(`      Schema  : ${r.schema.type}  (${r.schema.fields.length} fields)`);
      if (r.entries.length) console.log(`      Entries : ${r.entries.join(", ")}`);
      if (r.rewritten) console.log("      Rewrite : done (original backed up as .bak)");
      if (r.queryPath) console.log(`      Query   : ${path.relative(ROOT, r.queryPath)}`);
    }

    console.log("\n\n  📋  Next steps:");
    console.log("  ─────────────────────────────────────────────────");
    console.log("  1. Review rewritten components — git diff app/components/");
    console.log("  2. Update route loaders in app/routes/_index.tsx");
    console.log("     to fetch the new metaobject types and pass as props");
    console.log("  3. Edit entries in Shopify Admin → Content → Metaobjects");
    console.log("  4. Test locally: npm run dev");
    console.log("  5. git add -p && git commit && git push");

    if (results.some((r) => r.schema.fields.some((f) => f.type === "file_reference"))) {
      console.log("\n  ⚠️   Image fields (file_reference) need manual upload in Shopify Admin.");
      console.log("      Go to Files → upload images → copy URLs into the entries.");
    }
  }

  console.log();
}

main().catch((err) => {
  console.error(`\n❌  Fatal: ${err.message}`);
  if (process.env.DEBUG) console.error(err.stack);
  process.exit(1);
});
