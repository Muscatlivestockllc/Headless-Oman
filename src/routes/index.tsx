import { createFileRoute } from "@tanstack/react-router";
import { HeroBanner } from "@/components/home/HeroBanner";
import { TrustBadges } from "@/components/home/TrustBadges";
import { FeaturedCollections } from "@/components/home/FeaturedCollections";
import { PriceRangeShop } from "@/components/home/PriceRangeShop";
import { PromoSideBySide } from "@/components/home/PromoSideBySide";
import { CategorySection } from "@/components/home/CategorySection";
import { ShopByCategory } from "@/components/home/ShopByCategory";
import { ShopByCuts } from "@/components/home/ShopByCuts";
import { ShopByOrigin } from "@/components/home/ShopByOrigin";
import { ValueBoxesBanner } from "@/components/home/ValueBoxesBanner";
import { RecentlyViewed } from "@/components/home/RecentlyViewed";
import { ReelsCarousel } from "@/components/home/ReelsCarousel";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <>
      <HeroBanner />
      <TrustBadges />
      <FeaturedCollections />
      <PriceRangeShop />
      <PromoSideBySide />
      <CategorySection
        handle="all-beef"
        title="Premium Beef"
        subtitle="The butcher's selection"
      />
      <CategorySection
        handle="all-lamb"
        title="Lamb & Mutton"
        subtitle="Tender, fresh, halal"
      />
      <CategorySection
        handle="australian-wagyu-beef-mb-4-5"
        title="Australian Wagyu"
        subtitle="Marbling MB 4/5"
      />
      <ReelsCarousel />
      <ShopByCategory />
      <ShopByCuts />
      <ShopByOrigin />
      <ValueBoxesBanner />
      <RecentlyViewed />
    </>
  );
}
