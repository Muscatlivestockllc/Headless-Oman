import { useEffect, useRef, useState } from "react";
import { StarRating } from "~/components/reviews/StarRating";
import { fieldMap, str, num, listNodes, type RawNode } from "./fields";

// Testimonial reviews ("MLS is loved by over 50,000 customers"). Always a rotating carousel with
// dot indicators (auto-advances, swipeable), matching the live site — even for a single review.
export function MlsReviews({ node }: { node: RawNode }) {
  const fm = fieldMap(node);
  const heading = str(fm, "heading");
  const headRating = num(fm, "rating") ?? 5;
  const reviews = listNodes(fm, "reviews").map((n) => {
    const f = fieldMap(n);
    return { id: n.id ?? n.handle ?? "", quote: str(f, "quote"), author: str(f, "author"), rating: num(f, "rating") ?? 5 };
  }).filter((r) => r.quote || r.author);

  const [current, setCurrent] = useState(0);
  const count = reviews.length;
  const multi = count > 1;

  // Auto-advance every 5s (only when there's more than one).
  const nextRef = useRef(() => setCurrent((c) => (c + 1) % count));
  nextRef.current = () => setCurrent((c) => (c + 1) % count);
  useEffect(() => {
    if (!multi) return;
    const id = setInterval(() => nextRef.current(), 5000);
    return () => clearInterval(id);
  }, [multi]);

  if (!heading && count === 0) return null;

  return (
    <section className="bg-[oklch(0.96_0.02_85)] py-10 md:py-14">
      <div className="container mx-auto px-4 text-center">
        {heading && (
          <h2 className="mx-auto max-w-2xl font-display text-2xl font-bold tracking-tight md:text-3xl">{heading}</h2>
        )}
        <div className="mt-3 flex justify-center text-crimson">
          <StarRating rating={headRating} size="lg" />
        </div>

        {count > 0 && (
          <div className="relative mx-auto mt-8 max-w-2xl overflow-hidden">
            {/* Sliding track */}
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${current * 100}%)` }}
            >
              {reviews.map((r) => (
                <div key={r.id} className="w-full shrink-0 px-2">
                  <div className="mx-auto flex max-w-xl flex-col items-center gap-2">
                    <StarRating rating={r.rating} size="md" />
                    {r.author && (
                      <p className="font-display text-lg font-bold text-foreground md:text-xl">{r.author}</p>
                    )}
                    {r.quote && (
                      <p className="text-sm leading-relaxed text-muted-foreground md:text-base">"{r.quote}"</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Dot indicators */}
            {multi && (
              <div className="mt-6 flex items-center justify-center gap-2">
                {reviews.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Go to review ${i + 1}`}
                    onClick={() => setCurrent(i)}
                    className={
                      i === current
                        ? "h-2 w-6 rounded-full bg-crimson transition-all"
                        : "h-2 w-2 rounded-full bg-crimson/30 transition-all hover:bg-crimson/50"
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
