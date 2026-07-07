// Shared field accessors for mls_* landing-page section metaobjects.
// Every metaobject node exposes `fields: [{ key, value, type, reference, references }]`.
// The route already applies applyArImages() in Arabic, so `reference.image` is the correct
// (locale-aware) image by the time these helpers read it.

export interface RawField {
  key: string;
  value?: string | null;
  type?: string;
  reference?: any;
  references?: { nodes?: any[] } | null;
}

export interface RawNode {
  id?: string;
  type?: string;
  handle?: string;
  fields?: RawField[];
}

export function fieldMap(node: RawNode): Record<string, RawField> {
  return Object.fromEntries((node.fields ?? []).map((f) => [f.key, f]));
}

export function str(fm: Record<string, RawField>, key: string): string | null {
  return fm[key]?.value ?? null;
}

export function bool(fm: Record<string, RawField>, key: string): boolean {
  return fm[key]?.value === "true";
}

export function num(fm: Record<string, RawField>, key: string): number | null {
  const v = fm[key]?.value;
  if (v == null) return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

export function imageUrl(fm: Record<string, RawField>, key: string): string | null {
  return fm[key]?.reference?.image?.url ?? null;
}

export function imageAlt(fm: Record<string, RawField>, key: string): string | null {
  return fm[key]?.reference?.image?.altText ?? null;
}

// A "link" field may be a Shopify link JSON ({"url":"..."}) or a plain string.
export function link(fm: Record<string, RawField>, key: string): string | null {
  const raw = fm[key]?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed?.url ?? raw;
  } catch {
    return raw;
  }
}

// Collection reference → its handle (route builds /collections/<handle>).
export function collectionHandle(fm: Record<string, RawField>, key: string): string | null {
  return fm[key]?.reference?.handle ?? null;
}

export function listNodes(fm: Record<string, RawField>, key: string): RawNode[] {
  return fm[key]?.references?.nodes ?? [];
}
