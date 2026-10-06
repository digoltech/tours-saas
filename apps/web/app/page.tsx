import { Translate } from "../src/i18n/Translate";
import { cn } from "../src/lib/utils";
import "../src/styles/marketing.css";
import Link from "next/link";
import { Brand } from "../src/ui/Brand";
import { SiteFooter } from "../src/ui/SiteFooter";
import { LanguageSelector } from "../src/i18n/LanguageSelector";
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
  { number: "03", icon: ShieldCheck, title: "The right view for every team", copy: "Give agency, branch, and agent teams their own operational view, with data scoped to their work.", tone: "dark" },
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
    <main className={cn("landing")}>
      <header className={cn("landing-header")}>
        <div className={cn("landing-nav")}>
          <Brand className="landing-brand" />
          <nav className={cn("landing-nav-links")} aria-label="Main navigation">
            <Link href="#platform"><Translate text={"Platform"} /></Link><Link href="#workflow"><Translate text={"How it works"} /></Link><Link href="#finance"><Translate text={"Finance"} /></Link>
          </nav>
          <div className={cn("landing-nav-actions")}><LanguageSelector /><Link className={cn("landing-signin")} href="/auth/login"><Translate text={"Sign in"} /></Link><Link className={cn("landing-nav-cta")} href="/auth/register"><Translate text={"Get started"} />{" "}<ArrowUpRight size={15} /></Link></div>
        </div>
      </header>
      <section className={cn("landing-hero")}>
        <div className={cn("landing-hero-copy")}>
          <div className={cn("landing-kicker")}><span /> <Translate text={"TRAVEL OPERATIONS, IN ONE PLACE"} /></div>
          <h1><Translate text={"Every trip."} /><br /><em><Translate text={"One clear view."} /></em></h1>
          <p className={cn("landing-intro")}><Translate text={"Digol TravelOS brings bookings, vehicles, routes, and finances together from the first seat to the final settlement."} /></p>
          <div className={cn("landing-hero-actions")}><Link className={cn("landing-primary-cta")} href="/auth/register"><Translate text={"Create your account"} />{" "}<ArrowRight size={17} /></Link><Link className={cn("landing-secondary-cta")} href="/auth/login"><Translate text={"I already have an account"} />{" "}<MoveRight size={16} /></Link></div>
          <div className={cn("landing-proofline")}><ShieldCheck size={16} /><span><Translate text={"Built for agencies, branches, and the people who keep them moving."} /></span></div>
        </div>
        <div className={cn("landing-visual-wrap")}>
          <div className={cn("landing-route-stamp")}><span><Translate text={"OPERATIONS"} /><br /><Translate text={"IN MOTION"} /></span><ArrowDownRight size={21} /></div>
          <div className={cn("landing-app-preview")} role="img" aria-label="Illustrative preview of Digol TravelOS">
            <div className={cn("preview-window-bar")}><div className={cn("preview-window-brand")}><span>D</span><strong>Digol TravelOS</strong></div><span className={cn("preview-sample-tag")}><Translate text={"SAMPLE VIEW"} /></span><div className={cn("preview-avatar")}>AD</div></div>
            <div className={cn("preview-body")}>
              <aside className={cn("preview-sidebar")} aria-hidden="true"><i className={cn("preview-side-active")}/><i/><i/><i/><i/></aside>
              <div className={cn("preview-content")}>
                <div className={cn("preview-greeting")}><div><small><Translate text={"FRIDAY · 25 SEPTEMBER"} /></small><h2><Translate text={"Good morning, Asha"} /></h2><p><Translate text={"Here’s what’s moving today."} /></p></div><span className={cn("preview-date")}><Translate text={"Today"} />{" "}<ArrowRight size={12}/></span></div>
                <div className={cn("preview-stat-row")}><div className={cn("preview-stat")}><span><Translate text={"Departures"} /></span><strong>12</strong><small><BusFront size={12}/> <Translate text={"Across 3 branches"} /></small></div><div className={cn("preview-stat")}><span><Translate text={"Bookings"} /></span><strong>86</strong><small><TicketCheck size={12}/> 18 <Translate text={"seats left"} /></small></div><div className={cn("preview-stat preview-stat-accent")}><span><Translate text={"Collected"} /></span><strong><Translate text={"₹84.2k"} /></strong><small><ChartNoAxesCombined size={12}/> <Translate text={"Sample figures"} /></small></div></div>
                <div className={cn("preview-section-heading")}><strong><Translate text={"Next departures"} /></strong><span><Translate text={"View trips"} />{" "}<ArrowUpRight size={11}/></span></div>
                <div className={cn("preview-trip-card")}><div className={cn("preview-trip-icon")}><BusFront size={17}/></div><div className={cn("preview-trip-route")}><strong><Translate text={"Pune"} />{" "}<MoveRight size={12}/> <Translate text={"Goa"} /></strong><small><Clock3 size={11}/> 08:30 · Digol Express</small></div><div className={cn("preview-trip-seats")}><strong>38 / 45</strong><small><Translate text={"seats booked"} /></small></div><span className={cn("preview-status")}><Translate text={"On time"} /></span></div>
                <div className={cn("preview-trip-card preview-trip-card-muted")}><div className={cn("preview-trip-icon preview-trip-icon-sand")}><BusFront size={17}/></div><div className={cn("preview-trip-route")}><strong><Translate text={"Mumbai"} />{" "}<MoveRight size={12}/> <Translate text={"Nashik"} /></strong><small><Clock3 size={11}/> 09:15 · Western Star</small></div><div className={cn("preview-trip-seats")}><strong>24 / 36</strong><small><Translate text={"seats booked"} /></small></div><span className={cn("preview-status preview-status-ready")}><Translate text={"Boarding"} /></span></div>
                <div className={cn("preview-bottom-note")}><span><i/> <Translate text={"Illustrative data"} /></span><span><Translate text={"Bookings · Trips · Finance"} /></span></div>
              </div>
            </div>
          </div>
          <div className={cn("landing-map-mark")} aria-hidden="true"><Route size={18}/><span><Translate text={"One connected operation"} /></span></div>
        </div>
      </section>
      <section className={cn("landing-ribbon")} aria-label="Platform modules"><span><Translate text={"MADE FOR THE DETAILS THAT MOVE A JOURNEY"} /></span><i/><b><Armchair size={15}/> <Translate text={"Seats & bookings"} /></b><b><BusFront size={15}/> <Translate text={"Fleet & trips"} /></b><b><CircleDollarSign size={15}/> <Translate text={"Payments & reports"} /></b></section>
      <section className={cn("landing-platform")} id="platform">
        <div className={cn("landing-section-heading")}><div><p className={cn("landing-eyebrow")}><Translate text={"ONE CONNECTED PLATFORM"} /></p><h2><Translate text={"Less chasing."} /><br/><em><Translate text={"More moving."} /></em></h2></div><p><Translate text={"Good operations are built on small details working together. Digol TravelOS gives your team one place to see them, manage them, and keep the day on course."} /></p></div>
        <div className={cn("landing-feature-grid")} id="finance">{capabilities.map(({ number, icon: Icon, title, copy, tone }) => <article className={cn(`landing-feature landing-feature-${tone}`)} key={number}><div className={cn("landing-feature-top")}><span>{number} / 03</span><Icon size={19}/></div><h3>{t(title)}</h3><p>{t(copy)}</p><span className={cn("landing-feature-arrow")}><ArrowUpRight size={17}/></span></article>)}</div>
      </section>
      <section className={cn("landing-workflow")} id="workflow"><div className={cn("landing-workflow-inner")}><div className={cn("landing-workflow-intro")}><p className={cn("landing-eyebrow")}><Translate text={"A BETTER RHYTHM FOR THE DAY"} /></p><h2><Translate text={"From setup"} /><br/><Translate text={"to settlement."} /></h2><p><Translate text={"Bring the pieces of your operation together at a pace that works for your team."} /></p><Link href="/auth/register" className={cn("landing-workflow-link")}><Translate text={"Get started"} />{" "}<ArrowRight size={16}/></Link></div><div className={cn("landing-steps")}>{steps.map(([number, title, copy], index) => <article className={cn("landing-step")} key={number}><span className={cn("landing-step-number")}>{number}</span><div><h3>{t(title)}</h3><p>{t(copy)}</p></div><span className={cn(`landing-step-icon ${index === 2 ? "landing-step-icon-last" : ""}`)}>{index === 0 ? <MapPin size={17}/> : index === 1 ? <BusFront size={17}/> : <Check size={17}/>}</span></article>)}</div></div></section>
      <section className={cn("landing-final-cta")}><div className={cn("landing-final-icon")}><Route size={22}/></div><p className={cn("landing-eyebrow")}><Translate text={"YOUR NEXT DEPARTURE STARTS HERE"} /></p><h2><Translate text={"Give your operation"} /><br/><Translate text={"room to move."} /></h2><p><Translate text={"Get started with Digol TravelOS and bring the journey into focus."} /></p><Link className={cn("landing-primary-cta")} href="/auth/register"><Translate text={"Create your account"} />{" "}<ArrowRight size={17}/></Link></section>
      <SiteFooter />
    </main>
  );
}
