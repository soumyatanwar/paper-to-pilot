// Likely-duplicate doctor detection, for admin review (never auto-merged).
// Catches what exact nameKey matching misses: initials ("Dr. K. Iyer" vs "Dr. Kavya Iyer"),
// small typos ("Kavya Iyar"), spacing and punctuation.

import type { Doctor } from "./types";

export function nameTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/^dr\.?\s+/, "")
    .replace(/[^a-z\s.]/g, " ")
    .split(/[\s.]+/)
    .filter(Boolean);
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

/** Given names compatible: equal, or one is an initial of the other. */
function givenCompatible(a: string[], b: string[]): boolean {
  if (!a.length || !b.length) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return short.every((t, i) => {
    const u = long[i];
    return t === u || (t.length === 1 && u.startsWith(t)) || (u.length === 1 && t.startsWith(u));
  });
}

export interface DuplicatePair {
  a: Doctor;
  b: Doctor;
  reason: string;
}

export function nameSimilarity(x: string, y: string): string | null {
  const a = nameTokens(x), b = nameTokens(y);
  if (!a.length || !b.length) return null;
  const ja = a.join(""), jb = b.join("");
  if (ja === jb) return "Same name";
  const sa = a[a.length - 1], sb = b[b.length - 1];
  if (sa === sb && givenCompatible(a.slice(0, -1), b.slice(0, -1))) return "Same surname, matching initials";
  if (Math.min(ja.length, jb.length) >= 8 && levenshtein(ja, jb) <= 2) return "Names differ by one or two letters";
  return null;
}

/**
 * Pairs that look like the same doctor. Different cities or different specialties,
 * when both are known, rule a pair out unless the names are identical.
 */
export function findDuplicates(doctors: Doctor[]): DuplicatePair[] {
  const out: DuplicatePair[] = [];
  const differ = (x?: string, y?: string) => !!x && !!y && x.trim().toLowerCase() !== y.trim().toLowerCase();
  for (let i = 0; i < doctors.length; i++) {
    for (let j = i + 1; j < doctors.length; j++) {
      const a = doctors[i], b = doctors[j];
      const reason = nameSimilarity(a.name, b.name);
      if (!reason) continue;
      if (reason !== "Same name" && (differ(a.city, b.city) || differ(a.specialty, b.specialty))) continue;
      out.push({ a, b, reason });
    }
  }
  return out;
}
