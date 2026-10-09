import { guidePages } from "../../src/features/marketing/content";
import { MarketingContentIndex } from "../../src/features/marketing/MarketingContentPage";
import { publicMetadata } from "../../src/lib/seo";

export const metadata = publicMetadata({ title: "Travel Operations Guides", description: "Practical Digol TravelOS guides for the bus booking workflow, agency roles and branch team permissions.", path: "/guides" });
export default function GuidesPage() { return <MarketingContentIndex kind="guides" pages={guidePages} />; }
