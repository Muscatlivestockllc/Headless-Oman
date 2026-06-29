import { ProductPageShell, type ProductPageShellProps } from "./ProductPageShell";
import { MetafieldSubTabs, SubAccordion, type TemplateSetting } from "./SubAccordion";

const METAFIELD_TITLES: Record<string, string> = {
  usage_guide:          "Cooking Guide",
  pairing_suggestions:  "Best Pairings",
  flavor_profile:       "Flavor Profile",
  ingredients:          "What's Included",
  understanding_rubs:   "Understanding Rubs",
  mls_rub:              "MLS Notes",
  beef_rubs:            "Additional Info",
};

interface Props extends ProductPageShellProps {
  templateSettings?: Record<string, TemplateSetting>;
}

export function WholeCutsTemplate({ templateSettings, ...props }: Props) {
  const settings = templateSettings?.["whole-cuts"];

  const titlesWithOverride = settings?.sectionTitle
    ? { ...METAFIELD_TITLES, understanding_rubs: settings.sectionTitle }
    : METAFIELD_TITLES;

  const hasMetaContent = Object.keys(titlesWithOverride).some(
    (key) => props.product.metafields?.find((m: any) => m?.key === key)?.value ?? null,
  );

  const hasExtraContent =
    hasMetaContent ||
    !!settings?.highlightText ||
    (settings?.accordions?.length ?? 0) > 0;

  if (!hasExtraContent) {
    return <ProductPageShell {...props} templateSuffix="whole-cuts" />;
  }

  const extraSections = (
    <>
      {/* Callout note (e.g. "Understanding Product Weight") from metaobject */}
      {settings?.highlightText && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3 text-sm leading-relaxed text-amber-900">
          {settings.highlightText}
        </div>
      )}

      {/* Product-level metafield accordions */}
      {hasMetaContent && (
        <MetafieldSubTabs
          product={props.product}
          metafieldTitles={titlesWithOverride}
          flavorTagClass="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
        />
      )}

      {/* Template-level accordions from metaobject (e.g. rub ingredients) */}
      {(settings?.accordions ?? []).length > 0 && (
        <div className="mt-2 rounded-lg border border-border bg-muted/30 px-4 pt-1 pb-1">
          {settings!.accordions.map((item, i) => (
            <SubAccordion key={i} title={item.heading}>
              <div
                className="prose prose-sm max-w-none [&_p]:leading-relaxed"
                dangerouslySetInnerHTML={{ __html: item.content }}
              />
            </SubAccordion>
          ))}
        </div>
      )}
    </>
  );

  return (
    <ProductPageShell
      {...props}
      templateSuffix="whole-cuts"
      extraSections={extraSections}
    />
  );
}
