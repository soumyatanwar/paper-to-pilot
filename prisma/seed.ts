// Seeds the prototype's sample data (illustrative only, not real people or products).
// Safe to re-run: removes previous sample rows first. Do not run in production.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import { nameKey } from "../lib/matching/detect";
import sample from "../tests/golden/sample-state.json";
import type { Exchange } from "../lib/types";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const s = sample as unknown as Exchange;

// Spread createdAt so "newest first" ordering is stable and matches the prototype's dates.
const at = (date: string | undefined, i: number) => new Date(new Date(date ?? "2026-11-01").getTime() + i * 1000);

async function main() {
  await db.$transaction([
    db.nomination.deleteMany({ where: { isSample: true } }),
    db.endorsement.deleteMany({ where: { paper: { isSample: true } } }),
    db.paper.deleteMany({ where: { isSample: true } }),
    db.question.deleteMany({ where: { isSample: true } }),
    db.doctor.deleteMany({ where: { isSample: true } }),
  ]);

  await db.doctor.createMany({
    data: s.doctors.map((d, i) => ({
      id: d.id, name: d.name, nameKey: nameKey(d.name), specialty: d.specialty, city: d.city, years: d.years ?? 0,
      clinic: d.clinic || null, hospitals: d.hospitals ?? [], pubs: d.pubs ?? 0, trials: d.trials ?? 0,
      teaching: !!d.teaching, reviews: d.reviews ?? 0, interests: d.interests || null, url: d.url || null,
      verified: true, isSample: true, createdAt: at("2026-11-01", i),
    })),
  });
  await db.question.createMany({
    data: s.questions.map((q, i) => ({
      id: q.id, author: q.author, specialty: q.specialty, city: q.city || null, setting: q.setting, volume: q.volume ?? 0,
      question: q.question, population: q.population || null, tags: q.tags ?? [], seedVotes: q.votes ?? 0,
      isSample: true, createdAt: at(q.created, i),
    })),
  });
  // Prototype lists papers newest-first in array order, so the first gets the latest timestamp.
  await db.paper.createMany({
    data: s.inventions.map((p, i) => ({
      id: p.id, title: p.title, kind: p.kind, stage: p.stage, settings: p.settings ?? [], summary: p.summary,
      source: p.source || null, role: p.role ?? null, submitter: p.submitter ?? null, conceptIds: p.tagIds ?? [],
      claim: p.annot?.claim || null, population: p.annot?.population || null, needs: p.annot?.needs ?? [],
      limits: p.annot?.limits || null, rightsConfirmed: true, isSample: true, createdAt: at("2026-11-01", s.inventions.length - i),
    })),
  });
  await db.endorsement.createMany({
    data: s.inventions.flatMap((p) => (p.endorsements ?? []).map((doctorId, i) => ({ paperId: p.id, doctorId, createdAt: at("2026-11-01", i) }))),
  });
  await db.nomination.createMany({
    data: s.nominations.map((n, i) => ({
      id: n.id, doctorId: n.doctorId, by: n.by, reasons: n.reasons ?? [], area: n.area || null, since: n.since || null,
      note: n.note || null, isSample: true, createdAt: at(n.created, i),
    })),
  });
  console.log(`Seeded ${s.doctors.length} doctors, ${s.questions.length} questions, ${s.inventions.length} papers, ${s.nominations.length} nominations.`);
}

main().finally(() => db.$disconnect());
