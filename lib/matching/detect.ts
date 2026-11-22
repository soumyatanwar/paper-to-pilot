// Condition detection ("research bridge"): maps free text to concept ids.

import { CONCEPTS } from "../vocab/concepts";
import type { Paper, Question } from "../types";

export function uniq<T>(a: T[]): T[] {
  return a.filter((v, i) => v && a.indexOf(v) === i);
}

/** Lowercase, keep a–z, 0–9 and hyphens, pad with spaces so whole-word lookups work. */
export function norm(t: string | null | undefined): string {
  return " " + String(t ?? "").toLowerCase().replace(/[^a-z0-9-]+/g, " ") + " ";
}

/** Whole-term match on normalised text, allowing an "s" or "es" plural. */
export function hasTerm(n: string, term: string): boolean {
  const t = term.toLowerCase();
  return n.includes(" " + t + " ") || n.includes(" " + t + "s ") || n.includes(" " + t + "es ");
}

export function concepts(text: string): string[] {
  const n = norm(text);
  return CONCEPTS.filter((c) => c.terms.some((t) => hasTerm(n, t))).map((c) => c.id);
}

export function questionText(q: Question): string {
  return [q.question, q.population, (q.tags ?? []).join(" "), q.specialty].join(" ");
}

export function paperText(p: Paper): string {
  const a = p.annot ?? {};
  return [p.title, p.summary, a.claim, a.population].join(" ");
}

/** Concepts found in a paper's text plus those its submitter ticked. */
export function paperConcepts(p: Paper): string[] {
  return uniq(concepts(paperText(p)).concat(p.tagIds ?? []));
}

/** Normalised person name for matching: drops a leading "Dr", keeps letters only. */
export function nameKey(s: string | null | undefined): string {
  return String(s ?? "").toLowerCase().replace(/^dr\.?\s+/, "").replace(/[^a-z]/g, "");
}
