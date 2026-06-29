import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import heroImg from "@/assets/hero-meat.jpg";

export function HeroBanner() {
  return (
    <section className="relative overflow-hidden bg-charcoal text-charcoal-foreground">
      <img
        src={heroImg}
        alt="Premium fresh cuts"
        className="absolute inset-0 h-full w-full object-cover opacity-50"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-charcoal via-charcoal/70 to-transparent" />

      <div className="container relative mx-auto grid min-h-[520px] items-center gap-6 px-4 py-16 md:grid-cols-2 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-xl"
        >
          <span className="mb-4 inline-flex items-center rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
            ★ Premium Butcher · Est. Muscat
          </span>
          <h1 className="font-display text-4xl font-extrabold leading-[1.05] text-off-white sm:text-5xl md:text-6xl lg:text-7xl">
            Cuts worthy of a{" "}
            <span className="italic text-gold">centerpiece</span>.
          </h1>
          <p className="mt-5 max-w-md text-base text-off-white/80 md:text-lg">
            Hand-selected beef, lamb & specialty meats from the world's
            finest farms — delivered fresh to your door across the UAE & Oman.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/collections/$handle" params={{ handle: "all-beef" }}>
              <Button
                size="lg"
                className="bg-crimson text-crimson-foreground hover:bg-rich-red"
              >
                Shop Beef
              </Button>
            </Link>
            <Link to="/collections/$handle" params={{ handle: "australian-wagyu-beef-mb-4-5" }}>
              <Button
                size="lg"
                variant="outline"
                className="border-gold bg-transparent text-gold hover:bg-gold hover:text-gold-foreground"
              >
                Discover Wagyu
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
