import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { Link } from "react-router";
import { MessageCircle } from "lucide-react";

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

interface FaqAccordionProps {
  items: FaqItem[];
  showCta?: boolean;
  ctaHeading?: string;
  ctaSubtitle?: string;
}

export function FaqAccordion({
  items,
  showCta = false,
  ctaHeading = "Still have questions?",
  ctaSubtitle = "Our team is available 9 AM – 10 PM, all days of the week.",
}: FaqAccordionProps) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const toggle = (i: number) => setOpenIdx(openIdx === i ? null : i);

  return (
    <div>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div
            key={item.id}
            className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:border-crimson/30"
          >
            <button
              type="button"
              onClick={() => toggle(i)}
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
            >
              <span className="font-display text-base font-semibold text-foreground md:text-lg">
                {item.question}
              </span>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-crimson/10 text-crimson transition-all">
                {openIdx === i ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </span>
            </button>
            <div
              className="overflow-hidden transition-all duration-300 ease-in-out"
              style={{ maxHeight: openIdx === i ? "500px" : "0px" }}
            >
              <p className="px-6 pb-6 text-sm leading-relaxed text-muted-foreground md:text-base">
                {item.answer}
              </p>
            </div>
          </div>
        ))}
      </div>

      {showCta && (
        <div className="mt-10 overflow-hidden rounded-3xl bg-gradient-to-br from-crimson via-rich-red to-[#1a0a0a] p-10 text-center text-white shadow-xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/20">
            <MessageCircle className="h-7 w-7 text-white" />
          </div>
          <h2 className="font-display text-2xl font-extrabold md:text-3xl">{ctaHeading}</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-white/80 md:text-base">{ctaSubtitle}</p>
          <Link
            to="/pages/contact-us"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-sm font-bold shadow-md transition-all hover:scale-105 hover:shadow-lg"
            style={{ color: 'oklch(0.36 0.18 27)' }}
          >
            <MessageCircle className="h-4 w-4" />
            Contact Us
          </Link>
        </div>
      )}
    </div>
  );
}

// Helper to parse raw metaobject nodes into FaqItem[]
export function parseFaqItems(nodes: any[]): FaqItem[] {
  return nodes.map((node: any) => {
    const f = Object.fromEntries(node.fields.map((x: any) => [x.key, x.value]));
    return { id: node.id, question: f.question ?? "", answer: f.answer ?? "" };
  });
}
