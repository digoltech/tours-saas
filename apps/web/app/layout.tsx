import type { Metadata } from "next";
import {
  Manrope,
  Space_Grotesk,
  IBM_Plex_Mono,
  Noto_Sans_Devanagari,
  Noto_Sans_Gujarati,
} from "next/font/google";
const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
});
const displayFont = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  preload: false,
  variable: "--font-mono",
});
const hindi = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  display: "swap",
  preload: false,
  variable: "--font-hindi",
});
const gujarati = Noto_Sans_Gujarati({
  subsets: ["gujarati"],
  display: "swap",
  preload: false,
  variable: "--font-gujarati",
});
import "../src/index.css";
import { LocaleProvider } from "../src/i18n/LocaleProvider";
import { getLocale } from "../src/i18n/server";
import { indexingEnabled, siteDescription, siteOrigin } from "../src/lib/seo";

export const metadata: Metadata = {
  metadataBase: siteOrigin,
  title: { default: "Bus Booking & Agency Management Software | Digol TravelOS", template: "%s | Digol TravelOS" },
  description: siteDescription,
  robots: { index: indexingEnabled, follow: true },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    other: process.env.BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION } : undefined,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      className={`${manrope.variable} ${displayFont.variable} ${mono.variable} ${hindi.variable} ${gujarati.variable}`}
    >
      <body>
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
