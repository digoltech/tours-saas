import type { Metadata } from "next";
import "../src/index.css";
import "../src/App.css";

export const metadata: Metadata = {
  title: "A-One Tours & Travels",
  description:
    "Travel operations management foundation for A-One Tours & Travels.",
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
