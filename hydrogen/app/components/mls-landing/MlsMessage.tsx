import { fieldMap, str, type RawNode } from "./fields";

// Reject translated color values (non-ASCII = Shopify T&A translated it, not a valid CSS color).
function safeColor(val: string | null, fallback: string): string {
  if (!val || /[^\x00-\x7F]/.test(val)) return fallback;
  return val;
}

// Black message strip bar.
export function MlsMessage({ node }: { node: RawNode }) {
  const fm = fieldMap(node);
  const message = str(fm, "message");
  if (!message) return null;
  return (
    <div
      className="px-4 py-3 text-center text-xs font-semibold md:text-sm"
      style={{ backgroundColor: safeColor(str(fm, "bg_color"), "#111111"), color: safeColor(str(fm, "text_color"), "#ffffff") }}
    >
      {message}
    </div>
  );
}
