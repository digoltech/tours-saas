import Link from "next/link";
import { StructuredData } from "../../ui/StructuredData";
import { featurePages, guidePages } from "./content";
import "../../styles/seo-home.css";

const questions = [
  { question: "What is Digol TravelOS?", answer: "Digol TravelOS is bus booking and travel agency management software. It brings trip schedules, seat reservations, passenger details, fleet records, branch teams and financial records into one workspace." },
  { question: "How does the ticket booking workflow work?", answer: "Staff choose a route and trip, review available buses and timings, select seats, enter required passenger details and record payment. Tickets can be searched using PNR, passenger email or phone number." },
  { question: "Can an agency manage multiple branches?", answer: "Yes. An agency owner manages all branches and appoints branch admins. Branch admins manage employees in their own branch, while employees work on their branch’s operational records." },
  { question: "Does Digol TravelOS process online payments?", answer: "The current workflow records manual payments, refunds and settlements. Recording a payment does not charge a card or connect an online payment gateway." },
];

export function HomeSearchContent() {
  return <section className="seo-home" lang="en" aria-labelledby="seo-home-title">
    <StructuredData data={{ "@context": "https://schema.org", "@type": "FAQPage", inLanguage: "en", mainEntity: questions.map(({ question, answer }) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })) }} />
    <div className="seo-home-heading"><span>EXPLORE DIGOL TRAVELOS</span><h2 id="seo-home-title">Software for the booking desk and the whole agency</h2><p>Review the workflows your team uses every day, from seat reservations to branch access and fleet records.</p></div>
    <div className="seo-home-grid">{featurePages.map((page) => <article key={page.slug}><h3><Link href={`/features/${page.slug}`}>{page.title}</Link></h3><p>{page.description}</p><Link href={`/features/${page.slug}`}>Explore this feature →</Link></article>)}</div>
    <div className="seo-home-guides"><h2>Practical guides for your team</h2>{guidePages.map((page) => <Link href={`/guides/${page.slug}`} key={page.slug}>{page.title} →</Link>)}</div>
    <div className="seo-home-faq"><h2>Frequently asked questions</h2>{questions.map(({ question, answer }) => <div key={question}><h3>{question}</h3><p>{answer}</p></div>)}</div>
  </section>;
}
