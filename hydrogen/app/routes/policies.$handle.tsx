import type { LoaderFunctionArgs, MetaFunction } from "@shopify/remix-oxygen";
import { useLoaderData, Link } from "react-router";
import { detectLanguage } from "~/lib/locale";

// Shopify shop policies (Settings → Policies) live under /policies/<handle> on the
// standard online store — NOT under /pages/. They are exposed via the Storefront API
// `shop { privacyPolicy termsOfService refundPolicy shippingPolicy }` fields, so we
// render them here to match the live store's URLs (e.g. /policies/terms-of-service).
const POLICIES_QUERY = `#graphql
  query Policies($language: LanguageCode) @inContext(language: $language) {
    shop {
      privacyPolicy      { id title handle body }
      termsOfService     { id title handle body }
      refundPolicy       { id title handle body }
      shippingPolicy     { id title handle body }
      subscriptionPolicy { id title handle body }
    }
  }
` as const;

export async function loader({ params, context, request }: LoaderFunctionArgs) {
  const handle = params.handle;
  if (!handle) throw new Response("Missing handle", { status: 400 });

  const language = detectLanguage(request);
  const data = await context.storefront.query(POLICIES_QUERY, {
    variables: { language },
    cache: context.storefront.CacheLong(),
  });

  const shop = (data?.shop ?? {}) as Record<string, { title: string; handle: string; body: string } | null>;
  const policy = Object.values(shop).find((p) => p && p.handle === handle) ?? null;
  if (!policy) throw new Response("Policy not found", { status: 404 });

  return { policy };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  const title = data?.policy?.title ? `${data.policy.title} — MLS Oman` : "MLS Oman";
  return [
    { title },
    { name: "description", content: `${data?.policy?.title ?? "Policy"} — Muscat Livestock (MLS Oman).` },
  ];
};

export default function Policy() {
  const { policy } = useLoaderData<typeof loader>();
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-6 py-12 md:px-8 md:py-16">
        <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="transition-colors hover:text-foreground">Home</Link>
          <span>/</span>
          <span className="text-foreground">{policy.title}</span>
        </nav>
        <h1 className="font-display mb-10 text-3xl font-extrabold text-foreground md:text-4xl">
          {policy.title}
        </h1>
        <div
          className="prose prose-sm md:prose-base max-w-none
            prose-headings:font-display prose-headings:font-bold prose-headings:text-foreground
            prose-h2:mt-10 prose-h2:mb-3 prose-h2:text-xl
            prose-h3:mt-7 prose-h3:mb-2 prose-h3:text-lg
            prose-p:text-neutral-600 prose-p:leading-relaxed
            prose-strong:text-foreground prose-strong:font-semibold
            prose-a:text-crimson prose-a:no-underline hover:prose-a:underline
            prose-li:text-neutral-600 prose-li:leading-relaxed
            prose-ul:my-4 prose-ol:my-4
            prose-hr:border-border"
          dangerouslySetInnerHTML={{ __html: policy.body }}
        />
      </div>
    </div>
  );
}
