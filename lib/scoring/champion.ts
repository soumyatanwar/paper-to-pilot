// Champion score (0–100): how likely a doctor is to champion and run a pilot.

import { CONCEPT_MAP, OPEN_TO_NEW } from "../vocab/concepts";
import { concepts, nameKey } from "../matching/detect";
import type { Doctor, Exchange, Nomination, Paper } from "../types";

/** [label, points earned, points available] */
export type ScorePart = [string, number, number];

export interface ChampionScore {
  total: number;
  parts: ScorePart[];
  /** Own clinic and at least one hospital consultancy */
  dual: boolean;
  posts: number;
  endorsed: number;
  submitted: number;
  noms: Nomination[];
}

export function nominationsFor(ex: Pick<Exchange, "nominations">, d: Doctor): Nomination[] {
  return ex.nominations.filter((n) => n.doctorId === d.id);
}

export function champion(ex: Exchange, d: Doctor): ChampionScore {
  const hasClinic = !!(d.clinic && d.clinic.trim());
  const hasHosp = (d.hospitals ?? []).length > 0;
  const dual = hasClinic && hasHosp ? 20 : hasClinic ? 8 : hasHosp ? 4 : 0;
  const research = (Math.min(+(d.pubs ?? 0) || 0, 8) / 8) * 10;
  const trials = (Math.min(+(d.trials ?? 0) || 0, 3) / 3) * 15;

  const key = nameKey(d.name);
  const posts = ex.questions.filter((q) => nameKey(q.author) === key).length;
  const endorsed = ex.inventions.filter((i) => (i.endorsements ?? []).includes(d.id)).length;
  const submitted = ex.inventions.filter((i) => i.role === "Doctor" && nameKey(i.submitter) === key).length;
  const board = Math.min(posts * 8 + endorsed * 5 + submitted * 8, 15);

  const noms = nominationsFor(ex, d);
  const open = noms.filter((n) => (n.reasons ?? []).includes(OPEN_TO_NEW)).length;
  const trust = Math.min(noms.length * 4 + open * 2, 15);

  const curiosity = (d.interests && d.interests.trim() ? 5 : 0) + (d.teaching ? 5 : 0);
  const reach = Math.min(1, Math.log10(1 + (+(d.reviews ?? 0) || 0)) / Math.log10(501)) * 5;
  const y = +(d.years ?? 0) || 0;
  const exp = !y ? 0 : y >= 8 && y <= 25 ? 10 : (y >= 5 && y < 8) || (y > 25 && y <= 32) ? 6 : 3;

  const parts: ScorePart[] = [
    ["Clinic + hospital", dual, 20],
    ["Trial experience", trials, 15],
    ["Activity on exchange", board, 15],
    ["Patient trust", trust, 15],
    ["Publications", research, 10],
    ["Interests & teaching", curiosity, 10],
    ["Career stage", exp, 10],
    ["Patient reach", reach, 5],
  ];
  const total = Math.round(parts.reduce((s, p) => s + p[1], 0));
  return { total, parts, dual: hasClinic && hasHosp, posts, endorsed, submitted, noms };
}

export interface RelevantChampion {
  d: Doctor;
  c: ChampionScore;
  /** Concept ids in the doctor's stated interests that match */
  hit: string[];
  /** Endorsed the paper being matched */
  end: boolean;
  score: number;
}

/**
 * Doctors whose specialty or interests fit the given concepts (or who endorsed `paper`),
 * ordered: endorsers first, then clinic + hospital, then score.
 */
export function relevantChampions(ex: Exchange, conceptIds: string[], limit = 3, paper?: Paper): RelevantChampion[] {
  const sp = new Set<string>();
  conceptIds.forEach((c) => CONCEPT_MAP[c].sp.forEach((s) => sp.add(s)));
  const out: RelevantChampion[] = [];
  for (const d of ex.doctors) {
    const hit = concepts(d.interests ?? "").filter((c) => conceptIds.includes(c));
    const end = !!paper && (paper.endorsements ?? []).includes(d.id);
    if (!sp.has(d.specialty ?? "") && !hit.length && !end) continue;
    const c = champion(ex, d);
    out.push({ d, c, hit, end, score: Math.round(c.total * 0.75 + (hit.length ? 15 : 0) + (end ? 10 : 0)) });
  }
  return out
    .sort((a, b) => +b.end - +a.end || +b.c.dual - +a.c.dual || b.score - a.score)
    .slice(0, limit || 3);
}

/** Up to three most-given trust reasons, lower-cased, with counts when repeated. */
export function topReasons(noms: Nomination[]): string {
  const c: Record<string, number> = {};
  noms.forEach((n) => (n.reasons ?? []).forEach((r) => (c[r] = (c[r] ?? 0) + 1)));
  return Object.keys(c)
    .sort((a, b) => c[b] - c[a])
    .slice(0, 3)
    .map((r) => r.toLowerCase() + (c[r] > 1 ? " (" + c[r] + ")" : ""))
    .join(", ");
}
