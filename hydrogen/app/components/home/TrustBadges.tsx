import { Truck, RefreshCw, ShieldCheck, Award } from "lucide-react";

interface TrustBadge {
  id: string;
  handle: string | null;
  iconUrl: string | null;
  heading: string | null;
  subTitle: string | null;
}

interface RawMetaobjectNode {
  id: string;
  handle?: string | null;
  fields: Array<{
    key: string;
    value: string | null;
    reference?: { image?: { url: string } } | null;
  }>;
}

const DEFAULT_ICONS = [Truck, ShieldCheck, Award, RefreshCw];
const ICON_FILTER = "invert(15%) sepia(80%) saturate(400%) hue-rotate(340deg)";

function parseBadges(nodes: RawMetaobjectNode[]): TrustBadge[] {
  return nodes
    .map((node) => {
      const fieldMap = Object.fromEntries(node.fields.map((f) => [f.key, f]));
      const heading = fieldMap["heading"]?.value ?? null;
      const subTitle = fieldMap["sub_title"]?.value ?? null;
      if (!heading && !subTitle) return null;
      return {
        id: node.id,
        handle: node.handle ?? null,
        iconUrl: fieldMap["icon"]?.reference?.image?.url ?? null,
        heading,
        subTitle,
      } satisfies TrustBadge;
    })
    .filter((b): b is TrustBadge => b !== null);
}

interface TrustBadgesProps {
  badges?: RawMetaobjectNode[];
  centered?: boolean;
}

export function TrustBadges({ badges: rawBadges = [], centered = false }: TrustBadgesProps) {
  const parsed = parseBadges(rawBadges);
  if (parsed.length === 0) return null;

  return (
    <section className="border-b border-border bg-background py-3 md:py-6">
      <div className="container mx-auto px-4">

        {/* ── Mobile: icon-above-text, 3 across ── */}
        <div className="grid sm:hidden" style={{ gridTemplateColumns: `repeat(${parsed.length}, 1fr)` }}>
          {parsed.map((badge, i) => {
            const Icon = DEFAULT_ICONS[i % DEFAULT_ICONS.length];
            return (
              <div
                key={badge.id}
                className={`flex flex-col items-center gap-1.5 px-2 text-center${i > 0 ? " border-l border-border" : ""}`}
              >
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-crimson/10 text-crimson">
                  {badge.iconUrl ? (
                    <img
                      src={badge.iconUrl}
                      alt={badge.heading ?? ""}
                      className="h-4 w-4 object-contain"
                      style={{ filter: ICON_FILTER }}
                    />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                {badge.heading && (
                  <p className="text-[10px] font-bold leading-tight text-foreground">
                    {badge.heading}
                  </p>
                )}
                {badge.subTitle && (
                  <p className="text-[9px] leading-tight text-muted-foreground">
                    {badge.subTitle}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Desktop: full-width columns, icon-left, generous padding ── */}
        <div
          className="hidden divide-x divide-border sm:grid"
          style={{ gridTemplateColumns: `repeat(${parsed.length}, 1fr)` }}
        >
          {parsed.map((badge, i) => {
            const Icon = DEFAULT_ICONS[i % DEFAULT_ICONS.length];
            return (
              <div
                key={badge.id}
                className="group flex items-center justify-center gap-4 px-8 transition-colors duration-200 hover:bg-crimson/[0.03]"
              >
                {/* Icon box */}
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-crimson/10 text-crimson shadow-sm transition-shadow duration-200 group-hover:shadow-md">
                  {badge.iconUrl ? (
                    <img
                      src={badge.iconUrl}
                      alt={badge.heading ?? ""}
                      className="h-6 w-6 object-contain"
                      style={{ filter: ICON_FILTER }}
                    />
                  ) : (
                    <Icon className="h-6 w-6" />
                  )}
                </div>

                {/* Text */}
                <div className="min-w-0">
                  {badge.heading && (
                    <p className="text-sm font-bold leading-tight text-foreground">
                      {badge.heading}
                    </p>
                  )}
                  {badge.subTitle && (
                    <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                      {badge.subTitle}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
