import type { ActionFunctionArgs } from "@shopify/remix-oxygen";

const JUDGEME_BASE = "https://judge.me/api/v1";

export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const { env } = context;
  const apiToken = env.JUDGEME_API_TOKEN;
  const shopDomain = env.PUBLIC_STORE_DOMAIN;

  if (!apiToken) {
    return Response.json({ error: "Reviews service unavailable" }, { status: 503 });
  }

  let body: {
    productExternalId?: string;
    name?: string;
    email?: string;
    rating?: number;
    title?: string;
    reviewBody?: string;
  };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { productExternalId, name, email, rating, title, reviewBody } = body;

  if (!productExternalId || !name || !email || !rating || !reviewBody) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const res = await fetch(`${JUDGEME_BASE}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        api_token: apiToken,
        shop_domain: shopDomain,
        platform: "shopify",
        id: productExternalId,
        id_type: "product_id",
        reviewer: { name, email },
        rating,
        title: title || "",
        body: reviewBody,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("Judge.me review submission failed:", res.status, errText);
      return Response.json(
        { error: "Could not submit review. Please try again." },
        { status: 502 },
      );
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("Judge.me review submission error:", err);
    return Response.json({ error: "Could not submit review. Please try again." }, { status: 502 });
  }
}

// GET requests to this route are not used — only action (POST) matters.
export async function loader() {
  return Response.json({ error: "Not found" }, { status: 404 });
}
