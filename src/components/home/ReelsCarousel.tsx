import { useMemo, useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Play, X, Volume2, VolumeX, ChevronUp, ChevronDown, ShoppingBag } from "lucide-react";
import {
  storefrontApiRequest,
  REELS_QUERY,
  formatPrice,
  shopifyImageUrl,
  type ReelProduct,
} from "@/lib/shopify";
import { Button } from "@/components/ui/button";
import { HScroller } from "./HScroller";
import { cn } from "@/lib/utils";

interface RawEdge {
  node: {
    id: string;
    title: string;
    handle: string;
    priceRange: { minVariantPrice: { amount: string; currencyCode: string } };
    featuredImage: { url: string; altText: string | null } | null;
    media: {
      edges: Array<{
        node: {
          mediaContentType: string;
          previewImage?: { url: string; altText: string | null } | null;
          sources?: Array<{ url: string; mimeType: string; format: string; width: number; height: number }>;
          embedUrl?: string;
        };
      }>;
    };
  };
}

function pickReels(edges: RawEdge[]): ReelProduct[] {
  const reels: ReelProduct[] = [];
  for (const e of edges) {
    const n = e.node;
    const videoNode = n.media.edges.find(
      (m) => m.node.mediaContentType === "VIDEO" || m.node.mediaContentType === "EXTERNAL_VIDEO"
    );
    if (!videoNode) continue;
    const isExternal = videoNode.node.mediaContentType === "EXTERNAL_VIDEO";
    // Prefer mp4 source if multiple
    const mp4 = videoNode.node.sources?.find((s) => s.mimeType === "video/mp4")
      ?? videoNode.node.sources?.[0];
    reels.push({
      id: n.id,
      title: n.title,
      handle: n.handle,
      price: n.priceRange.minVariantPrice,
      poster: videoNode.node.previewImage?.url ?? n.featuredImage?.url ?? null,
      videoUrl: !isExternal ? mp4?.url ?? null : null,
      embedUrl: isExternal ? videoNode.node.embedUrl ?? null : null,
    });
  }
  return reels;
}

export function ReelsCarousel() {
  const { data, isLoading } = useQuery({
    queryKey: ["reels"],
    queryFn: async () => {
      // Try tagged "reel" first, fall back to all recent products and filter client-side.
      let res = await storefrontApiRequest<any>(REELS_QUERY, {
        first: 20,
        query: "tag:reel",
      });
      let edges: RawEdge[] = res?.data?.products?.edges ?? [];
      let reels = pickReels(edges);
      if (reels.length === 0) {
        res = await storefrontApiRequest<any>(REELS_QUERY, { first: 30, query: null });
        edges = res?.data?.products?.edges ?? [];
        reels = pickReels(edges);
      }
      return reels;
    },
  });

  const reels = useMemo(() => data ?? [], [data]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (isLoading) {
    return (
      <section className="container mx-auto px-4 py-12">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-crimson">
              Watch & shop
            </div>
            <h2 className="font-display text-2xl font-extrabold md:text-3xl">MLS Reels</h2>
          </div>
        </div>
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="aspect-[9/16] w-[160px] flex-shrink-0 animate-pulse rounded-xl bg-muted md:w-[200px]" />
          ))}
        </div>
      </section>
    );
  }

  if (reels.length === 0) return null;

  return (
    <section className="container mx-auto px-4 py-12">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-crimson">
            Watch & shop
          </div>
          <h2 className="font-display text-2xl font-extrabold md:text-3xl">MLS Reels</h2>
        </div>
      </div>

      <HScroller>
        {reels.map((r, i) => (
          <button
            key={r.id}
            onClick={() => setActiveIndex(i)}
            className="group relative aspect-[9/16] w-[160px] flex-shrink-0 snap-start overflow-hidden rounded-xl bg-muted shadow-sm transition-transform hover:-translate-y-1 md:w-[220px]"
          >
            {r.poster && (
              <img
                src={shopifyImageUrl(r.poster, 400)}
                alt={r.title}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal/85 via-charcoal/10 to-transparent" />
            <div className="absolute inset-0 grid place-items-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-off-white/90 text-charcoal shadow-md transition-transform group-hover:scale-110">
                <Play className="ml-0.5 h-5 w-5 fill-current" />
              </span>
            </div>
            <div className="absolute inset-x-2 bottom-2 text-left">
              <div className="line-clamp-2 text-xs font-semibold text-off-white">
                {r.title}
              </div>
              <div className="mt-0.5 text-[11px] font-bold text-crimson-foreground">
                {formatPrice(r.price.amount, r.price.currencyCode)}
              </div>
            </div>
          </button>
        ))}
      </HScroller>

      <AnimatePresence>
        {activeIndex !== null && (
          <ReelsPlayer
            reels={reels}
            startIndex={activeIndex}
            onClose={() => setActiveIndex(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

function ReelsPlayer({
  reels,
  startIndex,
  onClose,
}: {
  reels: ReelProduct[];
  startIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reel = reels[index];

  // Autoplay on change
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    v.play().catch(() => {/* autoplay blocked */});
  }, [index]);

  // ESC to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") setIndex((i) => Math.min(reels.length - 1, i + 1));
      if (e.key === "ArrowUp") setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [reels.length, onClose]);

  const next = () => setIndex((i) => Math.min(reels.length - 1, i + 1));
  const prev = () => setIndex((i) => Math.max(0, i - 1));

  if (!reel) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] grid place-items-center bg-charcoal/95 backdrop-blur"
      onClick={onClose}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-off-white/10 text-off-white hover:bg-off-white/20"
      >
        <X className="h-5 w-5" />
      </button>

      <div
        className="relative h-[88vh] max-h-[800px] aspect-[9/16] overflow-hidden rounded-2xl bg-black shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {reel.videoUrl ? (
          <video
            ref={videoRef}
            key={reel.id}
            src={reel.videoUrl}
            poster={reel.poster ?? undefined}
            playsInline
            autoPlay
            loop
            muted={muted}
            className="h-full w-full object-cover"
          />
        ) : reel.embedUrl ? (
          <iframe
            key={reel.id}
            src={`${reel.embedUrl}?autoplay=1&mute=${muted ? 1 : 0}&controls=0&loop=1`}
            allow="autoplay; encrypted-media"
            className="h-full w-full"
          />
        ) : null}

        {/* Gradient overlay */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/85 to-transparent" />

        {/* Top-right controls */}
        <div className="absolute right-3 top-3 flex flex-col gap-2">
          {reel.videoUrl && (
            <button
              type="button"
              aria-label={muted ? "Unmute" : "Mute"}
              onClick={() => setMuted((m) => !m)}
              className="grid h-10 w-10 place-items-center rounded-full bg-off-white/10 text-off-white hover:bg-off-white/20"
            >
              {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
          )}
        </div>

        {/* Up/Down navigation */}
        <button
          type="button"
          aria-label="Previous reel"
          onClick={prev}
          disabled={index === 0}
          className={cn(
            "absolute left-1/2 top-3 -translate-x-1/2 grid h-9 w-9 place-items-center rounded-full bg-off-white/10 text-off-white hover:bg-off-white/20",
            index === 0 && "opacity-30 cursor-not-allowed"
          )}
        >
          <ChevronUp className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Next reel"
          onClick={next}
          disabled={index === reels.length - 1}
          className={cn(
            "absolute bottom-24 left-1/2 -translate-x-1/2 grid h-9 w-9 place-items-center rounded-full bg-off-white/10 text-off-white hover:bg-off-white/20",
            index === reels.length - 1 && "opacity-30 cursor-not-allowed"
          )}
        >
          <ChevronDown className="h-5 w-5" />
        </button>

        {/* Bottom info + CTA */}
        <div className="absolute inset-x-0 bottom-0 p-4">
          <div className="mb-2 line-clamp-2 text-sm font-semibold text-off-white">
            {reel.title}
          </div>
          <div className="mb-3 font-display text-xl font-bold text-off-white">
            {formatPrice(reel.price.amount, reel.price.currencyCode)}
          </div>
          <Button
            asChild
            className="w-full bg-crimson text-crimson-foreground hover:bg-rich-red"
            onClick={onClose}
          >
            <Link to="/products/$handle" params={{ handle: reel.handle }}>
              <ShoppingBag className="mr-2 h-4 w-4" /> Shop this
            </Link>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
