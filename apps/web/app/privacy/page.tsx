import { Translate } from "../../src/i18n/Translate";
import { notFound } from "next/navigation";
import Link from "next/link";
import "../../src/styles/privacy.css";
import { LanguageSelector } from "../../src/i18n/LanguageSelector";

export const dynamic = "force-dynamic";

export default function PrivacyNoticePage() {
  const legalName = process.env.PRIVACY_LEGAL_NAME;
  const address = process.env.PRIVACY_POSTAL_ADDRESS;
  const email = process.env.PRIVACY_EMAIL;
  const retention = process.env.PRIVACY_RETENTION_SUMMARY;
  if (process.env.PRIVACY_POLICY_APPROVED !== "true" || !legalName || !address || !email || !retention) notFound();

  return <main className="privacy-notice-page">
    <header className="privacy-notice-toolbar"><Link href="/">Digol TravelOS</Link><LanguageSelector /></header>
    <h1 className="privacy-notice-title"><Translate text={"Privacy notice"} /></h1>
    <p><Translate text={"Last updated: 2 October 2026"} /></p>
    <h2 className="privacy-notice-heading"><Translate text={"Who is responsible"} /></h2>
    <p>{legalName}, {address}<Translate text={", is responsible for this platform. Contact us about privacy at"} />{" "}<a href={`mailto:${email}`}>{email}</a>.</p>
    <h2 className="privacy-notice-heading"><Translate text={"Data we use"} /></h2>
    <p><Translate text={"We process agency staff account details, access permissions, security and audit records, and booking information including passenger names, contact details, age, travel details and any identity document details entered by the agency. Payment and refund records describe offline transactions; card numbers are not collected by this platform."} /></p>
    <h2 className="privacy-notice-heading"><Translate text={"Why we use it"} /></h2>
    <p><Translate text={"We use this data to run the platform, manage trips and bookings, contact passengers about their journeys, keep financial records, prevent misuse and respond to privacy requests. Agency staff access is restricted according to their role and agency."} /></p>
    <p><Translate text={"Booking details are supplied by the travel agency handling the journey. Please provide accurate information and tell the agency or our privacy contact if it needs correction. Optional messaging channels are used only when configured for the relevant service."} /></p>
    <h2 className="privacy-notice-heading"><Translate text={"Service providers and location"} /></h2>
    <p><Translate text={"Our hosting and database providers include Hostinger and Supabase. We use Resend for transactional email. SMS and WhatsApp providers receive contact details only when those channels are configured and used. Authorized agency staff can access data for their agency. Contact us for current provider and transfer details."} /></p>
    <h2 className="privacy-notice-heading"><Translate text={"Retention and security"} /></h2>
    <p>{retention}</p>
    <p><Translate text={"We limit access by role, protect connections, keep audit records and review identity before handling an access or deletion request. Some booking or finance information may need to be retained where an operational or legal obligation applies."} /></p>
    <h2 className="privacy-notice-heading"><Translate text={"Your choices and requests"} /></h2>
    <p><Translate text={"You may ask for access, correction, or deletion of personal data, withdraw consent where processing relies on consent, nominate another person to exercise applicable rights, or raise a grievance by contacting"} />{" "}<a href={`mailto:${email}`}>{email}</a><Translate text={". Passengers can also"} />{" "}<Link href="/privacy/request"><Translate text={"submit an access or deletion request online"} /></Link><Translate text={". We verify identity before disclosing or changing records. We will explain any retention or refusal decision. You may approach the applicable Indian data protection authority after using our grievance channel, as provided by law."} /></p>
    <p className="privacy-notice-return"><Link href="/"><Translate text={"Return home"} /></Link></p>
  </main>;
}
