import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { featurePages } from "../../../src/features/marketing/content";
import { MarketingContentPage } from "../../../src/features/marketing/MarketingContentPage";
import { publicMetadata } from "../../../src/lib/seo";

type Props = { params: Promise<{ slug: string }> };
export function generateStaticParams() { return featurePages.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = featurePages.find((entry) => entry.slug === slug);
  if (!page) notFound();
  return publicMetadata({ title: page.title, description: page.description, path: `/features/${page.slug}` });
}
export default async function FeaturePage({ params }: Props) {
  const { slug } = await params;
  const page = featurePages.find((entry) => entry.slug === slug);
  if (!page) notFound();
  return <MarketingContentPage page={page} kind="features" />;
}
