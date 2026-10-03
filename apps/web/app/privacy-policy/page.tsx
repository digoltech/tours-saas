import Link from "next/link";
import { PublicLayout } from "../../src/ui/PublicLayout";

export default function PrivacyPolicyPage() {
  return <PublicLayout eyebrow="YOUR DATA" title="Privacy Policy" intro="How Digol TravelOS uses and protects information provided by travel businesses, their teams, and passengers.">
    <div className="legal-copy"><p className="legal-date">Last updated 3 October 2026</p>
      <h2>Who operates the service</h2><p>Digol Tours provides Digol TravelOS. You can reach us through our <Link href="/contact">contact page</Link>. Travel agencies that use the service are responsible for the passenger and trip details their staff enter.</p>
      <h2>Information we collect</h2><p>We use account names, email addresses, mobile numbers, agency and branch details, sign-in and security records, and preferences needed to provide the service. Agencies may enter passenger contact and travel details, bookings, payments, refunds, and other operational records. Contact form messages and newsletter email addresses are collected when you submit them.</p>
      <h2>How we use information</h2><p>We use information to operate accounts, manage travel operations, deliver service emails, respond to requests, protect accounts, and maintain records. Newsletter updates are sent only after you confirm your subscription. You can unsubscribe using the link in a newsletter email.</p>
      <h2>Sharing and storage</h2><p>Authorized agency members can access information according to their assigned permissions. We use service providers for hosting, database storage, and transactional email. We do not sell personal information. We retain records for as long as needed to operate the service, handle requests, and meet applicable obligations.</p>
      <h2>Your choices</h2><p>You can update account details in your profile and unsubscribe from newsletters at any time. For access or deletion requests, use our <Link href="/privacy/request">data request form</Link>. We may need to verify your identity before acting and may need to retain some records for legitimate operational or legal reasons.</p>
      <h2>Questions</h2><p>For privacy questions or corrections, <Link href="/contact">contact Digol Tours</Link>. We will review your request and respond through the email address you provide.</p>
    </div>
  </PublicLayout>;
}
