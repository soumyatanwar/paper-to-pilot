// Loads database rows and maps them to the plain shapes the scoring code in lib/ uses.
import "server-only";
import { db } from "./db";
import type { Doctor, Exchange, Nomination, Paper, Question } from "./types";

export interface ExchangeData extends Exchange {
  /** Question ids this browser has voted on */
  myVotes: Set<string>;
}

type DoctorRow = Awaited<ReturnType<typeof db.doctor.findMany>>[number];

export function toDoctor(d: DoctorRow): Doctor {
  return {
    id: d.id,
    name: d.name,
    specialty: d.specialty ?? "",
    city: d.city ?? "",
    years: d.years,
    clinic: d.clinic ?? "",
    hospitals: d.hospitals,
    pubs: d.pubs,
    trials: d.trials,
    teaching: d.teaching,
    reviews: d.reviews,
    interests: d.interests ?? "",
    url: d.url ?? "",
    nominated: d.nominated,
    verified: d.verified,
    sample: d.isSample,
  };
}

/** Everything public, ready for scoring. Hidden and in-review records are left out. */
export async function getExchange(voterKey?: string): Promise<ExchangeData> {
  const [questions, papers, doctors, nominations, myVotes] = await Promise.all([
    db.question.findMany({ where: { visibility: "PUBLIC" }, include: { _count: { select: { votes: true } } }, orderBy: { createdAt: "desc" } }),
    db.paper.findMany({ where: { visibility: "PUBLIC" }, include: { endorsements: { orderBy: { createdAt: "asc" } } }, orderBy: { createdAt: "desc" } }),
    db.doctor.findMany({ orderBy: { createdAt: "asc" } }),
    db.nomination.findMany({ where: { visibility: "PUBLIC" }, orderBy: { createdAt: "asc" } }),
    voterKey ? db.questionVote.findMany({ where: { voterKey }, select: { questionId: true } }) : Promise.resolve([]),
  ]);

  return {
    questions: questions.map(
      (q): Question => ({
        id: q.id,
        author: q.author,
        specialty: q.specialty,
        city: q.city ?? "",
        setting: q.setting,
        volume: q.volume,
        question: q.question,
        population: q.population ?? "",
        tags: q.tags,
        votes: q.seedVotes + q._count.votes,
        created: q.createdAt.toISOString().slice(0, 10),
        sample: q.isSample,
      }),
    ),
    inventions: papers.map(
      (p): Paper => ({
        id: p.id,
        title: p.title,
        kind: p.kind,
        stage: p.stage,
        settings: p.settings,
        summary: p.summary,
        source: p.source ?? "",
        role: p.role ?? undefined,
        submitter: p.submitter ?? undefined,
        tagIds: p.conceptIds,
        annot: { claim: p.claim ?? "", population: p.population ?? "", needs: p.needs, limits: p.limits ?? "" },
        endorsements: p.endorsements.map((e) => e.doctorId),
        created: p.createdAt.toISOString().slice(0, 10),
        sample: p.isSample,
      }),
    ),
    doctors: doctors.map(toDoctor),
    nominations: nominations.map(
      (n): Nomination => ({
        id: n.id,
        doctorId: n.doctorId,
        by: n.by,
        reasons: n.reasons,
        area: n.area ?? "",
        since: n.since ?? "",
        note: n.note ?? "",
        created: n.createdAt.toISOString().slice(0, 10),
      }),
    ),
    myVotes: new Set(myVotes.map((v) => v.questionId)),
  };
}
