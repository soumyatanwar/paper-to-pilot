// Match score between a clinician question and a paper (0–100).
// 45% condition fit, 25% text similarity, 15% setting, 10% evidence stage, 5% endorsements.

import { CONCEPT_MAP, STAGES } from "../vocab/concepts";
import { concepts, paperConcepts, paperText, questionText } from "./detect";
import { cosine, vec, type Idf } from "./similarity";
import type { Paper, Question } from "../types";

export const MATCH_WEIGHTS = { concept: 0.45, text: 0.25, setting: 0.15, ready: 0.1, endorse: 0.05 } as const;

/** Results at or above this score are highlighted (top 3 from a question, top 2 from a paper). */
export const HIGHLIGHT_THRESHOLD = 45;

export interface MatchResult {
  score: number;
  /** Concept ids both sides share */
  shared: string[];
  /** Therapeutic areas both touch without a shared concept in them */
  taOnly: string[];
  settingFit: boolean;
  parts: { concept: number; text: number; setting: number; ready: number; endorse: number };
}

export function matchPair(q: Question, p: Paper, idf: Idf): MatchResult {
  const qc = concepts(questionText(q));
  const pc = paperConcepts(p);
  const shared = qc.filter((c) => pc.includes(c));

  const qta: Record<string, 1> = {};
  const pta: Record<string, 1> = {};
  qc.forEach((c) => (qta[CONCEPT_MAP[c].ta] = 1));
  pc.forEach((c) => (pta[CONCEPT_MAP[c].ta] = 1));
  const taOnly = Object.keys(qta).filter((t) => pta[t] && !shared.some((c) => CONCEPT_MAP[c].ta === t));

  const concept = qc.length ? Math.min(1, (shared.length + 0.4 * taOnly.length) / Math.min(qc.length, 3)) : 0;
  const text = Math.min(1, cosine(vec(questionText(q), idf), vec(paperText(p), idf)) * 2.2);
  const setting = (p.settings ?? []).includes(q.setting) ? 1 : 0.3;
  const ready = STAGES[p.stage as keyof typeof STAGES] || 0.5;
  const endorse = Math.min((p.endorsements ?? []).length, 2) / 2;

  const W = MATCH_WEIGHTS;
  const score = Math.round(100 * (W.concept * concept + W.text * text + W.setting * setting + W.ready * ready + W.endorse * endorse));
  return { score, shared, taOnly, settingFit: setting === 1, parts: { concept, text, setting, ready, endorse } };
}
