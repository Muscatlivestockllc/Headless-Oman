import type { ActionFunctionArgs } from "@shopify/remix-oxygen";

// Footer newsletter signup → subscribes the email to the "Footer-signup" list in Klaviyo.
// Uses Klaviyo's PUBLIC client API (company id only, no secret key), so it works on any domain
// regardless of the on-site form's targeting. company_id is the "MLS-Muscat Livestock" (Oman)
// account — the same SC5Mtp account whose Onsite JS is loaded in root.tsx.
const KLAVIYO_COMPANY_ID = "SC5Mtp";
const NEWSLETTER_LIST_ID = "VkBYRU"; // Klaviyo list: "Footer-signup"

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://a.klaviyo.com/client/subscriptions/?company_id=${KLAVIYO_COMPANY_ID}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", revision: "2024-10-15" },
        body: JSON.stringify({
          data: {
            type: "subscription",
            attributes: {
              custom_source: "Footer Newsletter",
              profile: {
                data: {
                  type: "profile",
                  attributes: { email },
                },
              },
            },
            relationships: {
              list: { data: { type: "list", id: NEWSLETTER_LIST_ID } },
            },
          },
        }),
      }
    );

    // The client subscriptions endpoint returns 202 Accepted (no body) on success.
    if (!res.ok) {
      const errText = await res.text();
      console.error("Klaviyo newsletter subscribe error:", res.status, errText);
      return Response.json(
        { error: "Could not subscribe right now. Please try again." },
        { status: 502 }
      );
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("Klaviyo newsletter subscribe failed:", err);
    return Response.json({ error: "Network error. Please try again." }, { status: 502 });
  }
}
