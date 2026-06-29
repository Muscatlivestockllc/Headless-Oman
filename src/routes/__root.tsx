import {
  Outlet,
  Link,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CartDrawer } from "@/components/layout/CartDrawer";
import { QuickBuyDrawer } from "@/components/product/QuickBuyDrawer";
import { useCartSync } from "@/hooks/useCartSync";
import { useLocaleStore, dirFor } from "@/stores/localeStore";

import appCss from "../styles.css?url";

interface RouterContext {
  queryClient: QueryClient;
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-extrabold text-crimson">404</h1>
        <h2 className="mt-4 font-display text-xl font-semibold">Cut not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          That page must have been butchered. Let's get you back to the shop.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-crimson px-4 py-2 text-sm font-medium text-crimson-foreground hover:bg-rich-red"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "MLS — Muscat Livestock Store · Premium Fresh Meat Delivery" },
      {
        name: "description",
        content:
          "Premium beef, lamb, mutton & specialty cuts. 100% Halal certified. Same-day delivery across the UAE & Oman.",
      },
      { name: "author", content: "Muscat Livestock Store" },
      { property: "og:title", content: "MLS — Muscat Livestock Store · Premium Fresh Meat Delivery" },
      { property: "og:description", content: "Headless Shopify e-commerce store for premium red meat delivery in UAE/Oman." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "MLS — Muscat Livestock Store · Premium Fresh Meat Delivery" },
      { name: "description", content: "Headless Shopify e-commerce store for premium red meat delivery in UAE/Oman." },
      { name: "twitter:description", content: "Headless Shopify e-commerce store for premium red meat delivery in UAE/Oman." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/ea03ef0a-7988-44cf-9ada-178e2fa42cd2/id-preview-f10ba721--3f38350e-5df9-4a34-9a3e-a50becba5c43.lovable.app-1777907590684.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/ea03ef0a-7988-44cf-9ada-178e2fa42cd2/id-preview-f10ba721--3f38350e-5df9-4a34-9a3e-a50becba5c43.lovable.app-1777907590684.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://cdn.shopify.com" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  const locale = useLocaleStore((s) => s.locale);
  const dir = dirFor(locale);
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
      document.documentElement.dir = dir;
    }
  }, [locale, dir]);
  return (
    <html lang={locale} dir={dir}>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <CartSyncWrapper />
      <div className="flex min-h-screen flex-col">
        <AnnouncementBar />
        <Header />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
      </div>
      <CartDrawer />
      <QuickBuyDrawer />
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}

function CartSyncWrapper() {
  useCartSync();
  return null;
}
