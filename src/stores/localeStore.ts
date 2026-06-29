import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Locale = "en" | "ar";
export type Dir = "ltr" | "rtl";

interface LocaleState {
  locale: Locale;
  setLocale: (l: Locale) => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: "en",
      setLocale: (locale) => set({ locale }),
    }),
    { name: "mls_locale" }
  )
);

export const dirFor = (l: Locale): Dir => (l === "ar" ? "rtl" : "ltr");
