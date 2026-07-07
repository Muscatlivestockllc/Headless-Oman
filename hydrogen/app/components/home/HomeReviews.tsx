import { Star, ShieldCheck, User } from "lucide-react";
import { Link } from "react-router";
import type { JudgemeReview } from "~/lib/judgeme";
import { HScroller } from "./HScroller";
import { useT } from "~/i18n/strings";
import { useLocalePath } from "~/stores/localeStore";

interface HomeReviewsProps {
  reviews: JudgemeReview[];
  totalCount: number;
  averageRating: number;
}

function Stars({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  const rounded = Math.round(rating);
  const sz = size === "lg" ? "h-5 w-5" : "h-3.5 w-3.5";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${sz} ${n <= rounded ? "fill-amber-400 text-amber-400" : "fill-white/20 text-white/20"}`}
        />
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: JudgemeReview }) {
  const t = useT();
  return (
    <div className="flex w-72 shrink-0 snap-start flex-col gap-3 rounded-2xl border border-white/15 bg-white/[0.06] p-5 sm:w-80">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/15 text-white/60">
            <User className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{review.reviewer.name}</p>
            <p className="text-xs text-white/50">
              {new Date(review.created_at).toLocaleDateString("en-AE", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
        {review.verified === "verified_buyer" && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
            <ShieldCheck className="h-3 w-3" /> {t("reviews.verified")}
          </span>
        )}
      </div>
      <Stars rating={review.rating} />
      {review.title && (
        <p className="text-sm font-semibold text-white">{review.title}</p>
      )}
      {review.body && (
        <p className="line-clamp-4 text-sm leading-relaxed text-white/70">{review.body}</p>
      )}
    </div>
  );
}

export function HomeReviews({ reviews, totalCount, averageRating }: HomeReviewsProps) {
  const t = useT();
  const lp = useLocalePath();
  if (!reviews.length) return null;

  return (
    <section className="bg-section-dark py-3 md:py-6">
      <div className="container mx-auto px-4">
        <div className="mb-3 text-center md:mb-4">
          <div className="mb-1.5 flex items-center justify-center gap-3">
            <span className="h-px w-6 rounded-full bg-white/40" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">{t("reviews.verified_buyers")}</span>
            <span className="h-px w-6 rounded-full bg-white/40" />
          </div>
          <h2 className="font-display text-2xl font-bold leading-snug tracking-tight text-white md:text-3xl">
            {t("reviews.heading")}
          </h2>
          {averageRating > 0 && (
            <div className="mt-3 flex items-center justify-center gap-3">
              <Stars rating={averageRating} size="lg" />
              <span className="font-display text-xl font-extrabold text-white">
                {averageRating.toFixed(1)}
              </span>
              {totalCount > 0 && (
                <span className="text-sm text-white/55">({totalCount.toLocaleString()} {t("reviews.count_suffix")})</span>
              )}
            </div>
          )}
        </div>

        <HScroller>
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </HScroller>

        <div className="mt-5 flex justify-center">
          <Link
            to={lp("/pages/customer-reviews")}
            className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-bold uppercase tracking-wide !text-white transition-all hover:bg-white/20"
          >
            {t("reviews.see_all")}
          </Link>
        </div>
      </div>
    </section>
  );
}
