export interface GloboOption {
  elementId: string; // internal Globo element ID (for conditional logic)
  name: string;      // label, used as the cart attribute key
  type: "text" | "textarea" | "dropdown" | "radio" | "checkbox" | "swatch" | "image_swatch" | "date" | "number" | "file";
  required: boolean;
  placeholder?: string;
  values?: Array<{ label: string; value: string; color?: string; image?: string }>;
  min_value?: number;
  max_value?: number;
  position: number;
  conditional?: {
    match: "all" | "any";
    conditions: Array<{ selectId: string; where: string; value: string }>;
    display: "show" | "hide";
  };
}

export interface GloboOptionSet {
  id: string;
  name: string;
  options: GloboOption[];
}

// ─── Parse Globo data embedded in the Shopify storefront HTML ─────────────────
// Globo embeds option data via several possible patterns:
//   window.GPOConfigs.options[ID] = { elements: [...], products: {...} };
//   window.GPO_options[ID] = { ... };
//   <script data-gpo-configs> ... </script>
export function extractGloboOptionsFromHtml(
  html: string,
  numericProductId: number,
  collectionIds?: number[]
): GloboOptionSet[] {
  // Try all known embedding patterns in order; return first non-empty result.
  // Each strategy already deduplicates by ID internally, but we do a final
  // pass here in case the same option set somehow appears across strategies.
  const candidates =
    parseGloboMarker(html, "window.GPOConfigs.options[", numericProductId, collectionIds).length > 0
      ? parseGloboMarker(html, "window.GPOConfigs.options[", numericProductId, collectionIds)
      : parseGloboMarker(html, "window.GPO_options[", numericProductId, collectionIds).length > 0
      ? parseGloboMarker(html, "window.GPO_options[", numericProductId, collectionIds)
      : parseGloboDataScript(html, numericProductId);

  // Final dedup by ID so no option set is ever rendered twice
  const seen = new Set<string>();
  return candidates.filter((s) => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });
}

function parseGloboDataScript(html: string, numericProductId: number): GloboOptionSet[] {
  const results: GloboOptionSet[] = [];
  const re = /<script[^>]+data-gpo[^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    try {
      const sets = JSON.parse(match[1]);
      const arr = Array.isArray(sets) ? sets : [sets];
      for (const set of arr) {
        const options = flattenGloboElements(set.elements ?? set.options ?? []);
        if (options.length > 0) {
          results.push({ id: String(set.id ?? Math.random()), name: set.name ?? "", options });
        }
      }
    } catch { /* skip */ }
  }
  return results;
}

function parseGloboMarker(
  html: string,
  marker: string,
  numericProductId: number,
  collectionIds?: number[],
): GloboOptionSet[] {
  const results: GloboOptionSet[] = [];
  let searchFrom = 0;

  while (true) {
    const markerIdx = html.indexOf(marker, searchFrom);
    if (markerIdx === -1) break;

    const idStart = markerIdx + marker.length;
    const idEnd = html.indexOf("]", idStart);
    if (idEnd === -1) break;
    const optionSetId = html.slice(idStart, idEnd).trim();

    // Find the opening '{' of the JSON object — handle '= {', '={', ' = {', etc.
    const jsonStart = html.indexOf("{", idEnd);
    if (jsonStart === -1) { searchFrom = idEnd + 1; continue; }

    // Make sure the '{' is reasonably close (not some unrelated '{' far away)
    if (jsonStart - idEnd > 20) { searchFrom = idEnd + 1; continue; }

    const jsonStr = extractBalancedObject(html, jsonStart);
    // Always advance past what we just looked at so we don't loop forever
    searchFrom = jsonStart + (jsonStr?.length ?? 1);
    if (!jsonStr) continue;

    try {
      const data = JSON.parse(jsonStr);
      const rule = data.products?.rule;

      // status 0 = active, 1 = inactive. Also accept missing/null (some Globo
      // versions omit the field entirely for active sets).
      const active = data.status === 0 || data.status == null;

      // "All products" — no rule at all, or all.enable is true
      const appliesToAll =
        !rule ||
        rule?.all?.enable === true ||
        rule?.all?.enabled === true;

      // Automate rule — collection / tag / vendor conditions.
      // When we have the product's collection IDs, check COLLECTION conditions precisely.
      // Without collection IDs, fall back to allowing any active automate rule through.
      const automateEnabled = rule?.automate?.enable === true || rule?.automate?.enabled === true;
      const appliesToAutomate = (() => {
        if (!automateEnabled) return false;
        // If we don't know the product's collections, DON'T match collection-targeted sets —
        // "allow all" would attach every automate set to the product (e.g. the Arabic PDP showed
        // the "Do you Require Butcher Service?" dropdown 6 times, one per store option set).
        if (collectionIds === undefined) return false;
        const conditions: any[] = rule.automate.conditions ?? [];
        const collConditions = conditions.filter((c: any) => c.select === "COLLECTION");
        if (collConditions.length === 0) return true; // no collection conditions — allow through
        const operator: string = rule.automate.operator ?? "or";
        const matches = collConditions.map((c: any) => collectionIds.includes(Number(c.value)));
        return operator === "and" ? matches.every(Boolean) : matches.some(Boolean);
      })();

      // Manual product list — only relevant when manual targeting is enabled
      const pid = numericProductId;
      const pidStr = String(pid);
      const manualEnabled = rule?.manual?.enable === true || rule?.manual?.enabled === true;
      const manualIds: (string | number)[] = manualEnabled
        ? (rule?.manual?.ids ?? rule?.manual?.products ?? [])
        : [];
      const appliesToProduct =
        manualIds.length > 0 &&
        manualIds.some((id) => id === pid || String(id) === pidStr);

      // Deduplicate: skip if we already added an option set with this ID
      const alreadyAdded = results.some((r) => r.id === optionSetId);

      if (!alreadyAdded && active && (appliesToAll || appliesToProduct || appliesToAutomate)) {
        const options = flattenGloboElements(data.elements ?? []);
        if (options.length > 0) {
          results.push({ id: optionSetId, name: data.name ?? "", options });
        }
      }
    } catch {
      // malformed JSON block — skip and continue to next
    }
  }

  return results;
}


function extractBalancedObject(str: string, start: number): string | null {
  if (str[start] !== "{") return null;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < str.length; i++) {
    const ch = str[i];
    if (escaped) { escaped = false; continue; }
    if (ch === "\\" && inString) { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return str.slice(start, i + 1);
    }
  }
  return null;
}

function flattenGloboElements(elements: any[]): GloboOption[] {
  const opts: GloboOption[] = [];
  for (const el of elements) {
    if (el.type === "group") {
      // recurse into group children
      opts.push(...flattenGloboElements(el.elements ?? []));
    } else {
      const opt = normalizeGloboElement(el);
      if (opt) opts.push(opt);
    }
  }
  return opts;
}

function normalizeGloboElement(el: any): GloboOption | null {
  const label: string = el.label ?? el.name ?? "";
  if (!label) return null;

  const values = (el.option_values ?? el.values ?? []).map((v: any) => ({
    label: typeof v === "string" ? v : (v.value ?? v.label ?? String(v)),
    value: typeof v === "string" ? v : (v.value ?? String(v)),
    color: v.color1 ?? v.color ?? undefined,
    image: undefined,
  }));

  const opt: GloboOption = {
    elementId: el.id ?? String(Math.random()),
    name: label,
    type: normalizeType(el.type ?? "text"),
    required: el.required ?? false,
    placeholder: el.placeholder ?? "",
    values,
    position: el.position ?? 0,
  };

  if (el.conditionalField && el.clo) {
    const clo = el.clo;
    const conditions = (clo.whens ?? [])
      .filter((w: any) => w.select && w.select !== "null")
      .map((w: any) => ({
        selectId: w.select as string,
        where: (w.where as string) ?? "EQUALS",
        value: (w.value as string) ?? "",
      }));

    if (conditions.length > 0) {
      opt.conditional = {
        match: clo.match === "any" ? "any" : "all",
        conditions,
        display: clo.display === "hide" ? "hide" : "show",
      };
    }
  }

  return opt;
}

function normalizeType(raw: string): GloboOption["type"] {
  const t = raw.toLowerCase();
  if (t === "select" || t.includes("dropdown")) return "dropdown";
  if (t.includes("textarea") || t.includes("multi")) return "textarea";
  if (t.includes("swatch") && t.includes("image")) return "image_swatch";
  if (t.includes("swatch") || t.includes("color")) return "swatch";
  if (t.includes("radio") || t.includes("button")) return "radio";
  if (t.includes("checkbox")) return "checkbox";
  if (t.includes("date")) return "date";
  if (t.includes("number")) return "number";
  if (t.includes("file")) return "file";
  return "text";
}
