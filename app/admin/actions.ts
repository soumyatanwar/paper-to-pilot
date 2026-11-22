"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { findDuplicates } from "@/lib/dedupe";
import { parseDoctorCsv } from "@/lib/import/csv";
import { nameKey } from "@/lib/matching/detect";
import { toDoctor } from "@/lib/data";
import {
  checkAdminPassword, clearAdminSession, isAdmin, overRateLimit, RATE_LIMIT_MESSAGE, setAdminSession,
} from "@/lib/server/session";

async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin");
}

export async function login(_: { error?: string }, fd: FormData): Promise<{ error?: string }> {
  if (await overRateLimit()) return { error: RATE_LIMIT_MESSAGE };
  if (!checkAdminPassword(String(fd.get("password") ?? ""))) return { error: "That password is not right." };
  await setAdminSession();
  redirect("/admin");
}

export async function logout() {
  await clearAdminSession();
  redirect("/admin");
}

export type RecordKind = "question" | "paper" | "nomination";
type Visibility = "PUBLIC" | "NEEDS_REVIEW" | "HIDDEN";

export async function setVisibility(kind: RecordKind, id: string, visibility: Visibility) {
  await requireAdmin();
  const data = { visibility };
  if (kind === "question") await db.question.update({ where: { id }, data });
  else if (kind === "paper") await db.paper.update({ where: { id }, data });
  else await db.nomination.update({ where: { id }, data });
  revalidatePath("/", "layout");
}

export interface ImportState { n: number; message?: string; error?: string }

export async function importCsv(prev: ImportState, fd: FormData): Promise<ImportState> {
  await requireAdmin();
  const n = prev.n + 1;
  const parsed = parseDoctorCsv(String(fd.get("csv") ?? ""));
  if (!parsed.ok) return { n, error: parsed.error };

  let added = 0, merged = 0;
  for (const row of parsed.rows) {
    const key = nameKey(row.name);
    const data = {
      name: row.name, nameKey: key, specialty: row.specialty || null, city: row.city || null, years: row.years ?? 0,
      clinic: row.clinic || null, hospitals: row.hospitals ?? [], pubs: row.pubs ?? 0, trials: row.trials ?? 0,
      teaching: !!row.teaching, reviews: row.reviews ?? 0, interests: row.interests || null, url: row.url || null, verified: true,
    };
    // A patient-added, unverified doctor with the same name is completed rather than duplicated.
    const pending = await db.doctor.findFirst({ where: { nameKey: key, nominated: true, verified: false } });
    if (pending) {
      await db.doctor.update({ where: { id: pending.id }, data });
      merged++;
    } else {
      await db.doctor.create({ data });
      added++;
    }
  }
  const dupes = findDuplicates((await db.doctor.findMany()).map(toDoctor)).length;
  revalidatePath("/", "layout");
  return {
    n,
    message:
      `Imported ${added} doctor${added === 1 ? "" : "s"}` +
      (merged ? `, and completed ${merged} patient-nominated profile${merged > 1 ? "s" : ""}` : "") +
      "." + (dupes ? ` ${dupes} likely duplicate pair${dupes > 1 ? "s" : ""} to review below.` : ""),
  };
}

export async function verifyDoctor(id: string) {
  await requireAdmin();
  await db.doctor.update({ where: { id }, data: { verified: true } });
  revalidatePath("/", "layout");
}

/**
 * Folds `dropId` into `keepId`: moves nominations and endorsements (skipping ones the kept
 * profile already has), fills the kept profile's empty fields, then deletes the duplicate.
 */
export async function mergeDoctors(keepId: string, dropId: string) {
  await requireAdmin();
  if (keepId === dropId) return;
  await db.$transaction(async (tx) => {
    const [keep, drop] = await Promise.all([tx.doctor.findUnique({ where: { id: keepId } }), tx.doctor.findUnique({ where: { id: dropId } })]);
    if (!keep || !drop) return;

    const keptVoters = new Set((await tx.nomination.findMany({ where: { doctorId: keepId }, select: { voterKey: true } })).map((n) => n.voterKey));
    for (const nom of await tx.nomination.findMany({ where: { doctorId: dropId } })) {
      if (nom.voterKey && keptVoters.has(nom.voterKey)) await tx.nomination.delete({ where: { id: nom.id } });
      else await tx.nomination.update({ where: { id: nom.id }, data: { doctorId: keepId } });
    }
    const keptPapers = new Set((await tx.endorsement.findMany({ where: { doctorId: keepId } })).map((e) => e.paperId));
    for (const e of await tx.endorsement.findMany({ where: { doctorId: dropId } })) {
      if (!keptPapers.has(e.paperId)) await tx.endorsement.create({ data: { paperId: e.paperId, doctorId: keepId, createdAt: e.createdAt } });
    }

    await tx.doctor.update({
      where: { id: keepId },
      data: {
        specialty: keep.specialty || drop.specialty,
        city: keep.city || drop.city,
        years: Math.max(keep.years, drop.years),
        clinic: keep.clinic || drop.clinic,
        hospitals: [...new Set([...keep.hospitals, ...drop.hospitals])],
        pubs: Math.max(keep.pubs, drop.pubs),
        trials: Math.max(keep.trials, drop.trials),
        teaching: keep.teaching || drop.teaching,
        reviews: Math.max(keep.reviews, drop.reviews),
        interests: keep.interests || drop.interests,
        url: keep.url || drop.url,
        verified: keep.verified || drop.verified,
        nominated: keep.nominated && drop.nominated,
      },
    });
    await tx.doctor.delete({ where: { id: dropId } });
  });
  revalidatePath("/", "layout");
}
