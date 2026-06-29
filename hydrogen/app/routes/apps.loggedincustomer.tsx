import type { LoaderFunctionArgs } from "@shopify/remix-oxygen";

export async function loader({ context }: LoaderFunctionArgs) {
  try {
    const isLoggedIn = await context.customerAccount.isLoggedIn();

    if (!isLoggedIn) {
      return new Response(JSON.stringify({ logged_in: false }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data } = await context.customerAccount.query(`
      query {
        customer {
          id
          emailAddress { emailAddress }
          firstName
          lastName
        }
      }
    `);

    const customer = data?.customer;

    return new Response(
      JSON.stringify({
        logged_in: true,
        id: customer?.id?.replace("gid://shopify/Customer/", "") ?? "",
        email: customer?.emailAddress?.emailAddress ?? "",
        name: `${customer?.firstName ?? ""} ${customer?.lastName ?? ""}`.trim(),
        tags: "",
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch {
    return new Response(JSON.stringify({ logged_in: false }), {
      headers: { "Content-Type": "application/json" },
    });
  }
}
