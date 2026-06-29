import { ProductPageShell, type ProductPageShellProps } from "./ProductPageShell";
import { MetafieldSubTabs, SubAccordion, type TemplateSetting } from "./SubAccordion";

const METAFIELD_TITLES: Record<string, string> = {
  understanding_rubs:   "About Picanha",
  usage_guide:          "Cooking Guide",
  flavor_profile:       "Flavor Profile",
  pairing_suggestions:  "Serving Suggestions",
  ingredients:          "What's Included",
  mls_rub:              "Butcher's Notes",
};

interface Props extends ProductPageShellProps {
  templateSettings?: Record<string, TemplateSetting>;
}

export function PicanhaCutTemplate({ templateSettings, ...props }: Props) {
  const settings = templateSettings?.["picanha"];
  const titlesWithOverride = settings?.sectionTitle
    ? { ...METAFIELD_TITLES, understanding_rubs: settings.sectionTitle }
    : METAFIELD_TITLES;
  const hasMetaContent = Object.keys(titlesWithOverride).some(
    (key) => props.product.metafields?.find((m: any) => m?.key === key)?.value ?? null,
  );
  const hasExtraContent =
    hasMetaContent || !!settings?.highlightText || (settings?.accordions?.length ?? 0) > 0;

  if (!hasExtraContent) return <ProductPageShell {...props} templateSuffix="picanha" />;

  return (
    <ProductPageShell
      {...props}
      templateSuffix="picanha"
      extraSections={
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
              flavorTagClass="bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300"
            />
          )}
          {(settings?.accordions ?? []).length > 0 && (
            <div className="mt-2 rounded-lg border border-border bg-muted/30 px-4 pt-1 pb-1">
              {settings!.accordions.map((item, i) => (
                <SubAccordion key={i} title={item.heading}>
                  <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: item.content }} />
                </SubAccordion>
              ))}
            </div>
          )}
        </>
      }
    />
  );
}
