import { describe, expect, it } from "vitest";
import { concepts, hasTerm, nameKey, norm } from "@/lib/matching/detect";
import { cosine, idfTable, vec } from "@/lib/matching/similarity";
import { matchPair } from "@/lib/matching/match";
import { champion, relevantChampions, topReasons } from "@/lib/scoring/champion";
import { phiProblems } from "@/lib/safety/phi";
import { importSummary, mergeDoctors, parseDoctorCsv } from "@/lib/import/csv";
import type { Doctor, Exchange, Paper, Question } from "@/lib/types";

const empty: Exchange = { questions: [], inventions: [], doctors: [], nominations: [] };

describe("concept detection", () => {
  it("matches whole terms and simple plurals", () => {
    expect(hasTerm(norm("two foot ulcers"), "foot ulcer")).toBe(true);
    expect(hasTerm(norm("diabetes camps"), "camp")).toBe(true);
    expect(hasTerm(norm("bypass"), "bp")).toBe(false);
  });
  it("keeps hyphenated terms", () => {
    expect(concepts("a needle-free point-of-care test")).toEqual(["screen"]);
  });
  it("returns nothing for unrelated text", () => {
    expect(concepts("billing software for receptionists")).toEqual([]);
  });
});

describe("name keys", () => {
  it("ignores the Dr prefix, case and punctuation", () => {
    expect(nameKey("Dr. Kavya Iyer")).toBe(nameKey("kavya iyer"));
    expect(nameKey("Dr Kavya Iyer")).toBe("kavyaiyer");
  });
  it("does not treat initials as the same person (known gap)", () => {
    expect(nameKey("Dr. K. Iyer")).not.toBe(nameKey("Dr. Kavya Iyer"));
  });
});

describe("similarity", () => {
  it("is 0 for empty vectors and 1 for identical text", () => {
    expect(cosine({}, { a: 1 })).toBe(0);
    const idf = idfTable([], []);
    expect(cosine(vec("heart failure readmission", idf), vec("heart failure readmission", idf))).toBeCloseTo(1);
  });
});

describe("matchPair edge cases", () => {
  const q: Question = { id: "q", author: "A", specialty: "", setting: "Home", question: "billing questions" };
  const p: Paper = { id: "p", title: "Thing", kind: "Device", stage: "Unknown", summary: "Something", settings: ["Clinic / OPD"] };
  it("gives no condition credit when the question has no concepts, and defaults unknown stages to 0.5", () => {
    const m = matchPair(q, p, idfTable([q], [p]));
    expect(m.parts.concept).toBe(0);
    expect(m.parts.ready).toBe(0.5);
    expect(m.parts.setting).toBe(0.3);
    expect(m.settingFit).toBe(false);
  });
});

describe("champion score", () => {
  const base: Doctor = { id: "d", name: "Dr. Zero" };
  it("is 0 for an empty profile", () => {
    expect(champion(empty, base).total).toBe(0);
  });
  it("caps patient trust at 15", () => {
    const noms = Array.from({ length: 5 }, (_, i) => ({ id: "n" + i, doctorId: "d", by: "Patient", reasons: ["Open to new treatments or tools"] }));
    const c = champion({ ...empty, nominations: noms }, base);
    expect(c.parts.find((x) => x[0] === "Patient trust")![1]).toBe(15);
  });
  it("scores career stage by bands", () => {
    const stage = (years: number) => champion(empty, { ...base, years }).parts.find((x) => x[0] === "Career stage")![1];
    expect([0, 3, 6, 12, 28, 40].map(stage)).toEqual([0, 3, 6, 10, 6, 3]);
  });
  it("only counts dual practice with both a clinic and a hospital", () => {
    expect(champion(empty, { ...base, clinic: "  " , hospitals: ["H"] }).dual).toBe(false);
    expect(champion(empty, { ...base, clinic: "C", hospitals: ["H"] }).dual).toBe(true);
  });
  it("lists endorsers first among relevant champions", () => {
    const docs: Doctor[] = [
      { id: "a", name: "A", specialty: "Cardiology", clinic: "C", hospitals: ["H"], trials: 3, pubs: 8 },
      { id: "b", name: "B", specialty: "Dermatology" },
    ];
    const paper: Paper = { id: "p", title: "", kind: "", stage: "", summary: "", endorsements: ["b"] };
    const r = relevantChampions({ ...empty, doctors: docs }, ["hf"], 3, paper);
    expect(r.map((x) => x.d.id)).toEqual(["b", "a"]);
  });
  it("summarises the top reasons with counts", () => {
    expect(topReasons([
      { id: "1", doctorId: "d", by: "Patient", reasons: ["Honest about risks", "Follows up after visits"] },
      { id: "2", doctorId: "d", by: "Patient", reasons: ["Honest about risks"] },
    ])).toBe("honest about risks (2), follows up after visits");
  });
});

describe("identifier check", () => {
  it("catches titled patient names regardless of title case", () => {
    expect(phiProblems("mrs Sharma")).toEqual(["a patient name"]);
    expect(phiProblems("MR. Rao came back")).toEqual(["a patient name"]);
  });
  it("leaves aggregated descriptions alone", () => {
    expect(phiProblems("Women aged 20–35 after vaginal delivery, ~150 per month")).toEqual([]);
  });
  it("reports several problems at once", () => {
    expect(phiProblems("UHID 123, call 9876543210")).toEqual(["a 10-digit number (phone?)", "a record or ID number"]);
  });
});

describe("CSV import", () => {
  it("requires a header with name and specialty", () => {
    expect(parseDoctorCsv("name,city\nA,Pune")).toEqual({ ok: false, error: "The header needs at least name and specialty columns." });
    expect(parseDoctorCsv("name,specialty")).toMatchObject({ ok: false });
  });
  it("parses fields and drops non-http profile links", () => {
    const r = parseDoctorCsv("name,specialty,hospitals,teaching,profile_url,years\nDr. X,Cardiology,A; B,Yes,javascript:alert(1),abc");
    expect(r).toEqual({ ok: true, rows: [expect.objectContaining({ name: "Dr. X", hospitals: ["A", "B"], teaching: true, url: "", years: 0 })] });
  });
  it("completes an unverified patient-nominated profile instead of duplicating it", () => {
    const existing: Doctor[] = [{ id: "d1", name: "Dr. New Doc", nominated: true, verified: false }];
    const parsed = parseDoctorCsv("name,specialty,clinic\nNew Doc,Nephrology,Kidney Care\nDr. Other,Neurology,");
    if (!parsed.ok) throw new Error(parsed.error);
    let n = 0;
    const r = mergeDoctors(existing, parsed.rows, () => "id" + ++n);
    expect(r.merged).toBe(1);
    expect(r.added).toBe(1);
    expect(r.doctors[0]).toMatchObject({ id: "d1", specialty: "Nephrology", verified: true });
    expect(existing[0].verified).toBe(false);
    expect(importSummary(r)).toBe("Imported 1 doctor, and completed 1 patient-nominated profile.");
  });
});
