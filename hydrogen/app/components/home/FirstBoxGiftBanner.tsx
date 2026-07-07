const GIFT_ITEMS = [
  { emoji: "🥩", label: "1x Angus Striploin Steak" },
  { emoji: "🍔", label: "2x AUS Angus Burgers" },
  { emoji: "🚚", label: "Free delivery" },
];

export function FirstBoxGiftBanner() {
  return (
    <section className="border-b border-border bg-section-soft py-6 md:py-8">
      <div className="container mx-auto px-4">
        <p className="mb-5 text-center text-[10px] font-bold uppercase tracking-[0.25em] text-crimson">
          A gift in your first box.
        </p>
        <div className="grid grid-cols-3 gap-4 md:gap-10">
          {GIFT_ITEMS.map((item) => (
            <div key={item.label} className="flex flex-col items-center gap-2 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-full border border-border bg-white text-2xl shadow-sm">
                {item.emoji}
              </div>
              <p className="text-xs font-semibold leading-snug text-foreground md:text-sm">
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
