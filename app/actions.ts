"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { nameKey } from "@/lib/matching/detect";
import { reviewReasons } from "@/lib/safety/review";
import { overRateLimit, RATE_LIMIT_MESSAGE, voterKey } from "@/lib/server/session";
import { NEW_DOCTOR, validateNomination, validatePaper, validateQuestion } from "@/lib/validate";
import { Prisma } from "@/lib/generated/prisma/client";

export type FieldValues = Record<string, string | string[] | boolean>;

export interface FormState {
  /** Bumped on every submit so the form can remount with `values` as defaults. */
  n: number;
  ok?: string;
  error?: string;
  /** What the user typed, returned on error so nothing is lost. */
  values?: FieldValues;
}

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");
const all = (fd: FormData, k: string) => fd.getAll(k).map(String);
const on = (fd: FormData, k: string) => fd.get(k) === "on";

function snapshot(fd: FormData): FieldValues {
  const v: FieldValues = {};
  for (const k of new Set(fd.keys())) {
    if (k.startsWith("$")) continue; // React internals
    const vals = fd.getAll(k).map(String);
    v[k] = vals.length > 1 || k.endsWith("[]") ? vals : vals[0];
  }
  return v;
}

const fail = (prev: FormState, fd: FormData, error: string): FormState => ({ n: prev.n + 1, error, values: snapshot(fd) });

const REVIEW_NOTE = "It will appear once a moderator has checked it, because it mentions ";

// ---------- Questions ----------

export async function postQuestion(prev: FormState, fd: FormData): Promise<FormState> {
  const r = validateQuestion({
    author: str(fd, "author"), specialty: str(fd, "specialty"), city: str(fd, "city"), question: str(fd, "question"),
    population: str(fd, "population"), setting: str(fd, "setting"), volume: str(fd, "volume"), tags: str(fd, "tags"),
  });
  if (!r.ok) return fail(prev, fd, r.error);
  if (await overRateLimit()) return fail(prev, fd, RATE_LIMIT_MESSAGE);
  const review = reviewReasons(r.data.question + " " + (r.data.population ?? ""));
  await db.question.create({ data: { ...r.data, visibility: review.length ? "NEEDS_REVIEW" : "PUBLIC" } });
  revalidatePath("/", "layout");
  return { n: prev.n + 1, ok: review.length ? "Thanks, your question is saved. " + REVIEW_NOTE + review.join(" and ") + "." : "Your question is posted." };
}

/** "I see this too": toggles this browser's vote. */
export async function toggleVote(questionId: string): Promise<{ error?: string }> {
  const q = await db.question.findFirst({ where: { id: questionId, visibility: "PUBLIC" }, select: { id: true } });
  if (!q) return { error: "That question is no longer available." };
  const voter = await voterKey();
  const key = { questionId_voterKey: { questionId, voterKey: voter } };
  const existing = await db.questionVote.findUnique({ where: key });
  if (existing) await db.questionVote.delete({ where: key });
  else {
    if (await overRateLimit()) return { error: RATE_LIMIT_MESSAGE };
    await db.questionVote.create({ data: { questionId, voterKey: voter } }).catch(ignoreDuplicate);
  }
  revalidatePath("/", "layout");
  return {};
}

// ---------- Papers ----------

export async function submitPaper(prev: FormState, fd: FormData): Promise<FormState> {
  const r = validatePaper({
    role: str(fd, "role"), name: str(fd, "name"), title: str(fd, "title"), source: str(fd, "source"), kind: str(fd, "kind"),
    stage: str(fd, "stage"), summary: str(fd, "summary"), conceptIds: all(fd, "concepts[]"), settings: all(fd, "settings[]"),
    claim: str(fd, "claim"), population: str(fd, "population"), needs: all(fd, "needs[]"), limits: str(fd, "limits"), rights: on(fd, "rights"),
  });
  if (!r.ok) return fail(prev, fd, r.error);
  if (await overRateLimit()) return fail(prev, fd, RATE_LIMIT_MESSAGE);

  // Until sign-in exists, a doctor's submission links to the profile with the same name (as in the prototype).
  const me = r.data.role === "Doctor" ? await db.doctor.findFirst({ where: { nameKey: nameKey(r.data.submitter) } }) : null;
  const review = reviewReasons([r.data.summary, r.data.claim, r.data.population, r.data.limits].join(" "));
  await db.paper.create({
    data: { ...r.data, visibility: review.length ? "NEEDS_REVIEW" : "PUBLIC", endorsements: me ? { create: { doctorId: me.id } } : undefined },
  });
  revalidatePath("/", "layout");
  const ok =
    "Added. " +
    (me ? "It counts as your endorsement. " : r.data.role === "Doctor" ? "Your name did not match a doctor profile, so no endorsement was linked. " : "") +
    (review.length ? REVIEW_NOTE + review.join(" and ") + "." : "Use See matches on its card to find questions and doctors.");
  return { n: prev.n + 1, ok };
}

export interface EndorseState { n: number; message?: string }

export async function endorse(paperId: string, prev: EndorseState, fd: FormData): Promise<EndorseState> {
  const doctorId = str(fd, "doctorId");
  const n = prev.n + 1;
  if (!doctorId) return { n, message: "Choose who is endorsing first." };
  const [paper, doctor] = await Promise.all([
    db.paper.findFirst({ where: { id: paperId, visibility: "PUBLIC" }, select: { id: true } }),
    db.doctor.findUnique({ where: { id: doctorId }, select: { id: true } }),
  ]);
  if (!paper || !doctor) return { n, message: "That paper or doctor is no longer available." };
  if (await overRateLimit()) return { n, message: RATE_LIMIT_MESSAGE };
  try {
    await db.endorsement.create({ data: { paperId, doctorId } });
  } catch (e) {
    if (isDuplicate(e)) return { n, message: "Already endorsed by this doctor." };
    throw e;
  }
  revalidatePath("/", "layout");
  return { n, message: "Endorsement added." };
}

// ---------- Nominations ----------

export async function nominate(prev: FormState, fd: FormData): Promise<FormState> {
  const r = validateNomination({
    doctorId: str(fd, "doctorId"), newName: str(fd, "newName"), newSpecialty: str(fd, "newSpecialty"), newCity: str(fd, "newCity"),
    newClinic: str(fd, "newClinic"), reasons: all(fd, "reasons[]"), since: str(fd, "since"), by: str(fd, "by"),
    area: str(fd, "area"), note: str(fd, "note"), consent: on(fd, "consent"),
  });
  if (!r.ok) return fail(prev, fd, r.error);

  let doctor = r.data.newDoctor
    ? await db.doctor.findFirst({ where: { nameKey: nameKey(r.data.newDoctor.name) } })
    : await db.doctor.findUnique({ where: { id: r.data.doctorId } });
  if (!doctor && r.data.doctorId !== NEW_DOCTOR) return fail(prev, fd, "That doctor is no longer on the list. Please choose again.");

  const voter = await voterKey();
  if (doctor && (await db.nomination.findUnique({ where: { doctorId_voterKey: { doctorId: doctor.id, voterKey: voter } } })))
    return fail(prev, fd, `You have already nominated ${doctor.name}. Thank you.`);
  if (await overRateLimit()) return fail(prev, fd, RATE_LIMIT_MESSAGE);

  if (!doctor && r.data.newDoctor) {
    doctor = await db.doctor.create({
      data: { ...r.data.newDoctor, nameKey: nameKey(r.data.newDoctor.name), hospitals: [], nominated: true, verified: false },
    });
  }
  const review = reviewReasons(r.data.note ?? "");
  await db.nomination.create({
    data: {
      doctorId: doctor!.id, by: r.data.by, reasons: r.data.reasons, area: r.data.area, since: r.data.since, note: r.data.note,
      voterKey: voter, visibility: review.length ? "NEEDS_REVIEW" : "PUBLIC",
    },
  });
  revalidatePath("/", "layout");
  return { n: prev.n + 1, ok: `Thank you. Your nomination for ${doctor!.name} has been added.` };
}

// ---------- helpers ----------

function isDuplicate(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}
function ignoreDuplicate(e: unknown) {
  if (!isDuplicate(e)) throw e;
}
