import Link from "next/link";
import { ArrowRight, Bus, Map, ShieldCheck } from "lucide-react";

const highlights = [
  {
    icon: ShieldCheck,
    title: "One operating view",
    text: "Keep agencies, branches, and teams aligned from one calm workspace.",
  },
  {
    icon: Bus,
    title: "Fleet-ready foundation",
    text: "Prepare the records and structure your transport operation needs.",
  },
  {
    icon: Map,
    title: "Built for every route",
    text: "Create a dependable base for routes, trips, and travel operations.",
  },
];

export default function HomePage() {
  return (
    <main className="home-page">
      <nav className="home-nav" aria-label="Public navigation">
        <Link className="home-brand" href="/">
          <span className="brand-mark">A</span>
          <span>
            <strong>A-One</strong>
            <small>Tours & Travels</small>
          </span>
        </Link>
        <div className="home-nav-links">
          <Link href="#platform">Platform</Link>
          <Link href="#foundation">Foundation</Link>
          <Link href="/login">Sign in</Link>
          <Link href="/register">Create workspace</Link>
        </div>
      </nav>
      <section className="home-hero">
        <div className="hero-copy">
          <p className="eyebrow">Travel operations, made clear</p>
          <h1>Move your whole operation forward.</h1>
          <p className="hero-description">
            A-One Tours & Travels gives modern agencies a structured home for
            the people, vehicles, routes, and trips that keep every journey
            moving.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/dashboard">
              Open workspace <ArrowRight size={16} />
            </Link>
            <Link className="text-link" href="/register">Start free <ArrowRight size={15} /></Link>
            <Link className="text-link" href="#foundation">
              Explore the foundation <ArrowRight size={15} />
            </Link>
          </div>
          <div className="hero-proof">
            <span>
              <i />
              Built for multi-tenant teams
            </span>
            <span>
              <i />
              Ready for your next phase
            </span>
          </div>
        </div>
        <div className="hero-panel" aria-label="Workspace preview">
          <div className="preview-top">
            <span className="preview-dot" />
            <span className="preview-dot" />
            <span className="preview-dot" />
            <strong>Today at A-One</strong>
          </div>
          <div className="preview-title">
            <span>Operations overview</span>
            <b>09:42</b>
          </div>
          <div className="preview-metrics">
            <div>
              <small>Active agencies</small>
              <strong>12</strong>
              <em>+18% this month</em>
            </div>
            <div>
              <small>Scheduled trips</small>
              <strong>48</strong>
              <em>Ready to depart</em>
            </div>
          </div>
          <div className="preview-route">
            <div className="route-line">
              <span />
              <i />
              <span />
            </div>
            <div>
              <strong>
                Colombo <small>06:30</small>
              </strong>
              <strong>
                Kandy <small>10:45</small>
              </strong>
            </div>
            <b>On schedule</b>
          </div>
          <div className="preview-footer">
            <span>Fleet utilization</span>
            <div className="progress">
              <i />
            </div>
            <strong>76%</strong>
          </div>
        </div>
      </section>
      <section className="home-highlights" id="platform">
        <p className="eyebrow">A stronger starting point</p>
        <h2>Everything begins with a clear foundation.</h2>
        <div className="highlight-grid">
          {highlights.map(({ icon: Icon, title, text }) => (
            <article key={title}>
              <div className="highlight-icon">
                <Icon size={20} />
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="home-foundation" id="foundation">
        <div>
          <p className="eyebrow">Phase 1 foundation</p>
          <h2>
            Start with structure.
            <br />
            Grow with confidence.
          </h2>
        </div>
        <div>
          <p>
            Set up your workspace today, then add the operational depth your
            team needs as A-One Tours evolves.
          </p>
          <Link className="text-link" href="/dashboard">
            View the workspace <ArrowRight size={15} />
          </Link>
        </div>
      </section>
      <footer className="home-footer">
        <span>© 2026 A-One Tours & Travels</span>
        <span>Travel operations, thoughtfully organized.</span>
      </footer>
    </main>
  );
}
