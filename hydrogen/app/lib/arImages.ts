// Generic Arabic image override for metaobjects.
//
// Every image field `X` on a metaobject can have an `X_ar` counterpart (added to all
// image-bearing metaobject definitions). In Arabic, this walks a fetched query result and,
// for any field whose `X_ar` sibling has an image set, swaps `X`'s reference for `X_ar`'s.
// Empty `X_ar` → keeps the default (English) image. English locale is never touched.
//
// Call it once on the raw query result in a loader (AR only). It recurses through the whole
// object graph, so it works regardless of shape ({ metaobjects: { nodes } }, arrays, nested
// reference trees, etc.). A `seen` set guards against cycles and redundant work.
export function applyArImages(value: any, seen: Set<any> = new Set()): void {
  if (!value || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);

  if (Array.isArray(value)) {
    for (const v of value) applyArImages(v, seen);
    return;
  }

  const fields = value.fields;
  if (Array.isArray(fields)) {
    // Map base key (e.g. "desktop_image") -> its "_ar" field on the same metaobject.
    const arByBase = new Map<string, any>();
    for (const f of fields) {
      if (typeof f?.key === "string" && f.key.endsWith("_ar")) {
        arByBase.set(f.key.slice(0, -3), f);
      }
    }
    // Swap in the Arabic image / image-list when it's actually set.
    for (const f of fields) {
      if (typeof f?.key !== "string" || f.key.endsWith("_ar")) continue;
      const ar = arByBase.get(f.key);
      if (!ar) continue;
      if (ar.reference?.image) f.reference = ar.reference;
      else if (ar.references?.nodes?.length) f.references = ar.references;
    }
  }

  // Recurse into every nested object/array (connections, nodes, references, …).
  for (const key of Object.keys(value)) {
    const v = (value as any)[key];
    if (v && typeof v === "object") applyArImages(v, seen);
  }
}
