import type { Metadata } from "next";
import "../src/index.css";
import { LocaleProvider } from "../src/i18n/LocaleProvider";
import { getLocale } from "../src/i18n/server";
import { translate } from "../src/i18n/dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: "Digol TravelOS | Digol Tours",
    description: translate(locale, "One clear platform for travel teams to manage routes, trips, bookings, payments, cancellations, and reports."),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body><LocaleProvider locale={locale}>{children}</LocaleProvider></body>
    </html>
  );
}
