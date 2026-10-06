import { cn } from "../../../lib/utils";
import "../../../styles/account.css";
import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { Brand } from "../../../ui/Brand";
import type { ReactNode } from "react";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className={cn("auth-shell")}>
      <header className={cn("auth-header")}>
        <Brand className="auth-brand" />
        <nav className="auth-header-links" aria-label="Account navigation"><Link href="/contact">Need help?</Link><Link href="/auth/login">Sign in <ArrowUpRight size={14} /></Link></nav>
      </header>

      <main className={cn("auth-main")}>
        <aside className={cn("auth-visual")} aria-label="A scenic coach journey through green hills">
          <div className={cn("auth-visual-content")}>
            <span className={cn("auth-visual-kicker")}>A smoother way to move</span>
            <h1>Every journey starts with a better plan.</h1>
            <p>Keep your routes, seats, team, and bookings moving together with Digol TravelOS.</p>
            <div className={cn("auth-visual-proof")}><span className={cn("auth-proof-icon")}><ShieldCheck size={17} /></span><span><strong>Built for travel teams</strong><small>From the first booking to the final stop</small></span><ArrowUpRight size={17} /></div>
          </div>
          <span className={cn("auth-image-caption")}>The road ahead, made simpler.</span>
        </aside>
        <section className={cn("auth-form-panel")} aria-label="Account access">
          <div className={cn("auth-form-inner")}>{children}</div>
        </section>
      </main>

      <footer className={cn("auth-footer")}>
        <span>© {new Date().getFullYear()} Digol Tours</span>
        <nav aria-label="Legal and support"><Link href="/privacy-policy">Privacy Policy</Link><Link href="/terms-and-conditions">Terms</Link><Link href="/contact">Contact</Link></nav>
        <span className={cn("auth-footer-secure")}><ShieldCheck size={14} /> Secure account access</span>
      </footer>
    </div>
  );
}
