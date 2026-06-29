import type { LoaderFunctionArgs } from "@shopify/remix-oxygen";
import type { GloboOption, GloboOptionSet } from "~/lib/globo";

// Possible Globo app-proxy URL patterns — we try them in order
function globoUrls(shopDomain: string, liveDomain: string, productId: string): string[] {
  const domains = [...new Set([liveDomain, shopDomain])];
  return domains.flatMap((d) => [
    `https://${d}/apps/product-options-by-globo/option_sets.json?product_id=${productId}`,
    `https://${d}/apps/globo-product-options/option_sets.json?product_id=${productId}`,
    `https://${d}/apps/product-options/api/products/${productId}/option_sets`,
  ]);
}

function normalizeType(raw: string): GloboOption["type"] {
  const t = (raw ?? "").toLowerCase();
  if (t.includes("textarea") || t.includes("multi")) return "textarea";
  if (t.includes("swatch") && t.includes("image")) return "image_swatch";
  if (t.includes("swatch") || t.includes("color")) return "swatch";
  if (t.includes("dropdown") || t.includes("select")) return "dropdown";
  if (t.includes("radio")) return "radio";
  if (t.includes("checkbox")) return "checkbox";
  if (t.includes("date")) return "date";
  if (t.includes("number")) return "number";
  if (t.includes("file")) return "file";
  return "text";
}

function parseOptionSets(raw: any[]): GloboOptionSet[] {
  return raw
    .map((set: any): GloboOptionSet => ({
      id: String(set.id ?? set._id ?? Math.random()),
      name: set.name ?? "",
      options: (set.options ?? set.custom_options ?? [])
        .map((opt: any): GloboOption => ({
          // IMPORTANT: use elementId (not id) — GloboProductOptions.tsx keys selections by elementId
          elementId: String(opt.id ?? opt._id ?? Math.random()),
          name: opt.name ?? opt.label ?? "",
          type: normalizeType(opt.type ?? opt.option_type ?? "text"),
          required: opt.required ?? false,
          placeholder: opt.placeholder ?? "",
          values: (opt.values ?? opt.option_values ?? []).map((v: any) => ({
            label: typeof v === "string" ? v : (v.label ?? v.name ?? v.value ?? ""),
            value: typeof v === "string" ? v : (v.value ?? v.label ?? ""),
            color: v.color ?? v.color_code ?? undefined,
            image: v.image ?? v.image_url ?? undefined,
          })),
          min_value: opt.min_value ?? undefined,
          max_value: opt.max_value ?? undefined,
          position: opt.position ?? 0,
        }))
        .filter((opt: GloboOption) => opt.name)
        .sort((a: GloboOption, b: GloboOption) => a.position - b.position),
    }))
    .filter((set: GloboOptionSet) => set.options.length > 0);
}

export async function loader({ params, context }: LoaderFunctionArgs) {
  const { productId } = params;
  if (!productId) return Response.json({ optionSets: [] });

  const shopDomain = context.env.PUBLIC_STORE_DOMAIN;
  const liveDomain = (context.env as any).PUBLIC_LIVE_STORE_DOMAIN ?? shopDomain;
  const urls = globoUrls(shopDomain, liveDomain, productId);

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
      });
      if (!res.ok) continue;

      const data = await res.json() as any;
      // Globo may return a bare array or wrap in option_sets / optionSets / options / data
      const raw: any[] = Array.isArray(data)
        ? data
        : (data?.option_sets ?? data?.optionSets ?? data?.options
           ?? data?.data?.option_sets ?? data?.data?.optionSets ?? []);
      if (!Array.isArray(raw) || raw.length === 0) continue;

      const optionSets = parseOptionSets(raw);
      if (optionSets.length > 0) {
        return Response.json({ optionSets });
      }
    } catch {
      // try next URL
    }
  }

  return Response.json({ optionSets: [] });
}
