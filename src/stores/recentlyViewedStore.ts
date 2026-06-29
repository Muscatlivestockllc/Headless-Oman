import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface RecentlyViewedStore {
  handles: string[];
  add: (handle: string) => void;
  clear: () => void;
}

export const useRecentlyViewed = create<RecentlyViewedStore>()(
  persist(
    (set, get) => ({
      handles: [],
      add: (handle) => {
        const next = [handle, ...get().handles.filter((h) => h !== handle)].slice(0, 12);
        set({ handles: next });
      },
      clear: () => set({ handles: [] }),
    }),
    { name: "mls-recently-viewed", storage: createJSONStorage(() => localStorage) }
  )
);
