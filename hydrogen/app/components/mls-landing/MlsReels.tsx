import { ReelsCarousel } from "~/components/home/ReelsCarousel";
import type { ReelProduct } from "@/lib/shopify";
import { fieldMap, str, imageUrl, listNodes, type RawNode } from "./fields";

// Reels section — reads mls_reel_item children (each with an uploaded video, poster, title, and
// optional linked product) and feeds the brand ReelsCarousel (hover-play + full-screen player).
function parseReels(node: RawNode): ReelProduct[] {
  return listNodes(fieldMap(node), "reels")
    .map((n): ReelProduct | null => {
      const f = fieldMap(n);
      const video = f["video"]?.reference; // GenericFile or Video
      const product = f["product"]?.reference;

      let videoUrl: string | null = null;
      // Uploaded video file: Video has `sources`, GenericFile has `url`.
      if (video?.sources?.length) {
        const mp4 = video.sources.find((s: any) => s.mimeType === "video/mp4") ?? video.sources[0];
        videoUrl = mp4?.url ?? null;
      } else if (video?.url) {
        videoUrl = video.url;
      }

      const poster =
        imageUrl(f, "poster") ??
        video?.previewImage?.url ??
        product?.featuredImage?.url ??
        null;

      if (!videoUrl && !poster) return null;

      return {
        id: n.id ?? n.handle ?? "",
        title: str(f, "title") ?? product?.title ?? "",
        handle: product?.handle ?? "",
        price: product?.priceRange?.minVariantPrice ?? { amount: "0", currencyCode: "OMR" },
        poster,
        videoUrl,
        embedUrl: null,
        productImage: product?.featuredImage?.url ?? null,
      };
    })
    .filter((r): r is ReelProduct => r !== null);
}

export function MlsReels({ node }: { node: RawNode }) {
  const fm = fieldMap(node);
  const reels = parseReels(node);
  if (reels.length === 0) return null;
  return (
    <ReelsCarousel
      reels={reels}
      label={str(fm, "eyebrow") ?? "Watch & Shop"}
      heading={str(fm, "heading") ?? "MLS Reels"}
    />
  );
}
