import type { LoaderFunctionArgs } from "@shopify/remix-oxygen";

const SELLING_PLANS_QUERY = `#graphql
  query SellingPlans($handle: String!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      sellingPlanGroups(first: 10) {
        nodes {
          name
          sellingPlans(first: 10) {
            nodes { id name recurringDeliveries }
          }
        }
      }
      variants(first: 50) {
        nodes {
          id
          price { amount currencyCode }
          sellingPlanAllocations(first: 10) {
            nodes {
              sellingPlan { id }
              priceAdjustments {
                price { amount currencyCode }
                compareAtPrice { amount currencyCode }
              }
            }
          }
        }
      }
    }
  }
` as const;

export async function loader({ params, context }: LoaderFunctionArgs) {
  const { handle } = params;
  if (!handle) return Response.json({ groups: [], discountMap: {}, variantAllocations: {} });

  const data = await context.storefront.query(SELLING_PLANS_QUERY, {
    variables: { handle, country: "AE" as const, language: "EN" as const },
  });

  const groups = data?.product?.sellingPlanGroups?.nodes ?? [];
  const variants = data?.product?.variants?.nodes ?? [];

  const discountMap: Record<string, number> = {};
  const variantAllocations: Record<string, Record<string, string>> = {};

  for (const v of variants) {
    const variantPrice = parseFloat((v as any).price?.amount ?? "0");
    variantAllocations[(v as any).id] = {};
    for (const alloc of (v as any).sellingPlanAllocations?.nodes ?? []) {
      const planId = alloc.sellingPlan?.id;
      const adj = alloc.priceAdjustments?.[0];
      if (!planId || !adj) continue;
      const subPrice = parseFloat(adj.price?.amount ?? "0");
      if (adj.price?.amount) variantAllocations[(v as any).id][planId] = adj.price.amount;
      if (discountMap[planId] === undefined) {
        const baseline = parseFloat(adj.compareAtPrice?.amount ?? "0") || variantPrice;
        if (baseline > 0 && subPrice < baseline) {
          discountMap[planId] = Math.round(((baseline - subPrice) / baseline) * 100);
        }
      }
    }
  }

  // Default 10% for plans with no allocation data
  for (const group of groups) {
    for (const plan of (group as any).sellingPlans?.nodes ?? []) {
      if (plan.id && discountMap[plan.id] === undefined) discountMap[plan.id] = 10;
    }
  }

  return Response.json({ groups, discountMap, variantAllocations });
}
