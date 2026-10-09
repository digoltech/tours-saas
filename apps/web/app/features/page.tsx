import { featurePages } from "../../src/features/marketing/content";
import { MarketingContentIndex } from "../../src/features/marketing/MarketingContentPage";
import { publicMetadata } from "../../src/lib/seo";

export const metadata = publicMetadata({ title: "Travel Agency Software Features", description: "Explore Digol TravelOS bus booking, travel agency management and fleet management features for agency and branch teams.", path: "/features" });
export default function FeaturesPage() { return <MarketingContentIndex kind="features" pages={featurePages} />; }
