import Link from "next/link";
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
  ["01", "Set up your network", "Bring branches, people, fleet, and routes into one workspace."],
  ["02", "Plan the next departure", "Schedule trips, set fares, and make seats ready to sell."],
  ["03", "Keep the whole journey moving", "Manage bookings, payments, cancellations, and reports together."],
];

export default function HomePage() {
  return (
    <main className="landing">
      <header className="landing-header">
        <div className="landing-nav">
          <Link className="landing-brand" href="/" aria-label="A-One Tours home">
            <span className="landing-brand-mark">A</span>
            <span className="landing-brand-copy"><strong>A-One</strong><small>TOURS & TRAVELS</small></span>
          </Link>
          <nav className="landing-nav-links" aria-label="Main navigation">
            <Link href="#platform">Platform</Link><Link href="#workflow">How it works</Link><Link href="#finance">Finance</Link>
          </nav>
          <div className="landing-nav-actions"><Link className="landing-signin" href="/login">Sign in</Link><Link className="landing-nav-cta" href="/register">Create workspace <ArrowUpRight size={15} /></Link></div>
        </div>
      </header>
      <section className="landing-hero">
        <div className="landing-hero-copy">
          <div className="landing-kicker"><span /> TRAVEL OPERATIONS, IN ONE PLACE</div>
          <h1>Every trip.<br /><em>One clear view.</em></h1>
          <p className="landing-intro">The workspace for tour and travel teams to coordinate bookings, vehicles, routes, and money from the first seat to the final settlement.</p>
          <div className="landing-hero-actions"><Link className="landing-primary-cta" href="/register">Create your workspace <ArrowRight size={17} /></Link><Link className="landing-secondary-cta" href="/login">I already have an account <MoveRight size={16} /></Link></div>
          <div className="landing-proofline"><ShieldCheck size={16} /><span>Built for agencies, branches, and the people who keep them moving.</span></div>
        </div>
        <div className="landing-visual-wrap">
          <div className="landing-route-stamp"><span>OPERATIONS<br />IN MOTION</span><ArrowDownRight size={21} /></div>
          <div className="landing-app-preview" role="img" aria-label="Illustrative preview of the A-One workspace">
            <div className="preview-window-bar"><div className="preview-window-brand"><span>A</span><strong>A-One</strong></div><span className="preview-sample-tag">SAMPLE WORKSPACE</span><div className="preview-avatar">AD</div></div>
            <div className="preview-body">
              <aside className="preview-sidebar" aria-hidden="true"><i className="preview-side-active"/><i/><i/><i/><i/></aside>
              <div className="preview-content">
                <div className="preview-greeting"><div><small>FRIDAY · 25 SEPTEMBER</small><h2>Good morning, Asha</h2><p>Here’s what’s moving today.</p></div><span className="preview-date">Today <ArrowRight size={12}/></span></div>
                <div className="preview-stat-row"><div className="preview-stat"><span>Departures</span><strong>12</strong><small><BusFront size={12}/> Across 3 branches</small></div><div className="preview-stat"><span>Bookings</span><strong>86</strong><small><TicketCheck size={12}/> 18 seats left</small></div><div className="preview-stat preview-stat-accent"><span>Collected</span><strong>₹84.2k</strong><small><ChartNoAxesCombined size={12}/> Sample figures</small></div></div>
                <div className="preview-section-heading"><strong>Next departures</strong><span>View trips <ArrowUpRight size={11}/></span></div>
                <div className="preview-trip-card"><div className="preview-trip-icon"><BusFront size={17}/></div><div className="preview-trip-route"><strong>Pune <MoveRight size={12}/> Goa</strong><small><Clock3 size={11}/> 08:30 · A-One Express</small></div><div className="preview-trip-seats"><strong>38 / 45</strong><small>seats booked</small></div><span className="preview-status">On time</span></div>
                <div className="preview-trip-card preview-trip-card-muted"><div className="preview-trip-icon preview-trip-icon-sand"><BusFront size={17}/></div><div className="preview-trip-route"><strong>Mumbai <MoveRight size={12}/> Nashik</strong><small><Clock3 size={11}/> 09:15 · Western Star</small></div><div className="preview-trip-seats"><strong>24 / 36</strong><small>seats booked</small></div><span className="preview-status preview-status-ready">Boarding</span></div>
                <div className="preview-bottom-note"><span><i/> Illustrative data</span><span>Bookings · Trips · Finance</span></div>
              </div>
            </div>
          </div>
          <div className="landing-map-mark" aria-hidden="true"><Route size={18}/><span>One connected operation</span></div>
        </div>
      </section>
      <section className="landing-ribbon" aria-label="Platform modules"><span>MADE FOR THE DETAILS THAT MOVE A JOURNEY</span><i/><b><Armchair size={15}/> Seats & bookings</b><b><BusFront size={15}/> Fleet & trips</b><b><CircleDollarSign size={15}/> Payments & reports</b></section>
      <section className="landing-platform" id="platform">
        <div className="landing-section-heading"><div><p className="landing-eyebrow">ONE CONNECTED WORKSPACE</p><h2>Less chasing.<br/><em>More moving.</em></h2></div><p>Good operations are built on small details working together. A-One gives your team one place to see them, manage them, and keep the day on course.</p></div>
        <div className="landing-feature-grid" id="finance">{capabilities.map(({ number, icon: Icon, title, copy, tone }) => <article className={`landing-feature landing-feature-${tone}`} key={number}><div className="landing-feature-top"><span>{number} / 03</span><Icon size={19}/></div><h3>{title}</h3><p>{copy}</p><span className="landing-feature-arrow"><ArrowUpRight size={17}/></span></article>)}</div>
      </section>
      <section className="landing-workflow" id="workflow"><div className="landing-workflow-inner"><div className="landing-workflow-intro"><p className="landing-eyebrow">A BETTER RHYTHM FOR THE DAY</p><h2>From setup<br/>to settlement.</h2><p>Bring the pieces of your operation together at a pace that works for your team.</p><Link href="/register" className="landing-workflow-link">Start with your workspace <ArrowRight size={16}/></Link></div><div className="landing-steps">{steps.map(([number, title, copy], index) => <article className="landing-step" key={number}><span className="landing-step-number">{number}</span><div><h3>{title}</h3><p>{copy}</p></div><span className={`landing-step-icon ${index === 2 ? "landing-step-icon-last" : ""}`}>{index === 0 ? <MapPin size={17}/> : index === 1 ? <BusFront size={17}/> : <Check size={17}/>}</span></article>)}</div></div></section>
      <section className="landing-final-cta"><div className="landing-final-icon"><Route size={22}/></div><p className="landing-eyebrow">YOUR NEXT DEPARTURE STARTS HERE</p><h2>Give your operation<br/>room to move.</h2><p>Set up a workspace for your team and bring the journey into focus.</p><Link className="landing-primary-cta" href="/register">Create your workspace <ArrowRight size={17}/></Link></section>
      <footer className="landing-footer"><Link className="landing-brand" href="/"><span className="landing-brand-mark">A</span><span className="landing-brand-copy"><strong>A-One</strong><small>TOURS & TRAVELS</small></span></Link><span>Thoughtful tools for teams in motion.</span><span>© 2026 A-One Tours & Travels</span></footer>
    </main>
  );
}
