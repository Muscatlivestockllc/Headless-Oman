import { useState, useRef, type ReactNode } from "react";
import { Plus, Minus } from "lucide-react";

// Shared types used by all template components and the loader
export type TemplateAccordion = { heading: string; content: string };
export type TemplateSetting = {
  sectionTitle: string | null;
  highlightText: string | null;
  accordions: TemplateAccordion[];
};

export function SubAccordion({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between py-3 text-left text-sm font-medium transition-colors hover:text-crimson"
      >
        {title}
        {open
          ? <Minus className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          : <Plus className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        }
      </button>
      <div
        ref={ref}
        className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
        style={{ maxHeight: open ? "none" : 0 }}
      >
        <div className="pb-3 text-sm text-muted-foreground leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
}

export function MetafieldSubTabs({
  product,
  metafieldTitles,
  flavorTagClass = "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
}: {
  product: any;
  metafieldTitles: Record<string, string>;
  flavorTagClass?: string;
}) {
  const populated = Object.entries(metafieldTitles)
    .map(([key, title]) => ({
      key,
      title,
      value: product.metafields?.find((m: any) => m?.key === key)?.value ?? null,
    }))
    .filter((item) => item.value !== null);

  if (populated.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-muted/30 px-4 pt-1 pb-1">
      {populated.map(({ key, title, value }, idx) =>
        key === "flavor_profile" ? (
          <SubAccordion key={key} title={title} defaultOpen={idx === 0}>
            <div className="flex flex-wrap gap-2 pt-1">
              {value!.split(",").map((tag: string) => (
                <span key={tag} className={`rounded-full px-3 py-1 text-xs font-semibold ${flavorTagClass}`}>
                  {tag.trim()}
                </span>
              ))}
            </div>
          </SubAccordion>
        ) : (
          <SubAccordion key={key} title={title} defaultOpen={idx === 0}>
            <div
              className="prose prose-sm max-w-none [&_p]:leading-relaxed"
              dangerouslySetInnerHTML={{ __html: value! }}
            />
          </SubAccordion>
        )
      )}
    </div>
  );
}