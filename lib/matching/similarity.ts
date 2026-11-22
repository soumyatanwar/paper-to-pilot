// TF-IDF bag-of-words similarity over the whole corpus of questions and papers.

import { STOP_WORDS } from "../vocab/concepts";
import { norm, paperText, questionText } from "./detect";
import type { Paper, Question } from "../types";

export type Idf = Record<string, number>;
export type Vec = Record<string, number>;

export function tokens(t: string): string[] {
  return norm(t).trim().split(/\s+/).filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/** Built from every question and paper; must be rebuilt when the corpus changes. */
export function idfTable(questions: Question[], papers: Paper[]): Idf {
  const docs = questions.map(questionText).concat(papers.map(paperText));
  const N = docs.length;
  const df: Record<string, number> = {};
  for (const d of docs) {
    const seen = new Set<string>();
    for (const w of tokens(d)) {
      if (!seen.has(w)) {
        seen.add(w);
        df[w] = (df[w] ?? 0) + 1;
      }
    }
  }
  const idf: Idf = {};
  for (const w in df) idf[w] = Math.log((N + 1) / (df[w] + 0.5));
  return idf;
}

export function vec(t: string, idf: Idf): Vec {
  const v: Vec = {};
  for (const w of tokens(t)) v[w] = (v[w] ?? 0) + (idf[w] || Math.log(2));
  return v;
}

export function cosine(a: Vec, b: Vec): number {
  let d = 0, na = 0, nb = 0;
  for (const k in a) {
    na += a[k] * a[k];
    if (b[k]) d += a[k] * b[k];
  }
  for (const k in b) nb += b[k] * b[k];
  return na && nb ? d / Math.sqrt(na * nb) : 0;
}
