import { redirect } from "@shopify/remix-oxygen";
import type { LoaderFunctionArgs } from "@shopify/remix-oxygen";

// Fallback for any /ar/* URL that has no specific route (e.g. old bookmarks).
// Strips /ar prefix from the ORIGINAL encoded pathname so the Location header
// stays valid ASCII/percent-encoded — never contains raw Arabic characters.
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  // url.pathname is already percent-encoded by the browser; just strip /ar prefix.
  const stripped = url.pathname.replace(/^\/ar/, "") || "/";

  return redirect(`${stripped}${url.search}`, {
    status: 302,
    headers: {
      "Set-Cookie": "lang=ar; Path=/; Max-Age=31536000; SameSite=Lax",
    },
  });
}
