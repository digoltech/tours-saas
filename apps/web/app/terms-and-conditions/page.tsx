import Link from "next/link";
import { PublicLayout } from "../../src/ui/PublicLayout";

export default function TermsPage() {
  return <PublicLayout eyebrow="USING THE PLATFORM" title="Terms & Conditions" intro="The practical terms for using Digol TravelOS to manage travel operations.">
    <div className="legal-copy"><p className="legal-date">Last updated 3 October 2026</p>
      <h2>About the service</h2><p>Digol TravelOS is provided by Digol Tours to help travel businesses manage agencies, branches, people, vehicles, routes, trips, bookings, and financial records. These terms apply when you create an account or use the platform.</p>
      <h2>Accounts and access</h2><p>Provide accurate account and business information, keep your sign-in details secure, and use access only for your authorized role. Agency administrators are responsible for the people they invite and the permissions they assign.</p>
      <h2>Your operational data</h2><p>Your agency is responsible for the accuracy of schedules, fares, passenger details, bookings, payments, refund decisions, and other data entered by its team. Use the platform only for lawful travel operations and respect the privacy of passengers and staff.</p>
      <h2>Plans and payments</h2><p>Any subscription plan, price, trial, and payment arrangement shown in the account or agreed with Digol Tours applies to that agency. The platform may record offline payments and settlements; it does not itself process card payments unless a separate payment integration is expressly enabled.</p>
      <h2>Acceptable use</h2><p>Do not misuse the service, interfere with its security or availability, access another agency’s data, upload harmful material, or use the platform for fraudulent bookings or transactions.</p>
      <h2>Service changes and support</h2><p>We may update features or these terms as the service develops. We will provide appropriate notice for material changes. If you need help or want to discuss your account, <Link href="/contact">contact us</Link>.</p>
      <h2>Privacy</h2><p>See the <Link href="/privacy-policy">Privacy Policy</Link> for information about personal data and your choices.</p>
    </div>
  </PublicLayout>;
}
