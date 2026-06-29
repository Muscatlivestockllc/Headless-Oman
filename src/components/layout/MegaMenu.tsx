import { Link } from "@tanstack/react-router";

interface MegaColumn {
  title: string;
  links: Array<{ label: string; handle: string }>;
}

interface MegaMenuProps {
  columns: MegaColumn[];
}

export function MegaMenu({ columns }: MegaMenuProps) {
  return (
    <div className="absolute left-4 right-4 top-full z-50 hidden pt-3 group-hover:block">
      <div className="rounded-md border border-border bg-card p-6 shadow-[var(--shadow-card)]">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="mb-3 font-display text-sm font-bold uppercase tracking-wider text-crimson">
                {col.title}
              </h4>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.handle + l.label}>
                    <Link
                      to="/collections/$handle"
                      params={{ handle: l.handle }}
                      className="text-sm text-foreground transition-colors hover:text-crimson"
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
  );
}

// MLS mega menu data — derived from PRD + actual collection handles
export const BEEF_MEGA: MegaColumn[] = [
  {
    title: "Shop By Cuts",
    links: [
      { label: "Steaks", handle: "beef-steaks" },
      { label: "Bone-in Cubes", handle: "beef-bone-in-cubes" },
      { label: "Boneless Cubes", handle: "beef-boneless-cubes" },
      { label: "Mince", handle: "beef-mince" },
      { label: "Brisket", handle: "beef-brisket" },
      { label: "Beef Roast", handle: "beef-roast" },
      { label: "Ribs", handle: "beef-ribs" },
      { label: "Beef Stroganoff", handle: "beef-stroganoff" },
      { label: "Mishkak Cubes", handle: "beef-mishkak-barbecue-cubes-fondue" },
      { label: "Beef Burger Patties", handle: "beef-burgers-patties" },
      { label: "All Beef", handle: "all-beef" },
    ],
  },
  {
    title: "Shop By Origin",
    links: [
      { label: "Australian Black Angus", handle: "australian-black-angus-beef" },
      { label: "AUS Grass-fed Beef", handle: "australian-grass-fed-beef" },
      { label: "AUS Angus Beef", handle: "aus-angus-beef-collection" },
    ],
  },
  {
    title: "AUS Wagyu",
    links: [
      { label: "Wagyu MB 4/5", handle: "australian-wagyu-beef-mb-4-5" },
    ],
  },
  {
    title: "Shop Whole Cuts",
    links: [
      { label: "Beef Brisket Whole Cuts", handle: "beef-brisket" },
      { label: "Bone-In Whole Cuts", handle: "bone-in-cubes" },
      { label: "Boneless Whole Cuts", handle: "boneless-cubes" },
    ],
  },
];

export const LAMB_MEGA: MegaColumn[] = [
  {
    title: "Shop By Cuts",
    links: [
      { label: "All Lamb", handle: "all-lamb" },
      { label: "All Mutton", handle: "all-mutton" },
      { label: "Australian Lamb", handle: "australian-lamb" },
    ],
  },
  {
    title: "Featured",
    links: [{ label: "AUS Lamb Campaign", handle: "aus-lamb-campaign" }],
  },
  {
    title: "Bundles",
    links: [{ label: "Meat Box Collection", handle: "box-collection" }],
  },
  {
    title: "Build Your Own",
    links: [{ label: "Build Box", handle: "build-box" }],
  },
];
