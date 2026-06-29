// Reject translated color values (non-ASCII = T Lab translated it, not a valid CSS color)
function safeColor(val: string | undefined, fallback: string): string {
  if (!val || /[^\x00-\x7F]/.test(val)) return fallback;
  return val;
}

export function LpMessageBanner({ nodes }: { nodes: any[] }) {
  if (!nodes?.length) return null;
  return (
    <>
      {nodes.map((node: any, i: number) => {
        const f = Object.fromEntries((node.fields ?? []).map((x: any) => [x.key, x.value]));
        if (!f.message) return null;
        return (
          <div
            key={i}
            className="px-4 py-3 text-center text-sm font-semibold"
            style={{ backgroundColor: safeColor(f.bg_color, "#820000"), color: safeColor(f.text_color, "white") }}
          >
            {f.message}
          </div>
        );
      })}
    </>
  );
}
