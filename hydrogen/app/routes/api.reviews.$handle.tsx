import type { LoaderFunctionArgs } from "@shopify/remix-oxygen";
import { fetchJudgemeReviews } from "~/lib/judgeme";

export async function loader({ params, request, context }: LoaderFunctionArgs) {
  const { handle } = params;
  if (!handle) return Response.json({ reviews: [], totalCount: 0 });

  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  const externalId = url.searchParams.get("eid") ?? undefined;

  const { env } = context;
  const data = await fetchJudgemeReviews(
    handle,
    env.PUBLIC_STORE_DOMAIN,
    env.JUDGEME_API_TOKEN,
    page,
    10,
    externalId,
  );

  const filtered = (data.reviews ?? []).filter((r: any) => r.rating >= 4);
  return Response.json({ reviews: filtered, totalCount: data.total_count ?? 0 });
}
