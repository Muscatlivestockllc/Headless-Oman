function extractYoutubeId(url: string): string | null {
  const shorts = url.match(/youtube\.com\/shorts\/([^?&#/]+)/);
  if (shorts) return shorts[1];
  const watch = url.match(/[?&]v=([^&#]+)/);
  if (watch) return watch[1];
  const youtu = url.match(/youtu\.be\/([^?&#/]+)/);
  if (youtu) return youtu[1];
  return null;
}

export function YoutubeReelsSection({ nodes }: { nodes: any[] }) {
  if (!nodes?.length) return null;

  const reels = nodes
    .map((node: any) => {
      const f: any[] = node.fields ?? [];
      const ytMetaRef = f.find((x: any) => x.key === "yt_url")?.reference;
      const ytUrl =
        ytMetaRef?.fields?.find((x: any) => x.key === "youtube_url")?.value ?? null;
      const name = f.find((x: any) => x.key === "name")?.value ?? "";
      if (!ytUrl) return null;
      const videoId = extractYoutubeId(ytUrl);
      if (!videoId) return null;
      return { name, embedUrl: `https://www.youtube.com/embed/${videoId}` };
    })
    .filter(Boolean) as { name: string; embedUrl: string }[];

  if (reels.length === 0) return null;

  return (
    <section className="py-10">
      <div
        className="overflow-x-auto px-4 pb-3 sm:px-6"
        style={{ scrollbarWidth: "none" }}
      >
        <div
          className="flex gap-3 mx-auto w-fit"
          style={{ scrollSnapType: "x mandatory" }}
        >
        {reels.map((reel, i) => (
          <div
            key={i}
            className="relative flex-shrink-0 overflow-hidden rounded-xl bg-black"
            style={{
              width: "min(45vw, 200px)",
              aspectRatio: "9/16",
              scrollSnapAlign: "start",
            }}
          >
            <iframe
              src={`${reel.embedUrl}?autoplay=0&rel=0`}
              title={reel.name}
              loading="lazy"
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ))}
        </div>
      </div>
    </section>
  );
}
