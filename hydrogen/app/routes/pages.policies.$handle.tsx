import { redirect, type LoaderFunctionArgs } from "@shopify/remix-oxygen";

// The footer "Privacy Policy" link points at the malformed path /pages/policies/privacy-policy
// (a data-entry error in the customer-care menu). Shopify shop policies live at /policies/:handle,
// so this 404s otherwise. Redirect /pages/policies/<x> → /policies/<x>, preserving the /ar prefix.
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const fixed = url.pathname.replace("/pages/policies/", "/policies/");
  return redirect(fixed + url.search, { status: 301 });
}
