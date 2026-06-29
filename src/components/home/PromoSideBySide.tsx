import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import promoImg from "@/assets/promo-wagyu.jpg";

export function PromoSideBySide() {
  return (
    <section className="container mx-auto px-4 py-12">
      <div className="grid overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)] md:grid-cols-2">
        <div className="flex flex-col justify-center gap-4 p-8 md:p-12">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold">
            Limited Drop
          </span>
          <h3 className="font-display text-3xl font-extrabold leading-tight md:text-4xl">
            Australian Wagyu —<br /> butcher's cut series
          </h3>
          <p className="text-muted-foreground">
            Marbled to perfection. Hand-selected MB 4/5 cuts arriving fresh
            this week. Limited stock per drop.
          </p>
          <div>
            <Link
              to="/collections/$handle"
              params={{ handle: "australian-wagyu-beef-mb-4-5" }}
            >
              <Button size="lg" className="bg-crimson text-crimson-foreground hover:bg-rich-red">
                Shop the Drop
              </Button>
            </Link>
          </div>
        </div>
        <div className="relative min-h-[300px] bg-charcoal md:min-h-0">
          <img
            src={promoImg}
            alt="Wagyu marbling"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
      </div>
    </section>
  );
}
