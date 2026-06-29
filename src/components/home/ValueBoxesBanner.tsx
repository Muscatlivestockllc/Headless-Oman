import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import valueImg from "@/assets/value-boxes.jpg";

export function ValueBoxesBanner() {
  return (
    <section className="container mx-auto px-4 py-12">
      <div className="relative overflow-hidden rounded-xl bg-charcoal text-charcoal-foreground">
        <img
          src={valueImg}
          alt="Curated meat boxes"
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-crimson/90 via-crimson/60 to-transparent" />
        <div className="relative grid min-h-[280px] items-center px-8 py-12 md:grid-cols-2 md:px-12">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold">
              Curated by our butchers
            </span>
            <h3 className="mt-2 font-display text-3xl font-extrabold leading-tight md:text-4xl">
              Value Meat Boxes
            </h3>
            <p className="mt-3 max-w-md text-off-white/85">
              Save more on weekly essentials. Mix beef, lamb, mince and burgers
              in one curated box — delivered fresh.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/collections/$handle" params={{ handle: "box-collection" }}>
                <Button size="lg" className="bg-off-white text-charcoal hover:bg-gold hover:text-gold-foreground">
                  Shop Boxes
                </Button>
              </Link>
              <Link to="/collections/$handle" params={{ handle: "build-box" }}>
                <Button size="lg" variant="outline" className="border-off-white bg-transparent text-off-white hover:bg-off-white hover:text-charcoal">
                  Build Your Own
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
