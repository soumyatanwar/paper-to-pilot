// Server-side validation for every form. Checks and messages follow the prototype, in the same order.
// Pure: takes plain field values, returns either an error message or cleaned data.

import { CONCEPTS, NEEDS, ROLES, SETTINGS, STAGES, TRUST_REASONS } from "./vocab/concepts";
import { concepts } from "./matching/detect";
import { phiProblems } from "./safety/phi";

export const PAPER_KINDS = ["Device", "Diagnostic", "Software", "Protocol"];
export const SINCE = ["Under 1 year", "1–3 years", "3+ years"];
export const NOMINATOR = ["Patient", "Family caregiver"];
export const NOTE_MAX = 300;

/** Generous caps so one post can't flood the page. */
const MAX = { short: 120, text: 4000 };

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const s = (v: unknown, max = MAX.short) => String(v ?? "").trim().slice(0, max);
const oneOf = (v: string, list: readonly string[], fallback: string) => (list.includes(v) ? v : fallback);
const pick = (vals: unknown, list: readonly string[]) =>
  (Array.isArray(vals) ? vals : []).map((x) => String(x)).filter((x, i, a) => list.includes(x) && a.indexOf(x) === i);

export interface QuestionInput {
  author: string; specialty: string; city: string; question: string; population: string;
  setting: string; volume: string; tags: string;
}

export function validateQuestion(f: QuestionInput) {
  const author = s(f.author), question = s(f.question, MAX.text), population = s(f.population, MAX.text);
  if (!author || !question) return { ok: false, error: "Add your name and your question before posting." } as const;
  const probs = phiProblems(question + " " + population);
  if (probs.length) return { ok: false, error: "Remove patient identifiers before posting. Found: " + probs.join(", ") + "." } as const;
  return {
    ok: true,
    data: {
      author,
      specialty: s(f.specialty) || "General Medicine",
      city: s(f.city) || null,
      setting: oneOf(s(f.setting), SETTINGS, "Clinic / OPD"),
      volume: Math.max(0, Math.min(1_000_000, Math.floor(+s(f.volume) || 0))),
      question,
      population: population || null,
      tags: s(f.tags, 300).split(",").map((t) => t.trim()).filter(Boolean).slice(0, 10),
    },
  } as const;
}

export interface PaperInput {
  role: string; name: string; title: string; source: string; kind: string; stage: string; summary: string;
  conceptIds: string[]; settings: string[]; claim: string; population: string; needs: string[]; limits: string; rights: boolean;
}

export function validatePaper(f: PaperInput) {
  const name = s(f.name), title = s(f.title, 300), summary = s(f.summary, MAX.text), source = s(f.source, 500);
  const conceptIds = pick(f.conceptIds, CONCEPTS.map((c) => c.id));
  const settings = pick(f.settings, SETTINGS);
  const needs = pick(f.needs, NEEDS);
  const claim = s(f.claim, 300), population = s(f.population, 300), limits = s(f.limits, MAX.text);

  const err =
    !name || !title || !summary ? "Add your name, a title and the abstract or summary." :
    source && !/^https?:\/\//.test(source) ? "The source link must start with http:// or https://." :
    !conceptIds.length && !concepts(title + " " + summary).length ? "Tick at least one condition it targets, so it can be matched." :
    !settings.length ? "Pick at least one setting where it works." :
    !f.rights ? "Confirm you wrote this summary or have permission to share it." : "";
  if (err) return { ok: false, error: err } as const;
  const ph = phiProblems([summary, claim, population, limits].join(" "));
  if (ph.length) return { ok: false, error: "Remove patient identifiers first. Found: " + ph.join(", ") + "." } as const;

  return {
    ok: true,
    data: {
      role: oneOf(s(f.role), ROLES, "Inventor"),
      submitter: name, title, source: source || null,
      kind: oneOf(s(f.kind), PAPER_KINDS, "Device"),
      stage: oneOf(s(f.stage), Object.keys(STAGES), "Pilot data"),
      summary, conceptIds, settings, needs,
      claim: claim || null, population: population || null, limits: limits || null, rightsConfirmed: true,
    },
  } as const;
}

export interface NominationInput {
  doctorId: string; newName: string; newSpecialty: string; newCity: string; newClinic: string;
  reasons: string[]; since: string; by: string; area: string; note: string; consent: boolean;
}

export const NEW_DOCTOR = "__new";

export function validateNomination(f: NominationInput) {
  const doctorId = s(f.doctorId, 64), newName = s(f.newName), reasons = pick(f.reasons, TRUST_REASONS);
  const note = s(f.note, MAX.text), clinic = s(f.newClinic, 200);
  const err =
    !doctorId ? "Choose your doctor, or pick 'My doctor is not on this list'." :
    doctorId === NEW_DOCTOR && !newName ? "Add your doctor's name." :
    !reasons.length ? "Pick at least one reason you trust them." :
    !f.consent ? "Tick the box to confirm you understand who can see this." :
    note.length > NOTE_MAX ? `Keep your note under ${NOTE_MAX} characters.` : "";
  if (err) return { ok: false, error: err } as const;
  const ph = phiProblems(note + " " + clinic);
  if (ph.length) return { ok: false, error: "Please remove personal details from your note. Found: " + ph.join(", ") + "." } as const;
  return {
    ok: true,
    data: {
      doctorId,
      newDoctor: doctorId === NEW_DOCTOR
        ? { name: /^dr/i.test(newName) ? newName : "Dr. " + newName, specialty: s(f.newSpecialty) || null, city: s(f.newCity) || null, clinic: clinic || null }
        : null,
      reasons,
      since: oneOf(s(f.since), SINCE, "1–3 years"),
      by: oneOf(s(f.by), NOMINATOR, "Patient"),
      area: s(f.area) || null,
      note: note || null,
    },
  } as const;
}
