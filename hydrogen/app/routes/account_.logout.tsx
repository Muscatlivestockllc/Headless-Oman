import type { ActionFunctionArgs, LoaderFunctionArgs } from "@shopify/remix-oxygen";
import { redirect } from "@shopify/remix-oxygen";

export async function action({ context }: ActionFunctionArgs) {
  return context.customerAccount.logout();
}

export async function loader() {
  return redirect("/");
}
