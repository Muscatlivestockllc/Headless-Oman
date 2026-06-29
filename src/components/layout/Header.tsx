import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ShoppingBag,
  Heart,
  User,
  Menu,
  ChevronDown,
  Beef,
  Drumstick,
  Star,
  Tag,
  Award,
  Flame,
  Sandwich,
  Package,
  Boxes,
  Info,
  Compass,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { useWishlistStore } from "@/stores/wishlistStore";
import { Button } from "@/components/ui/button";
import { MegaMenu, BEEF_MEGA, LAMB_MEGA } from "./MegaMenu";
import { SearchAutosuggest } from "./SearchAutosuggest";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import { useLocaleStore, dirFor } from "@/stores/localeStore";
import { useT } from "@/i18n/strings";
import logo from "@/assets/mls-logo.png";

export function Header() {
  const totalItems = useCartStore((s) =>
    s.items.reduce((n, i) => n + i.quantity, 0)
  );
  const setCartOpen = useCartStore((s) => s.setOpen);
  const wishlistCount = useWishlistStore((s) => s.ids.length);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const locale = useLocaleStore((s) => s.locale);
  const t = useT();
  const drawerSide = dirFor(locale) === "rtl" ? "right" : "left";
  const closeMobile = () => setMobileNavOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      {/* Top bar */}
      <div className="container relative mx-auto flex items-center gap-3 px-4 py-3">
        {/* Mobile menu */}
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t("nav.menu")}>
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side={drawerSide} className="w-80">
            <SheetHeader>
              <SheetTitle className="font-display text-crimson">{t("nav.menu")}</SheetTitle>
            </SheetHeader>
            <div className="mt-3 inline-flex items-center gap-0.5 self-start rounded-full bg-muted p-0.5 text-[11px] font-semibold uppercase tracking-wider">
              <button
                type="button"
                onClick={() => useLocaleStore.getState().setLocale("en")}
                aria-pressed={locale === "en"}
                className={`rounded-full px-3 py-1 transition-colors ${locale === "en" ? "bg-crimson text-crimson-foreground" : "text-muted-foreground"}`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => useLocaleStore.getState().setLocale("ar")}
                aria-pressed={locale === "ar"}
                lang="ar"
                className={`rounded-full px-3 py-1 transition-colors ${locale === "ar" ? "bg-crimson text-crimson-foreground" : "text-muted-foreground"}`}
              >
                العربية
              </button>
            </div>
            <div className="mt-3">
              <SearchAutosuggest variant="mobile" />
            </div>
            <nav className="mt-6 flex flex-col gap-1 text-sm">
              {[
                { label: t("nav.all_beef"), handle: "all-beef", Icon: Beef },
                { label: t("nav.all_lamb"), handle: "all-lamb", Icon: Drumstick },
                { label: t("nav.all_mutton"), handle: "all-mutton", Icon: Drumstick },
                { label: t("nav.aus_wagyu"), handle: "australian-wagyu-beef-mb-4-5", Icon: Award },
                { label: t("nav.aus_lamb"), handle: "australian-lamb", Icon: Star },
                { label: t("nav.box_collection"), handle: "box-collection", Icon: Boxes },
                { label: t("nav.build_box"), handle: "build-box", Icon: Package },
                { label: t("nav.beef_steaks"), handle: "beef-steaks", Icon: Flame },
                { label: t("nav.beef_burgers"), handle: "beef-burgers-patties", Icon: Sandwich },
              ].map(({ label, handle, Icon }) => (
                <Link
                  key={handle}
                  to="/collections/$handle"
                  params={{ handle }}
                  onClick={closeMobile}
                  className="flex items-center gap-3 rounded-sm px-3 py-2 hover:bg-muted"
                >
                  <Icon className="h-4 w-4 text-crimson" />
                  <span>{label}</span>
                </Link>
              ))}
              <Link
                to="/account/login"
                onClick={closeMobile}
                className="mt-3 flex items-center gap-3 rounded-sm border-t border-border px-3 py-2 pt-4 hover:bg-muted"
              >
                <User className="h-4 w-4 text-crimson" />
                <span>{t("nav.account")}</span>
              </Link>
            </nav>
          </SheetContent>
        </Sheet>

        <Link
          to="/"
          aria-label="MLS — Muscat Livestock Store"
          className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center lg:static lg:translate-x-0 lg:translate-y-0"
        >
          <img
            src={logo}
            alt="Muscat Livestock Store"
            className="h-10 w-auto sm:h-12"
          />
        </Link>

        <div className="ms-4 hidden flex-1 lg:block">
          <div className="mx-auto max-w-xl">
            <SearchAutosuggest variant="desktop" />
          </div>
        </div>

        <div className="ms-auto flex items-center gap-1">
          <Link to="/account/login" aria-label={t("nav.account")} className="hidden sm:inline-flex">
            <Button variant="ghost" size="icon">
              <User className="h-5 w-5" />
            </Button>
          </Link>
          <Link to="/account" aria-label={t("nav.wishlist")} className="relative">
            <Button variant="ghost" size="icon">
              <Heart className="h-5 w-5" />
            </Button>
            {wishlistCount > 0 && (
              <span className="absolute -end-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 text-[10px] font-bold text-gold-foreground">
                {wishlistCount}
              </span>
            )}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label={t("nav.cart")}
            onClick={() => setCartOpen(true)}
          >
            <ShoppingBag className="h-5 w-5" />
            {totalItems > 0 && (
              <span className="absolute -end-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-crimson px-1 text-[10px] font-bold text-crimson-foreground">
                {totalItems}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Mobile search row — always visible below header on mobile/tablet */}
      <div className="border-t border-border bg-card px-4 py-2 lg:hidden">
        <SearchAutosuggest variant="mobile" />
      </div>

      {/* Nav rows (desktop) */}
      <nav className="hidden border-t border-border bg-card lg:block">
        <div className="container relative mx-auto flex items-center justify-center gap-7 px-4 py-2.5 text-[13px] font-semibold uppercase tracking-wider">
          <NavItem label={t("nav.shop_beef")} Icon={Beef} mega={BEEF_MEGA} />
          <NavItem label={t("nav.shop_lamb")} Icon={Drumstick} mega={LAMB_MEGA} />
          <NavLink to="/collections/$handle" params={{ handle: "all" }} label={t("nav.reviews")} Icon={Star} />
          <NavLink to="/collections/$handle" params={{ handle: "redeem-your-rewards" }} label={t("nav.offers")} Icon={Tag} />
          <NavLink to="/collections/$handle" params={{ handle: "australian-black-angus-beef" }} label={t("nav.angus")} Icon={Award} />
          <NavLink to="/collections/$handle" params={{ handle: "australian-wagyu-beef-mb-4-5" }} label={t("nav.wagyu")} Icon={Flame} />
        </div>
        <div className="container mx-auto flex items-center justify-center gap-7 border-t border-border px-4 py-2 text-[12px] tracking-wide text-muted-foreground">
          <NavLink to="/collections/$handle" params={{ handle: "beef-burgers-patties" }} label={t("nav.burgers")} Icon={Sandwich} />
          <NavLink to="/collections/$handle" params={{ handle: "beef-mishkak-barbecue-cubes-fondue" }} label={t("nav.bbq")} Icon={Flame} />
          <NavLink to="/collections/$handle" params={{ handle: "box-collection" }} label={t("nav.boxes")} Icon={Boxes} />
          <NavLink to="/collections/$handle" params={{ handle: "build-box" }} label={t("nav.build_box")} Icon={Package} />
          <NavLink to="/collections/$handle" params={{ handle: "all" }} label={t("nav.about")} Icon={Info} />
          <NavLink to="/collections/$handle" params={{ handle: "all" }} label={t("nav.explore")} Icon={Compass} />
        </div>
      </nav>
    </header>
  );
}

function NavItem({ label, mega, Icon }: { label: string; mega: any[]; Icon?: LucideIcon }) {
  return (
    <div className="group">
      <button className="flex items-center gap-1.5 transition-colors hover:text-crimson">
        {Icon && <Icon className="h-4 w-4" />}
        {label} <ChevronDown className="h-3 w-3" />
      </button>
      <MegaMenu columns={mega} />
    </div>
  );
}

function NavLink({ to, params, label, Icon }: { to: string; params: any; label: string; Icon?: LucideIcon }) {
  return (
    <Link
      to={to as any}
      params={params}
      className="flex items-center gap-1.5 transition-colors hover:text-crimson"
      activeProps={{ className: "text-crimson" }}
    >
      {Icon && <Icon className="h-4 w-4" />}
      <span>{label}</span>
    </Link>
  );
}
