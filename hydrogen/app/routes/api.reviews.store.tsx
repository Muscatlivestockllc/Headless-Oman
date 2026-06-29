import type { LoaderFunctionArgs } from "@shopify/remix-oxygen";
import { fetchJudgemeStoreReviews } from "~/lib/judgeme";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? "2");
  const { env } = context;

  const data = await fetchJudgemeStoreReviews(
    env.PUBLIC_STORE_DOMAIN,
    env.JUDGEME_API_TOKEN,
    page,
    20,
  );

  return Response.json({ reviews: data.reviews, totalCount: data.total_count ?? 0 });
}
