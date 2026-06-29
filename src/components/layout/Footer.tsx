import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Mail, MapPin, Phone } from "lucide-react";
import logo from "@/assets/mls-logo.png";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type FLink = { label: string; to: string; params?: any };

const SHOP_LINKS: FLink[] = [
  { label: "All Beef", to: "/collections/$handle", params: { handle: "all-beef" } },
  { label: "All Lamb", to: "/collections/$handle", params: { handle: "all-lamb" } },
  { label: "Australian Wagyu", to: "/collections/$handle", params: { handle: "australian-wagyu-beef-mb-4-5" } },
  { label: "Meat Boxes", to: "/collections/$handle", params: { handle: "box-collection" } },
  { label: "Build Your Box", to: "/collections/$handle", params: { handle: "build-box" } },
];

const HELP_LINKS: FLink[] = [
  { label: "Track Order", to: "/account" },
  { label: "Shipping & Returns", to: "/" },
  { label: "FAQ", to: "/" },
  { label: "Contact Us", to: "/" },
];

export function Footer() {
  return (
    <footer className="mt-16 bg-charcoal text-charcoal-foreground">
      <div className="container mx-auto px-4 py-12">
        {/* Desktop / tablet */}
        <div className="hidden gap-10 md:grid md:grid-cols-4">
          <BrandCol />
          <FooterCol heading="Shop" links={SHOP_LINKS} />
          <FooterCol heading="Help" links={HELP_LINKS} />
          <ContactCol />
        </div>

        {/* Mobile accordion */}
        <div className="md:hidden">
          <BrandCol />
          <Accordion type="single" collapsible className="mt-6">
            <AccordionItem value="shop" className="border-off-white/10">
              <AccordionTrigger className="font-display text-sm font-bold uppercase tracking-wider text-gold hover:no-underline">
                Shop
              </AccordionTrigger>
              <AccordionContent>
                <FooterLinks links={SHOP_LINKS} />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="help" className="border-off-white/10">
              <AccordionTrigger className="font-display text-sm font-bold uppercase tracking-wider text-gold hover:no-underline">
                Help
              </AccordionTrigger>
              <AccordionContent>
                <FooterLinks links={HELP_LINKS} />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="contact" className="border-off-white/10">
              <AccordionTrigger className="font-display text-sm font-bold uppercase tracking-wider text-gold hover:no-underline">
                Get in Touch
              </AccordionTrigger>
              <AccordionContent>
                <ContactList />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      <div className="border-t border-off-white/10">
        <div className="container mx-auto flex flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-off-white/60 sm:flex-row">
          <span>© {new Date().getFullYear()} Muscat Livestock Store. 100% Halal certified.</span>
          <span>Premium butcher cuts · Delivered fresh</span>
        </div>
      </div>
    </footer>
  );
}

function BrandCol() {
  return (
    <div>
      <div className="mb-4">
        <img
          src={logo}
          alt="Muscat Livestock Store"
          className="h-14 w-auto brightness-0 invert"
        />
      </div>
      <p className="text-sm text-off-white/70">
        Premium fresh red meat — beef, lamb, mutton & specialty cuts —
        delivered across the UAE & Oman.
      </p>
      <div className="mt-4 flex gap-3">
        <a href="#" aria-label="Instagram" className="hover:text-gold">
          <Instagram className="h-5 w-5" />
        </a>
        <a href="#" aria-label="Facebook" className="hover:text-gold">
          <Facebook className="h-5 w-5" />
        </a>
      </div>
    </div>
  );
}

function ContactCol() {
  return (
    <div>
      <h4 className="mb-4 font-display text-sm font-bold uppercase tracking-wider text-gold">
        Get in Touch
      </h4>
      <ContactList />
    </div>
  );
}

function ContactList() {
  return (
    <ul className="space-y-3 text-sm text-off-white/80">
      <li className="flex items-start gap-2">
        <MapPin className="mt-0.5 h-4 w-4 text-gold" />
        <span>Muscat, Oman & Dubai, UAE</span>
      </li>
      <li className="flex items-center gap-2">
        <Phone className="h-4 w-4 text-gold" />
        <span>+968 0000 0000</span>
      </li>
      <li className="flex items-center gap-2">
        <Mail className="h-4 w-4 text-gold" />
        <span>hello@mls.com</span>
      </li>
    </ul>
  );
}

function FooterCol({ heading, links }: { heading: string; links: FLink[] }) {
  return (
    <div>
      <h4 className="mb-4 font-display text-sm font-bold uppercase tracking-wider text-gold">
        {heading}
      </h4>
      <FooterLinks links={links} />
    </div>
  );
}

function FooterLinks({ links }: { links: FLink[] }) {
  return (
    <ul className="space-y-2 text-sm text-off-white/80">
      {links.map((l) => (
        <li key={l.label}>
          <Link to={l.to as any} params={l.params} className="hover:text-gold">
            {l.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
