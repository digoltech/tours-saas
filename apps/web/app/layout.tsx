import type { Metadata } from "next";
import "../src/index.css";

export const metadata: Metadata = {
  title: "Digol TravelOS | Digol Tours",
  description:
    "One clear platform for travel teams to manage routes, trips, bookings, payments, cancellations, and reports.",
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
