import { useRouteLoaderData } from "react-router";
import type { FreeGiftRule } from "@/stores/cartStore";

export interface CartDrawerConfig {
  freeShippingThreshold: number;
  deliveryItems: string[];
  freeGiftSubVariantId: string;
  freeGiftCarVariantId: string;
  freeGiftRules: FreeGiftRule[];
}

const DEFAULT_CONFIG: CartDrawerConfig = {
  freeShippingThreshold: 350,
  deliveryItems: [
    "Fresh delivery within **1 hour** across Dubai, **2 hours** across Abu Dhabi & same-day across Sharjah and Ajman.",
    "Order before **8:45 PM** for same-day delivery, 7 days a week.",
    "**Free Shipping** above AED 350",
  ],
  freeGiftSubVariantId: "gid://shopify/ProductVariant/48766692720956",
  freeGiftCarVariantId: "gid://shopify/ProductVariant/48650846765372",
  freeGiftRules: [],
};

export function useCartDrawerConfig(): CartDrawerConfig {
  const root = useRouteLoaderData("root") as any;
  const config = root?.cartDrawerConfig;
  if (!config) return DEFAULT_CONFIG;
  return {
    freeShippingThreshold: config.freeShippingThreshold || DEFAULT_CONFIG.freeShippingThreshold,
    deliveryItems: config.deliveryItems?.length > 0 ? config.deliveryItems : DEFAULT_CONFIG.deliveryItems,
    freeGiftSubVariantId: config.freeGiftSubVariantId ?? "",
    freeGiftCarVariantId: config.freeGiftCarVariantId ?? "",
    freeGiftRules: config.freeGiftRules ?? [],
  };
}
