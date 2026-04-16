import type { Metadata } from "next";
import { DEFAULT_META_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: "ImportScore | France car import verdict before you buy",
    template: `%s | ${SITE_NAME}`
  },
  description: DEFAULT_META_DESCRIPTION,
  keywords: [
    "France car import",
    "import cost calculator",
    "vehicle import report",
    "car import France",
    "used car import decision"
  ],
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: "ImportScore | France car import verdict before you buy",
    description: DEFAULT_META_DESCRIPTION,
    url: "/"
  },
  twitter: {
    card: "summary",
    title: "ImportScore | France car import verdict before you buy",
    description: DEFAULT_META_DESCRIPTION
  },
  icons: {
    icon: "/icon.svg"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}