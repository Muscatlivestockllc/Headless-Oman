// Oxygen entry point for the Hydrogen app.
import {
  createCartHandler,
  createCustomerAccountClient,
  createStorefrontClient,
  storefrontRedirect,
  cartGetIdDefault,
  cartSetIdDefault,
} from "@shopify/hydrogen";
import {
  createRequestHandler,
  getStorefrontHeaders,
} from "@shopify/remix-oxygen";
import { AppSession } from "~/lib/session";

export default {
  async fetch(
    request: Request,
    env: Env,
    executionContext: ExecutionContext
  ): Promise<Response> {
    try {
      const waitUntil = executionContext.waitUntil.bind(executionContext);
      const [cache, session] = await Promise.all([
        caches.open("hydrogen"),
        AppSession.init(request, [env.SESSION_SECRET]),
      ]);

      // Detect locale from URL prefix /ar OR cookie.
      const reqPath = new URL(request.url).pathname;
      const hasArPrefix = reqPath === "/ar" || reqPath.startsWith("/ar/");
      const langCookie = request.headers.get("Cookie")?.match(/(?:^|;\s*)lang=([a-z]{2})/)?.[1];
      const language = (hasArPrefix || langCookie === "ar") ? "AR" : "EN";

      const { storefront: baseStorefront } = createStorefrontClient({
        cache,
        waitUntil,
        i18n: { language: language as "EN" | "AR", country: "AE" },
        publicStorefrontToken: env.PUBLIC_STOREFRONT_API_TOKEN,
        privateStorefrontToken: env.PRIVATE_STOREFRONT_API_TOKEN,
        storeDomain: env.PUBLIC_STORE_DOMAIN,
        storefrontId: env.PUBLIC_STOREFRONT_ID,
        storefrontHeaders: getStorefrontHeaders(request),
        storefrontApiVersion: env.PUBLIC_STOREFRONT_API_VERSION || "2025-07",
      });

      // Wrap storefront so every query/mutate automatically includes Accept-Language: ar
      // when the user has selected Arabic. @inContext alone is not enough because the
      // Hydrogen channel doesn't have Arabic in its channel-level language settings,
      // but the Accept-Language header bypasses that and returns T Lab translations.
      const storefront = language === "AR"
        ? new Proxy(baseStorefront, {
            get(target, prop) {
              if (prop === "query" || prop === "mutate") {
                return (doc: string, opts: any = {}) =>
                  (target as any)[prop](doc, {
                    ...opts,
                    headers: { "Accept-Language": "ar", ...(opts.headers ?? {}) },
                  });
              }
              return (target as any)[prop];
            },
          })
        : baseStorefront;

      const customerAccount = createCustomerAccountClient({
        waitUntil,
        request,
        session,
        customerAccountId: (env as any).PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID ?? env.PUBLIC_CUSTOMER_ACCOUNT_CLIENT_ID,
        customerAccountUrl: env.PUBLIC_CUSTOMER_ACCOUNT_API_URL,
      } as any);

      const cart = createCartHandler({
        storefront: baseStorefront,
        customerAccount,
        getCartId: cartGetIdDefault(request.headers),
        setCartId: cartSetIdDefault(),
      });

      const adminFetch = async (query: string, variables: Record<string, any> = {}): Promise<any> => {
        if (!env.SHOPIFY_ADMIN_API_TOKEN) return {};
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        try {
          const res = await fetch(
            `https://${env.PUBLIC_STORE_DOMAIN}/admin/api/2025-07/graphql.json`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Shopify-Access-Token": env.SHOPIFY_ADMIN_API_TOKEN,
              },
              body: JSON.stringify({ query, variables }),
              signal: controller.signal,
            }
          );
          const json = await res.json() as any;
          if (json.errors?.length) {
            console.error("[adminFetch] GraphQL errors:", JSON.stringify(json.errors.slice(0, 3)));
          }
          return json.data ?? {};
        } catch {
          return {};
        } finally {
          clearTimeout(timer);
        }
      };

      const handleRequest = createRequestHandler({
        // @ts-expect-error virtual module resolved at build time
        build: await import("virtual:react-router/server-build"),
        mode: process.env.NODE_ENV,
        getLoadContext: () => ({
          session,
          storefront,
          customerAccount,
          cart,
          env,
          waitUntil,
          adminFetch,
        }),
      });

      const response = await handleRequest(request);

      if (response.status === 404) {
        return storefrontRedirect({request, response, storefront});
      }

      if (session.isPending) {
        response.headers.set("Set-Cookie", await session.commit());
      }
      return response;
    } catch (error) {
      console.error(error);
      return new Response("An unexpected error occurred", { status: 500 });
    }
  },
};
