import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PublicLayout } from "../../ui/PublicLayout";
import { StructuredData } from "../../ui/StructuredData";
import { absoluteUrl } from "../../lib/seo";
import type { MarketingPage } from "./content";
import "../../styles/seo-content.css";

export function MarketingContentPage({ page, kind }: { page: MarketingPage; kind: "features" | "guides" }) {
  const sectionTitle = kind === "guides" ? "Guides" : "Features";
  const path = `/${kind}/${page.slug}`;
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: sectionTitle, item: absoluteUrl(`/${kind}`) },
        { "@type": "ListItem", position: 3, name: page.title, item: absoluteUrl(path) },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "@id": `${absoluteUrl(path)}#faq`,
      inLanguage: "en",
      mainEntity: page.faqs.map(({ question, answer }) => ({
        "@type": "Question", name: question,
        acceptedAnswer: { "@type": "Answer", text: answer },
      })),
    },
  ];
  return <PublicLayout contentLanguage="en" eyebrow={kind === "guides" ? "DIGOL TRAVELOS GUIDES" : "DIGOL TRAVELOS FEATURES"} title={page.heading} intro={page.definition}>
    <StructuredData data={structuredData} />
    <article className="seo-article">
      <nav className="seo-breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><Link href={`/${kind}`}>{sectionTitle}</Link><span aria-hidden="true">/</span><span aria-current="page">{page.title}</span></nav>
      {kind === "guides" && <p className="seo-byline">Written by the Digol TravelOS product team · Reviewed October 9, 2026</p>}
      <div className="seo-intent"><strong>Who this is for</strong><p>{page.audience}</p></div>
      <nav className="seo-contents" aria-label="On this page"><strong>On this page</strong>{page.sections.map((section, index) => <a href={`#section-${index + 1}`} key={section.heading}>{section.heading}</a>)}<a href="#workflow-table">Quick reference</a><a href="#faq">Frequently asked questions</a></nav>
      {page.sections.map((section, index) => <section id={`section-${index + 1}`} className="seo-section" key={section.heading}><h2>{section.heading}</h2>{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section>)}
      <section id="workflow-table" className="seo-section"><h2>{page.table.caption}</h2><div className="seo-table-scroll" role="region" aria-label={page.table.caption} tabIndex={0}><table><caption className="seo-visually-hidden">{page.table.caption}</caption><thead><tr>{page.table.headings.map((heading) => <th key={heading} scope="col">{heading}</th>)}</tr></thead><tbody>{page.table.rows.map((row) => <tr key={row[0]}>{row.map((cell, index) => index === 0 ? <th key={index} scope="row">{cell}</th> : <td key={index}>{cell}</td>)}</tr>)}</tbody></table></div></section>
      <section className="seo-section"><h2>Before your team starts</h2><ul className="seo-checklist">{page.checklist.map((item) => <li key={item}>{item}</li>)}</ul></section>
      <section className="seo-limits"><h2>Scope and practical limits</h2><p>{page.limits}</p></section>
      <section id="faq" className="seo-section"><h2>Frequently asked questions</h2><div className="seo-faq">{page.faqs.map((faq) => <div key={faq.question}><h3>{faq.question}</h3><p>{faq.answer}</p></div>)}</div></section>
      <section className="seo-section"><h2>Explore related features and guides</h2><div className="seo-related">{page.related.map((link) => <Link href={link.href} key={link.href}>{link.label}<ArrowRight size={17} aria-hidden="true" /></Link>)}</div></section>
      <section className="seo-cta"><div><h2>Bring your daily operations together</h2><p>Create an agency account and prepare your main branch, team and booking workflow.</p></div><Link href="/auth/register">Get started <ArrowRight size={18} aria-hidden="true" /></Link></section>
    </article>
  </PublicLayout>;
}

export function MarketingContentIndex({ kind, pages }: { kind: "features" | "guides"; pages: MarketingPage[] }) {
  const guides = kind === "guides";
  const title = guides ? "Practical guides for travel operations" : "Software for bookings, branches and fleet";
  const intro = guides ? "Product-authored guides to help your team check booking details and assign the right branch responsibilities." : "Explore how Digol TravelOS connects the booking desk, agency team and fleet records in one operational workspace.";
  return <PublicLayout contentLanguage="en" eyebrow={guides ? "DIGOL TRAVELOS GUIDES" : "DIGOL TRAVELOS FEATURES"} title={title} intro={intro}>
    <StructuredData data={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") }, { "@type": "ListItem", position: 2, name: guides ? "Guides" : "Features", item: absoluteUrl(`/${kind}`) }] }} />
    <div className="seo-index">
      <div className="seo-card-grid">{pages.map((page) => <article className="seo-card" key={page.slug}><span>{guides ? "OPERATIONS GUIDE" : "PRODUCT FEATURE"}</span><h2><Link href={`/${kind}/${page.slug}`}>{page.title}</Link></h2><p>{page.description}</p><Link className="seo-card-link" href={`/${kind}/${page.slug}`}>{guides ? "Read the guide" : "Explore the feature"}<ArrowRight size={17} aria-hidden="true" /></Link></article>)}</div>
      <div className="seo-index-crosslink"><h2>{guides ? "Put the guides into practice" : "Help your team get started"}</h2><p>{guides ? "Review the product workspaces these guides describe." : "Use the practical guides to review your booking process and branch responsibilities."}</p><Link href={guides ? "/features" : "/guides"}>{guides ? "Explore all features" : "Browse the guides"}<ArrowRight size={17} aria-hidden="true" /></Link></div>
    </div>
  </PublicLayout>;
}
