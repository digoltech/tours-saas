import { publicMetadata, productGraph } from "../src/lib/seo";
import { StructuredData } from "../src/ui/StructuredData";
import { HomeSearchContent } from "../src/features/marketing/HomeSearchContent";
export const metadata = { ...publicMetadata({ title: "Bus Booking & Agency Management Software", description: "Manage bus trips, seat reservations, passengers, fleet, branch teams and financial records with Digol TravelOS, built by Digol Tours for travel agencies.", path: "/" }), title: "Bus Booking & Agency Management Software | Digol TravelOS" };
import { cn } from "../src/lib/utils";
import "../src/styles/marketing.css";
import Link from "next/link";
import { Brand } from "../src/ui/Brand";
import { SiteFooter } from "../src/ui/SiteFooter";
import { getLocale } from "../src/i18n/server";
import { translate } from "../src/i18n/dictionaries";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Armchair,
  BusFront,
  ChartNoAxesCombined,
  Check,
  CircleDollarSign,
  Clock3,
  MapPin,
  MoveRight,
  Route,
  ShieldCheck,
  TicketCheck,
} from "lucide-react";

const capabilities = [
  { number: "01", icon: TicketCheck, title: "Bookings that stay in sync", copy: "Hold seats, confirm passengers, and keep every booking tied to the trip it belongs to.", tone: "red" },
  { number: "02", icon: CircleDollarSign, title: "Finance with a clear trail", copy: "Record payments, apply your policies, handle refunds, and follow commission and settlement balances.", tone: "cream" },
  { number: "03", icon: ShieldCheck, title: "The right view for every team", copy: "Give agency owners, branch admins and employees their own operational view, with data scoped to their work.", tone: "dark" },
];
const steps = [
  ["01", "Set up your network", "Bring branches, people, fleet, and routes into one place."],
  ["02", "Plan the next departure", "Schedule trips, set fares, and make seats ready to sell."],
  ["03", "Keep the whole journey moving", "Manage bookings, payments, cancellations, and reports together."],
];

export default async function HomePage() {
  const locale = await getLocale();
  const t = (text: string) => translate(locale, text);
  return (
    <main className={cn("landing")}><StructuredData data={productGraph} />
      <header className={cn("landing-header")}>
        <div className={cn("landing-nav")}>
          <Brand className="landing-brand" />
          <nav className={cn("landing-nav-links")} aria-label="Main navigation">
            <Link href="/features">{t("Features")}</Link><Link href="#workflow">{t("How it works")}</Link><Link href="/guides">{t("Guides")}</Link>
          </nav>
          <div className={cn("landing-nav-actions")}><Link className={cn("landing-nav-cta")} href="/auth/register">{t("Get started")}{" "}<ArrowUpRight size={15} /></Link></div>
        </div>
      </header>
      <section className={cn("landing-hero")}>
        <div className={cn("landing-hero-copy")}>
          <div className={cn("landing-kicker")}><span /> {t("TRAVEL OPERATIONS, IN ONE PLACE")}</div>
          <h1>{t("Bus booking")}<br /><em>{t("software.")}</em></h1>
          <p className={cn("landing-intro")}>{t("Digol TravelOS is bus booking and travel agency management software for trip schedules, seat reservations, fleet, branch teams and financial records.")}</p>
          <div className={cn("landing-hero-actions")}><Link className={cn("landing-primary-cta")} href="/auth/register">{t("Create your account")}{" "}<ArrowRight size={17} /></Link><Link className={cn("landing-secondary-cta")} href="/auth/login">{t("I already have an account")}{" "}<MoveRight size={16} /></Link></div>
          <div className={cn("landing-proofline")}><ShieldCheck size={16} /><span>{t("Built for agencies, branches, and the people who keep them moving.")}</span></div>
        </div>
        <div className={cn("landing-visual-wrap")}>
          <div className={cn("landing-route-stamp")}><span>{t("OPERATIONS")}<br />{t("IN MOTION")}</span><ArrowDownRight size={21} /></div>
          <div className={cn("landing-app-preview")} role="img" aria-label="Illustrative preview of Digol TravelOS">
            <div className={cn("preview-window-bar")}><div className={cn("preview-window-brand")}><span>D</span><strong>Digol TravelOS</strong></div><span className={cn("preview-sample-tag")}>{t("SAMPLE VIEW")}</span><div className={cn("preview-avatar")}>AD</div></div>
            <div className={cn("preview-body")}>
              <aside className={cn("preview-sidebar")} aria-hidden="true"><i className={cn("preview-side-active")}/><i/><i/><i/><i/></aside>
              <div className={cn("preview-content")}>
                <div className={cn("preview-greeting")}><div><small>{t("FRIDAY · 25 SEPTEMBER")}</small><h2>{t("Good morning, Asha")}</h2><p>{t("Here’s what’s moving today.")}</p></div><span className={cn("preview-date")}>{t("Today")}{" "}<ArrowRight size={12}/></span></div>
                <div className={cn("preview-stat-row")}><div className={cn("preview-stat")}><span>{t("Departures")}</span><strong>12</strong><small><BusFront size={12}/> {t("Across 3 branches")}</small></div><div className={cn("preview-stat")}><span>{t("Bookings")}</span><strong>86</strong><small><TicketCheck size={12}/> 18 {t("seats left")}</small></div><div className={cn("preview-stat preview-stat-accent")}><span>{t("Collected")}</span><strong>{t("₹84.2k")}</strong><small><ChartNoAxesCombined size={12}/> {t("Sample figures")}</small></div></div>
                <div className={cn("preview-section-heading")}><strong>{t("Next departures")}</strong><span>{t("View trips")}{" "}<ArrowUpRight size={11}/></span></div>
                <div className={cn("preview-trip-card")}><div className={cn("preview-trip-icon")}><BusFront size={17}/></div><div className={cn("preview-trip-route")}><strong>{t("Pune")}{" "}<MoveRight size={12}/> {t("Goa")}</strong><small><Clock3 size={11}/> 08:30 · Digol Express</small></div><div className={cn("preview-trip-seats")}><strong>38 / 45</strong><small>{t("seats booked")}</small></div><span className={cn("preview-status")}>{t("On time")}</span></div>
                <div className={cn("preview-trip-card preview-trip-card-muted")}><div className={cn("preview-trip-icon preview-trip-icon-sand")}><BusFront size={17}/></div><div className={cn("preview-trip-route")}><strong>{t("Mumbai")}{" "}<MoveRight size={12}/> {t("Nashik")}</strong><small><Clock3 size={11}/> 09:15 · Western Star</small></div><div className={cn("preview-trip-seats")}><strong>24 / 36</strong><small>{t("seats booked")}</small></div><span className={cn("preview-status preview-status-ready")}>{t("Boarding")}</span></div>
                <div className={cn("preview-bottom-note")}><span><i/> {t("Illustrative data")}</span><span>{t("Bookings · Trips · Finance")}</span></div>
              </div>
            </div>
          </div>
          <div className={cn("landing-map-mark")} aria-hidden="true"><Route size={18}/><span>{t("One connected operation")}</span></div>
        </div>
      </section>
      <section className={cn("landing-ribbon")} aria-label="Platform modules"><span>{t("MADE FOR THE DETAILS THAT MOVE A JOURNEY")}</span><i/><b><Armchair size={15}/> {t("Seats & bookings")}</b><b><BusFront size={15}/> {t("Fleet & trips")}</b><b><CircleDollarSign size={15}/> {t("Payments & reports")}</b></section>
      <section className={cn("landing-platform")} id="platform">
        <div className={cn("landing-section-heading")}><div><p className={cn("landing-eyebrow")}>{t("ONE CONNECTED PLATFORM")}</p><h2>{t("Less chasing.")}<br/><em>{t("More moving.")}</em></h2></div><p>{t("Good operations are built on small details working together. Digol TravelOS gives your team one place to see them, manage them, and keep the day on course.")}</p></div>
        <div className={cn("landing-feature-grid")} id="finance">{capabilities.map(({ number, icon: Icon, title, copy, tone }) => <article className={cn(`landing-feature landing-feature-${tone}`)} key={number}><div className={cn("landing-feature-top")}><span>{number} / 03</span><Icon size={19}/></div><h3>{t(title)}</h3><p>{t(copy)}</p><span className={cn("landing-feature-arrow")}><ArrowUpRight size={17}/></span></article>)}</div>
      </section>
      <section className={cn("landing-workflow")} id="workflow"><div className={cn("landing-workflow-inner")}><div className={cn("landing-workflow-intro")}><p className={cn("landing-eyebrow")}>{t("A BETTER RHYTHM FOR THE DAY")}</p><h2>{t("From setup")}<br/>{t("to settlement.")}</h2><p>{t("Bring the pieces of your operation together at a pace that works for your team.")}</p><Link href="/auth/register" className={cn("landing-workflow-link")}>{t("Get started")}{" "}<ArrowRight size={16}/></Link></div><div className={cn("landing-steps")}>{steps.map(([number, title, copy], index) => <article className={cn("landing-step")} key={number}><span className={cn("landing-step-number")}>{number}</span><div><h3>{t(title)}</h3><p>{t(copy)}</p></div><span className={cn(`landing-step-icon ${index === 2 ? "landing-step-icon-last" : ""}`)}>{index === 0 ? <MapPin size={17}/> : index === 1 ? <BusFront size={17}/> : <Check size={17}/>}</span></article>)}</div></div></section>
      <section className={cn("landing-final-cta")}><div className={cn("landing-final-icon")}><Route size={22}/></div><p className={cn("landing-eyebrow")}>{t("YOUR NEXT DEPARTURE STARTS HERE")}</p><h2>{t("Give your operation")}<br/>{t("room to move.")}</h2><p>{t("Get started with Digol TravelOS and bring the journey into focus.")}</p><Link className={cn("landing-primary-cta")} href="/auth/register">{t("Create your account")}{" "}<ArrowRight size={17}/></Link></section>
      <HomeSearchContent />
      <SiteFooter />
    </main>
  );
}
