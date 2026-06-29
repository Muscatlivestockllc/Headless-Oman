import type { LoaderFunctionArgs } from "@shopify/remix-oxygen";

export interface DiscountInfo {
  title: string;
  type: "percentage" | "fixed" | "unknown";
  value: number;
  isOrderLevel: boolean; // true = applies to all products (order discount), false = product-specific
}

export async function loader({ context }: LoaderFunctionArgs) {
  const data = await context.adminFetch(`{
    automaticDiscountNodes(first: 50) {
      nodes {
        automaticDiscount {
          ... on DiscountAutomaticBasic {
            title
            status
            customerGets {
              value {
                ... on PercentageValue { percentage }
                ... on MoneyV2 { amount currencyCode }
              }
              items { __typename }
            }
          }
          ... on DiscountAutomaticBxgy {
            title
            status
          }
          ... on DiscountAutomaticApp {
            title
            status
          }
          ... on DiscountAutomaticFreeShipping {
            title
            status
          }
        }
      }
    }
  }`);

  const discounts: DiscountInfo[] = (data?.automaticDiscountNodes?.nodes ?? [])
    .map((n: any) => {
      const d = n?.automaticDiscount;
      if (d?.status !== "ACTIVE" || !d?.title) return null;
      const val = d?.customerGets?.value;
      const itemsType = d?.customerGets?.items?.__typename ?? "";
      // "AllDiscountItems" = applies to entire order; anything else = product/collection specific
      const isOrderLevel = itemsType === "AllDiscountItems" || itemsType === "";
      if (val?.percentage != null) {
        return { title: d.title as string, type: "percentage" as const, value: val.percentage * 100, isOrderLevel };
      }
      if (val?.amount != null) {
        return { title: d.title as string, type: "fixed" as const, value: parseFloat(val.amount), isOrderLevel };
      }
      return { title: d.title as string, type: "unknown" as const, value: 0, isOrderLevel };
    })
    .filter(Boolean) as DiscountInfo[];

  return Response.json({ discounts });
}
