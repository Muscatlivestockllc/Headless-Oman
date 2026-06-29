import { ProductPageShell, type ProductPageShellProps, type AccordionSection } from "./ProductPageShell";

function getMeta(product: any, key: string): string | null {
  return product.metafields?.find((m: any) => m?.key === key)?.value ?? null;
}

function FlavorTags({ value }: { value: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {value.split(",").map((tag) => (
        <span
          key={tag}
          className="rounded-full bg-crimson/10 px-3 py-1 text-xs font-semibold text-crimson"
        >
          {tag.trim()}
        </span>
      ))}
    </div>
  );
}

function TextContent({ value }: { value: string }) {
  return (
    <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{value}</p>
  );
}

interface RubsTemplateProps extends ProductPageShellProps {
  pairingHeading?: string;
}

export function RubsTemplate({ pairingHeading = "Best Cuts for This Rub", ...props }: RubsTemplateProps) {
  const p = props.product;

  const rubSections: AccordionSection[] = [
    { value: "beef_rubs",           label: "Beef Rubs",       raw: getMeta(p, "beef_rubs"),           flavor: false },
    { value: "mls_rub",             label: "MLS Rub",         raw: getMeta(p, "mls_rub"),             flavor: false },
    { value: "usage_guide",         label: "How to Apply",    raw: getMeta(p, "usage_guide"),         flavor: false },
    { value: "pairing_suggestions", label: pairingHeading,    raw: getMeta(p, "pairing_suggestions"), flavor: false },
    { value: "flavor_profile",      label: "Flavor Profile",  raw: getMeta(p, "flavor_profile"),      flavor: true  },
    { value: "ingredients",         label: "Ingredients",     raw: getMeta(p, "ingredients"),         flavor: false },
  ]
    .filter((s) => !!s.raw)
    .map(({ value, label, raw, flavor }) => ({
      value,
      label,
      content: flavor ? <FlavorTags value={raw!} /> : <TextContent value={raw!} />,
    }));

  return <ProductPageShell {...props} accordionSections={rubSections} />;
}

export function BeefRubsTemplate(props: ProductPageShellProps) {
  return <RubsTemplate {...props} pairingHeading="Best Beef Cuts for This Rub" />;
}

export function ChickenRubsTemplate(props: ProductPageShellProps) {
  return <RubsTemplate {...props} pairingHeading="Best Chicken Dishes for This Rub" />;
}
