import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-shell">
      <header className="auth-header">
        <Link className="auth-brand" href="/" aria-label="A-One Tours home">
          <span className="brand-mark">A</span>
          <span><strong>A-One</strong><small>Tours & Travels</small></span>
        </Link>
        <div className="auth-header-note"><ShieldCheck size={16} /><span>Secure workspace access</span></div>
      </header>

      <main className="auth-main">
        <aside className="auth-visual" aria-label="A scenic coach journey through green hills">
          <div className="auth-visual-content">
            <span className="auth-visual-kicker">A smoother way to move</span>
            <h1>Every journey starts with a better plan.</h1>
            <p>Keep your routes, seats, team, and bookings moving together in one calm workspace.</p>
            <div className="auth-visual-proof"><span className="auth-proof-icon"><ShieldCheck size={17} /></span><span><strong>Built for travel teams</strong><small>From the first booking to the final stop</small></span><ArrowUpRight size={17} /></div>
          </div>
          <span className="auth-image-caption">The road ahead, made simpler.</span>
        </aside>
        <section className="auth-form-panel" aria-label="Account access">
          <div className="auth-form-inner">{children}</div>
        </section>
      </main>

      <footer className="auth-footer">
        <span>© {new Date().getFullYear()} A-One Tours & Travels</span>
        <span className="auth-footer-secure"><ShieldCheck size={14} /> Your workspace is protected</span>
      </footer>
    </div>
  );
}
