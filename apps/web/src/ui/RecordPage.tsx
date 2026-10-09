"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  BusFront,
  CircleDollarSign,
  Eye,
  FileText,
  MapPin,
  Pencil,
  Route,
  ShieldCheck,
  Ticket,
  UserRound,
} from "lucide-react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { PageHeader } from "./PageHeader";
import { useTranslations } from "../i18n/LocaleProvider";
import "../styles/record-page.css";

export function ViewRecordLink({ href }: { href: string }) {
  const t = useTranslations();
  return (
    <Link
      prefetch={false}
      href={href}
      className="button button-secondary record-edit-link"
    >
      <Eye size={15} aria-hidden="true" />
      {t("View")}
    </Link>
  );
}

export function EditRecordLink({
  href,
  label = "Edit",
}: {
  href: string;
  label?: string;
}) {
  const t = useTranslations();
  return (
    <Link
      prefetch={false}
      href={href}
      className="button button-secondary record-edit-link"
    >
      <Pencil size={15} aria-hidden="true" />
      {t(label)}
    </Link>
  );
}

export function RecordPage({
  title,
  description,
  backHref,
  backLabel = "Back to list",
  eyebrow = "Record details",
  actions,
  children,
  summary,
}: {
  title: string;
  description: string;
  backHref: string;
  backLabel?: string;
  eyebrow?: string;
  actions?: ReactNode;
  children: ReactNode;
  summary?: { label: string; value: ReactNode; href?: string }[];
}) {
  const t = useTranslations();
  const pathname = usePathname();
  const editing = pathname.endsWith("/edit");
  const creating = pathname.endsWith("/new");
  const kind = pathname.split("/")[2];
  const Icon =
    (
      {
        branches: MapPin,
        agencies: Building2,
        agents: UserRound,
        team: UserRound,
        customers: UserRound,
        buses: BusFront,
        trips: Route,
        routes: Route,
        stops: MapPin,
        drivers: UserRound,
        bookings: Ticket,
        cancellations: Ticket,
        finance: CircleDollarSign,
        roles: ShieldCheck,
        operators: Building2,
      } as Record<string, typeof FileText>
    )[kind] ?? FileText;
  return (
    <div
      className="record-page"
      data-mode={editing ? "edit" : creating ? "new" : "detail"}
    >
      <PageHeader title={title} description={description} />
      <div className="record-toolbar">
        <Link prefetch={false} href={backHref} className="record-back">
          <ArrowLeft size={16} aria-hidden="true" />
          {t(backLabel)}
        </Link>
        <span className="record-mode">
          <span aria-hidden="true" />
          {t(
            editing
              ? "Edit record"
              : creating
                ? "New record"
                : "Record details",
          )}
        </span>
      </div>
      <header className="record-hero">
        <span className="record-hero-icon">
          <Icon size={29} strokeWidth={1.6} aria-hidden="true" />
        </span>
        <div>
          <p className="eyebrow">{t(eyebrow)}</p>
          <h1>{t(title)}</h1>
          <p>{t(description)}</p>
        </div>
        {actions && <div className="record-hero-actions">{actions}</div>}
      </header>
      {summary?.length ? (
        <dl className="record-summary">
          {summary.map(({ label, value, href }) => (
            <div key={label}>
              <dt>{t(label)}</dt>
              <dd>
                {href ? (
                  <Link prefetch={false} href={href}>
                    {value}
                    <ArrowUpRight size={15} aria-hidden="true" />
                  </Link>
                ) : (
                  (value ?? "—")
                )}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      <div className="record-content">{children}</div>
    </div>
  );
}

export function RecordSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const t = useTranslations();
  return (
    <section className="record-section">
      <div className="record-section-heading">
        <h2>{t(title)}</h2>
        {description && <p>{t(description)}</p>}
      </div>
      {children}
    </section>
  );
}

export function RecordFields({
  fields,
}: {
  fields: { label: string; value: ReactNode }[];
}) {
  const t = useTranslations();
  return (
    <dl className="record-fields">
      {fields.map((field) => (
        <div key={field.label}>
          <dt>{t(field.label)}</dt>
          <dd>{field.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
