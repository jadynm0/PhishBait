import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PhishBait",
  description: "Poison scam databases with synthetic victim data at scale.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
