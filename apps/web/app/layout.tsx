import type { Metadata } from "next";
import "../src/index.css";
import "../src/App.css";

export const metadata: Metadata = {
  title: "A-One Tours & Travels",
  description:
    "One clear workspace for travel teams to manage routes, trips, bookings, payments, cancellations, and reports.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
