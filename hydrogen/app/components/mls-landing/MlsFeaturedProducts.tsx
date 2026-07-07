import { useRef, useState } from "react";
import { Link } from "react-router";
import { Loader2 } from "lucide-react";
import { useLocalePath } from "@/stores/localeStore";
import { useCartStore } from "@/stores/cartStore";
import { Button } from "@/components/ui/button";
import { OptionButton } from "@/components/shared/OptionButton";
import { QuantitySelector } from "@/components/shared/QuantitySelector";
import { formatPrice, shopifyImageUrl, type ShopifyProduct } from "@/lib/shopify";

// Featured-products section — hand-picked products as large detail blocks with INLINE variant
// options (Weight / Fat / Rubs …) exactly like the product page, plus quantity + Add to cart.
export function MlsFeaturedProducts({ heading, products }: { heading?: string | null; products: ShopifyProduct[] }) {
  const lp = useLocalePath();
  if (products.length === 0) return null;

  // Multiple products alternate section background (tinted / plain white) — like the box pages
  // where one block sits on a pink band and the next on white. Single product = plain.
  const alternate = products.length > 1;

  return (
    <section id="products">
      {heading && (
        <h2 className="pt-10 text-center font-display text-2xl font-bold tracking-tight md:pt-14 md:text-3xl">{heading}</h2>
      )}
      {products.map((p, i) => {
        const tinted = alternate && i % 2 === 0;
        return (
          <div key={p.node.id} className={tinted ? "bg-bone" : "bg-background"}>
            <div className="container mx-auto max-w-5xl px-4 py-10 md:py-14">
              <FeaturedBlock product={p} lp={lp} />
            </div>
          </div>
        );
      })}
    </section>
  );
}

function FeaturedBlock({ product, lp }: { product: ShopifyProduct; lp: (p: string) => string }) {
  const node = product.node;
  const addItem = useCartStore((s) => s.addItem);
  const [isAdding, setIsAdding] = useState(false);
  const [qty, setQty] = useState(1);

  const image = node.images.edges[0]?.node;
  const variants = node.variants.edges.map((e) => e.node);
  const options = node.options ?? [];
  const currency = node.priceRange.minVariantPrice.currencyCode;

  // Initialize selection to the first available variant (during render, like the QuickBuy drawer).
  const [selected, setSelected] = useState<Record<string, string>>(() => {
    const firstAvail = variants.find((v) => v.availableForSale) ?? variants[0];
    const map: Record<string, string> = {};
    firstAvail?.selectedOptions.forEach((o) => (map[o.name] = o.value));
    return map;
  });

  const matched = variants.find((v) => v.selectedOptions.every((o) => selected[o.name] === o.value));
  const price = matched?.price ?? node.priceRange.minVariantPrice;
  const compareAt = matched?.compareAtPrice ?? null;
  const isAvailable = !!matched?.availableForSale;

  const availForValue = (optName: string, value: string) =>
    variants.some(
      (v) =>
        v.selectedOptions.find((o) => o.name === optName)?.value === value &&
        v.selectedOptions.every((o) => o.name === optName || selected[o.name] === undefined || selected[o.name] === o.value) &&
        v.availableForSale,
    );

  const handleAdd = () => {
    if (!matched || isAdding) return;
    setIsAdding(true);
    void addItem({
      product,
      variantId: matched.id,
      variantTitle: matched.title,
      price,
      compareAtPrice: compareAt,
      quantity: qty,
      selectedOptions: matched.selectedOptions,
    });
    setTimeout(() => setIsAdding(false), 350);
  };

  return (
    <div className="grid items-start gap-6 md:grid-cols-2 md:gap-10">
      {/* Image */}
      <Link to={lp(`/products/${node.handle}`)} className="block overflow-hidden rounded-2xl bg-muted">
        {image && (
          <img src={shopifyImageUrl(image.url, 800)} alt={image.altText ?? node.title} loading="lazy" className="h-full w-full object-cover" />
        )}
      </Link>

      {/* Details */}
      <div>
        <Link to={lp(`/products/${node.handle}`)}>
          <h3 className="font-display text-xl font-bold text-foreground transition-colors hover:text-crimson md:text-2xl">{node.title}</h3>
        </Link>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-display text-xl font-bold text-crimson md:text-2xl">{formatPrice(price.amount, currency)}</span>
          {compareAt && compareAt.amount !== price.amount && (
            <span className="text-sm text-muted-foreground line-through">{formatPrice(compareAt.amount, currency)}</span>
          )}
        </div>
        {node.description && (
          <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-muted-foreground">{node.description}</p>
        )}
        <p className={`mt-3 text-xs font-semibold ${isAvailable ? "text-green-600" : "text-muted-foreground"}`}>
          {isAvailable ? "● In stock" : "● Sold out"}
        </p>

        {/* Inline variant options */}
        <div className="mt-4 space-y-4">
          {options.map((opt) => {
            if (opt.values.length <= 1 && opt.values[0] === "Default Title") return null;
            const availableValues = opt.values.filter((v) => availForValue(opt.name, v));
            const hideUnavailable = availableValues.length > 0;
            return (
              <div key={opt.name}>
                <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{opt.name}</div>
                <div className="flex flex-wrap gap-2">
                  {opt.values.map((value) => {
                    if (hideUnavailable && !availableValues.includes(value)) return null;
                    const available = availForValue(opt.name, value);
                    return (
                      <OptionButton
                        key={value}
                        label={value}
                        active={selected[opt.name] === value}
                        disabled={!available}
                        onClick={() => available && setSelected((s) => ({ ...s, [opt.name]: value }))}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Quantity + Add to cart */}
        <div className="mt-5 flex items-center gap-3">
          <QuantitySelector value={qty} onChange={setQty} />
          {isAvailable ? (
            <Button variant="primary" onClick={handleAdd} disabled={isAdding} className="h-11 flex-1 rounded-md text-sm font-bold">
              {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add to cart"}
            </Button>
          ) : (
            <Button variant="primary" disabled className="h-11 flex-1 rounded-md text-sm font-bold opacity-60">Sold out</Button>
          )}
        </div>
      </div>
    </div>
  );
}
