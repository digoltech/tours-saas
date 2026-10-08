"use client";

import Link from "next/link";
import { ArrowLeft, FileText, Pencil } from "lucide-react";
import type { ReactNode } from "react";
import { PageHeader } from "./PageHeader";
import { useTranslations } from "../i18n/LocaleProvider";
import "../styles/record-page.css";

export function EditRecordLink({
  href,
  label = "Edit",
}: {
  href: string;
  label?: string;
}) {
  const t = useTranslations();
  return (
    <Link href={href} className="button button-secondary record-edit-link">
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
}: {
  title: string;
  description: string;
  backHref: string;
  backLabel?: string;
  eyebrow?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const t = useTranslations();
  return (
    <div className="record-page">
      <PageHeader title={title} description={description} />
      <Link href={backHref} className="record-back">
        <ArrowLeft size={16} />
        {t(backLabel)}
      </Link>
      <header className="record-hero">
        <span className="record-hero-icon">
          <FileText size={25} />
        </span>
        <div>
          <p className="eyebrow">{t(eyebrow)}</p>
          <h1>{t(title)}</h1>
          <p>{t(description)}</p>
        </div>
        {actions && <div className="record-hero-actions">{actions}</div>}
      </header>
      {children}
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
