import Link from "next/link";
import "../styles/marketing.css";
import type { ReactNode } from "react";
import { Brand } from "./Brand";
import { SiteFooter } from "./SiteFooter";

export function PublicLayout({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children: ReactNode }) {
  return <div className="public-page">
    <header className="public-header"><Brand /><nav aria-label="Page navigation"><Link href="/#platform">Platform</Link><Link href="/contact">Contact</Link><Link className="public-header-cta" href="/auth/register">Get started</Link></nav></header>
    <main className="public-content"><div className="public-intro"><span>{eyebrow}</span><h1>{title}</h1><p>{intro}</p></div><div className="public-body">{children}</div></main>
    <SiteFooter />
  </div>;
}
