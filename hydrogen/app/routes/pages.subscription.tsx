import { redirect } from "@shopify/remix-oxygen";
import type { LoaderFunctionArgs } from "@shopify/remix-oxygen";

// /pages/subscription → /pages/subscriptions (canonical URL)
export async function loader(_: LoaderFunctionArgs) {
  return redirect("/pages/subscriptions", { status: 301 });
}
