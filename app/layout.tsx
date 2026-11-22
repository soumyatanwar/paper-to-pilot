import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Tabs } from "@/components/Tabs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clinician Research Exchange",
  description:
    "Clinicians post the patterns they want to study, researchers and inventors add papers, and patients nominate doctors they trust. Matching connects all three.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Sans+Condensed:wght@500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <a href="#content" className="sr skip">Skip to content</a>
        <header className="top">
          <div className="wrap">
            <div className="brand">
              <h1><Link href="/questions" style={{ color: "inherit", textDecoration: "none" }}>Clinician Research Exchange</Link></h1>
              <p>
                Clinicians post the patterns they want to study, researchers and inventors add papers, and patients nominate doctors they
                trust. Matching connects all three.
              </p>
            </div>
            <Tabs />
          </div>
        </header>
        <main id="content">
          <div className="wrap">
            <div className="notice" role="note">
              <b>Write about groups of patients, never an individual.</b> No names, dates, phone numbers or record numbers. Entries marked
              Sample are illustrative, not real people or products.
            </div>
            {children}
          </div>
        </main>
        <footer className="foot">
          <div className="wrap">
            <span>Clinician Research Exchange</span>
            <span>
              <Link href="/privacy">Privacy and data</Link> · <Link href="/admin">Team</Link>
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
