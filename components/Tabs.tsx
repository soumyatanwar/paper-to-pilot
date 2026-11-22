"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const TABS: [string, string][] = [
  ["/questions", "Clinician questions"],
  ["/papers", "Papers"],
  ["/champions", "Champions"],
  ["/nominate", "Nominate a doctor"],
  ["/match", "Match"],
];

export function Tabs() {
  const path = usePathname();
  return (
    <nav className="tabs" aria-label="Sections">
      {TABS.map(([href, label]) => (
        <Link key={href} href={href} aria-current={path === href || path.startsWith(href + "/") ? "page" : undefined}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
