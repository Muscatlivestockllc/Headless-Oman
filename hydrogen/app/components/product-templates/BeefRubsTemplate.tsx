import { ProductPageShell, type ProductPageShellProps } from "./ProductPageShell";
import { MetafieldSubTabs, SubAccordion, type TemplateSetting } from "./SubAccordion";

const METAFIELD_TITLES: Record<string, string> = {
  beef_rubs:            "Beef Rubs",
  mls_rub:              "MLS Rub",
  usage_guide:          "How to Apply",
  pairing_suggestions:  "Best Beef Cuts for This Rub",
  flavor_profile:       "Flavor Profile",
  ingredients:          "Ingredients",
  understanding_rubs:   "About This Rub",
};

interface Props extends ProductPageShellProps {
  templateSettings?: Record<string, TemplateSetting>;
}

export function BeefRubsTemplate({ templateSettings, ...props }: Props) {
  const settings = templateSettings?.["beef-rubs"];

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
    return <ProductPageShell {...props} templateSuffix="beef-rubs" />;
  }

  const extraSections = (
    <>
      {settings?.highlightText && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3 text-sm leading-relaxed text-amber-900">
          {settings.highlightText}
        </div>
      )}
      {hasMetaContent && (
        <MetafieldSubTabs
          product={props.product}
          metafieldTitles={titlesWithOverride}
          flavorTagClass="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
        />
      )}
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
    <ProductPageShell {...props} templateSuffix="beef-rubs" extraSections={extraSections} />
  );
}
