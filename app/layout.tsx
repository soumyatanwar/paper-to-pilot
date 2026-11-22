import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clinician Research Exchange",
  description: "Clinicians post the patterns they want to study, researchers and inventors add papers, and patients nominate doctors they trust.",
};

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
        <header className="top">
          <div className="wrap">
            <div className="brand">
              <h1>Clinician Research Exchange</h1>
              <p>
                Clinicians post the patterns they want to study, researchers and inventors add papers, and patients
                nominate doctors they trust. Matching connects all three.
              </p>
            </div>
            <nav className="tabs" aria-label="Sections">
              <a href="/questions">Clinician questions</a>
              <a href="/papers">Papers</a>
              <a href="/champions">Champions</a>
              <a href="/nominate">Nominate a doctor</a>
              <a href="/match">Match</a>
            </nav>
          </div>
        </header>
        <main>
          <div className="wrap">{children}</div>
        </main>
      </body>
    </html>
  );
}
