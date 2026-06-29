import { create } from "zustand";
import type { ShopifyProduct } from "@/lib/shopify";

interface QuickBuyStore {
  product: ShopifyProduct | null;
  isOpen: boolean;
  open: (product: ShopifyProduct) => void;
  close: () => void;
}

export const useQuickBuyStore = create<QuickBuyStore>((set) => ({
  product: null,
  isOpen: false,
  open: (product) => set({ product, isOpen: true }),
  close: () => set({ isOpen: false }),
}));
