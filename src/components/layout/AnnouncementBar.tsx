import { useState } from "react";
import { X, Globe } from "lucide-react";
import { useLocaleStore } from "@/stores/localeStore";

const MESSAGES = [
  "Free same-day delivery in Muscat & Dubai over AED 150",
  "100% Halal certified · Premium butcher cuts delivered fresh",
  "New: Australian Wagyu MB 8/9 — limited stock",
];

export function AnnouncementBar() {
  const [open, setOpen] = useState(true);
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  if (!open) return null;
  return (
    <div className="bg-crimson text-crimson-foreground">
      <div className="container relative mx-auto flex items-center justify-between gap-3 px-4 py-2 text-xs sm:text-sm">
        <div className="hidden w-24 sm:block" aria-hidden />
        <div className="flex flex-1 items-center justify-center overflow-hidden">
          <div className="flex animate-[marquee_30s_linear_infinite] gap-12 whitespace-nowrap font-medium tracking-wide">
            {[...MESSAGES, ...MESSAGES].map((m, i) => (
              <span key={i}>★ {m}</span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-0.5 rounded-full bg-white/10 p-0.5 text-[11px] font-semibold uppercase tracking-wider sm:flex">
            <Globe className="ms-1 h-3.5 w-3.5 opacity-80" aria-hidden />
            <button
              type="button"
              onClick={() => setLocale("en")}
              aria-pressed={locale === "en"}
              className={`rounded-full px-2 py-0.5 transition-colors ${
                locale === "en" ? "bg-white text-crimson" : "hover:text-gold"
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLocale("ar")}
              aria-pressed={locale === "ar"}
              lang="ar"
              className={`rounded-full px-2 py-0.5 transition-colors ${
                locale === "ar" ? "bg-white text-crimson" : "hover:text-gold"
              }`}
            >
              العربية
            </button>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Dismiss announcement"
            className="grid h-6 w-6 place-items-center rounded-full hover:bg-white/15"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <style>{`@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
    </div>
  );
}
