import { Truck, RefreshCw, ShieldCheck, Award } from "lucide-react";

const BADGES = [
  { Icon: RefreshCw, title: "Free Returns", desc: "Quality guaranteed" },
  { Icon: Truck, title: "Same-Day Delivery", desc: "Across UAE & Oman" },
  { Icon: ShieldCheck, title: "100% Halal", desc: "Certified butchered" },
  { Icon: Award, title: "Premium Cuts", desc: "Hand-selected daily" },
];

export function TrustBadges() {
  return (
    <section className="border-b border-border bg-bone">
      <div className="container mx-auto grid grid-cols-2 gap-3 px-4 py-6 md:grid-cols-4 md:gap-6 md:py-8">
        {BADGES.map(({ Icon, title, desc }) => (
          <div
            key={title}
            className="flex flex-col items-center gap-2 rounded-lg bg-background/60 p-4 text-center md:flex-row md:gap-3 md:bg-transparent md:p-0 md:text-left"
          >
            <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-full bg-crimson/10 text-crimson md:h-12 md:w-12">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="font-display text-[13px] font-bold leading-tight md:text-sm">
                {title}
              </div>
              <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground md:text-xs">
                {desc}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
