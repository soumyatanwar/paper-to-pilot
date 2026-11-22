// Doctor-profile CSV import, as in the prototype's Champions tab.
// Header row required; needs at least `name` and `specialty`. Hospitals are ";"-separated.

import { nameKey } from "../matching/detect";
import type { Doctor } from "../types";

export const CSV_TEMPLATE =
  "name,specialty,city,years,clinic,hospitals,publications,trials,teaching,reviews,interests,profile_url\n" +
  "Dr. A Example,Cardiology,Pune,12,Example Heart Clinic,City Hospital;Metro Hospital,4,1,yes,300,heart failure,https://…";

/** One CSV line → trimmed cells. Handles quoted commas and "" escapes. */
export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export type DoctorFields = Omit<Doctor, "id">;

export type ParseResult = { ok: true; rows: DoctorFields[] } | { ok: false; error: string };

export function parseDoctorCsv(text: string): ParseResult {
  const lines = String(text ?? "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { ok: false, error: "Paste a header row and at least one doctor." };
  const h = parseCsvLine(lines[0]).map((s) => s.toLowerCase());
  if (!h.includes("name") || !h.includes("specialty"))
    return { ok: false, error: "The header needs at least name and specialty columns." };

  const rows: DoctorFields[] = [];
  for (const l of lines.slice(1)) {
    const c = parseCsvLine(l);
    const r: Record<string, string> = {};
    h.forEach((k, i) => (r[k] = c[i] || ""));
    if (!r.name) continue;
    rows.push({
      name: r.name,
      specialty: r.specialty,
      city: r.city,
      years: +r.years || 0,
      clinic: r.clinic,
      hospitals: (r.hospitals || "").split(";").map((s) => s.trim()).filter(Boolean),
      pubs: +r.publications || 0,
      trials: +r.trials || 0,
      teaching: /^(y|yes|true|1)$/i.test(r.teaching || ""),
      reviews: +r.reviews || 0,
      interests: r.interests,
      url: /^https?:\/\//.test(r.profile_url || "") ? r.profile_url : "",
    });
  }
  return { ok: true, rows };
}

export interface MergeResult {
  doctors: Doctor[];
  added: number;
  /** Patient-nominated, unverified profiles completed by the import */
  merged: number;
}

/**
 * Apply parsed rows: a row whose name matches an unverified patient-nominated doctor
 * fills that profile and marks it verified; otherwise a new doctor is added.
 * Pure: returns a new array and leaves the input untouched.
 */
export function mergeDoctors(existing: Doctor[], rows: DoctorFields[], newId: () => string): MergeResult {
  const doctors = existing.map((d) => ({ ...d }));
  let added = 0;
  let merged = 0;
  for (const row of rows) {
    const k = nameKey(row.name);
    const ex = k ? doctors.find((d) => nameKey(d.name) === k) : undefined;
    if (ex && ex.nominated && !ex.verified) {
      Object.assign(ex, row, { verified: true });
      merged++;
    } else {
      doctors.push({ ...row, id: newId() });
      added++;
    }
  }
  return { doctors, added, merged };
}

export function importSummary(r: Pick<MergeResult, "added" | "merged">): string {
  return (
    "Imported " + r.added + " doctor" + (r.added === 1 ? "" : "s") +
    (r.merged ? ", and completed " + r.merged + " patient-nominated profile" + (r.merged > 1 ? "s" : "") : "") + "."
  );
}
