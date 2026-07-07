import { fieldMap, str, imageUrl, listNodes, type RawNode } from "./fields";

// "THE DRY-AGED PROCESS" — a video (or image) on the left, heading/intro + a horizontal timeline of
// steps (label + image + text) on the right. Always dark-styled (this pattern is used on premium pages).
export function MlsProcess({ node }: { node: RawNode }) {
  const fm = fieldMap(node);
  const heading = str(fm, "heading");
  const intro = str(fm, "intro");
  const image = imageUrl(fm, "image");

  // Video field: uploaded Video has `sources`, GenericFile has `url`.
  const videoRef = fm["video"]?.reference as any;
  let videoUrl: string | null = null;
  let poster: string | null = null;
  if (videoRef?.sources?.length) {
    const mp4 = videoRef.sources.find((s: any) => s.mimeType === "video/mp4") ?? videoRef.sources[0];
    videoUrl = mp4?.url ?? null;
    poster = videoRef.previewImage?.url ?? null;
  } else if (videoRef?.url) {
    videoUrl = videoRef.url;
  }

  const steps = listNodes(fm, "steps").map((n) => {
    const f = fieldMap(n);
    return { id: n.id ?? n.handle ?? "", label: str(f, "label"), image: imageUrl(f, "image"), body: str(f, "body") };
  });

  if (!heading && steps.length === 0 && !videoUrl && !image) return null;

  return (
    <section className="bg-charcoal py-10 text-off-white md:py-14">
      <div className="container mx-auto px-4">
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Left: video or image */}
          <div className="overflow-hidden rounded-2xl bg-black shadow-xl">
            {videoUrl ? (
              <video
                src={videoUrl}
                poster={poster ?? image ?? undefined}
                controls
                playsInline
                preload="metadata"
                className="h-full w-full object-cover"
              />
            ) : image ? (
              <img src={image} alt={heading ?? ""} loading="lazy" className="h-full w-full object-cover" />
            ) : (
              <div className="grid aspect-video w-full place-items-center text-4xl">🥩</div>
            )}
          </div>

          {/* Right: heading + intro + timeline */}
          <div>
            {heading && (
              <h2 className="font-display text-2xl font-bold tracking-tight text-off-white md:text-3xl">{heading}</h2>
            )}
            {intro && <p className="mt-3 max-w-md text-sm leading-relaxed text-off-white/70 md:text-base">{intro}</p>}

            {steps.length > 0 && (
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {steps.map((s) => (
                  <div key={s.id} className="flex flex-col gap-2">
                    {s.image && (
                      <div className="aspect-square overflow-hidden rounded-lg bg-black/40">
                        <img src={s.image} alt={s.label ?? ""} loading="lazy" className="h-full w-full object-cover" />
                      </div>
                    )}
                    {s.label && <p className="text-[11px] font-bold uppercase leading-tight tracking-wide text-gold">{s.label}</p>}
                    {s.body && <p className="text-[11px] leading-snug text-off-white/60">{s.body}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
