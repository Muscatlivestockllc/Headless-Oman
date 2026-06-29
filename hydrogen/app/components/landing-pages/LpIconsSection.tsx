import { TrustBadges } from "~/components/home/TrustBadges";

export function LpIconsSection({ nodes }: { nodes: any[] }) {
  if (!nodes || nodes.length === 0) return null;

  const badgeNodes = nodes.map((item: any) => ({
    id: item.handle ?? item.id ?? Math.random().toString(),
    handle: item.handle ?? null,
    fields: item.fields ?? [],
  }));

  return <TrustBadges badges={badgeNodes} centered />;
}