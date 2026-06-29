import { Link } from "react-router";
import { useLocalePath } from "@/stores/localeStore";

export interface MegaColumn {
  title: string;
  links: Array<{ label: string; url: string }>;
}

interface MegaMenuProps {
  columns: MegaColumn[];
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onLinkClick?: () => void;
}

export function MegaMenu({ columns, onMouseEnter, onMouseLeave, onLinkClick }: MegaMenuProps) {
  const lp = useLocalePath();
  const isSimple = columns.length === 1 && !columns[0].title;

  if (isSimple) {
    return (
      <div
        className="absolute left-0 top-full z-50 min-w-[180px]"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div className="h-1.5" />
        <div className="rounded-md border border-border bg-card shadow-lg overflow-hidden">
          <ul className="py-1.5">
            {columns[0].links.map((l) => (
              <li key={l.url + l.label}>
                <Link
                  to={lp(l.url)}
                  prefetch="intent"
                  onClick={onLinkClick}
                  className="block px-4 py-1.5 text-[12px] font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-crimson"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div
      className="absolute left-0 right-0 top-full z-50"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="border-t border-border bg-card shadow-lg">
        <div className="container mx-auto px-6 py-5">
          <div
            className="grid gap-x-8 gap-y-1"
            style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}
          >
            {columns.map((col) => (
              <div key={col.title}>
                {col.title && (
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-crimson">
                    {col.title}
                  </p>
                )}
                <ul className="space-y-1">
                  {col.links.map((l) => (
                    <li key={l.url + l.label}>
                      <Link
                        to={lp(l.url)}
                        prefetch="intent"
                        onClick={onLinkClick}
                        className="block py-[3px] text-[13px] text-foreground/75 transition-colors hover:text-crimson"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
