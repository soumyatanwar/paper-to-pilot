import { describe, expect, it } from "vitest";
import { findDuplicates, levenshtein, nameSimilarity } from "@/lib/dedupe";
import { reviewReasons } from "@/lib/safety/review";
import { NEW_DOCTOR, validateNomination, validatePaper, validateQuestion } from "@/lib/validate";
import type { Doctor } from "@/lib/types";

const q = { author: "Dr. A", specialty: "Cardiology", city: "Pune", question: "Heart failure readmissions?", population: "", setting: "Home", volume: "90", tags: "hf, remote monitoring" };
const p = {
  role: "Inventor", name: "Team", title: "Patch", source: "", kind: "Device", stage: "Pilot data", summary: "A patch for heart failure",
  conceptIds: [], settings: ["Home"], claim: "", population: "", needs: [], limits: "", rights: true,
};
const n = { doctorId: "d1", newName: "", newSpecialty: "", newCity: "", newClinic: "", reasons: ["Honest about risks"], since: "3+ years", by: "Patient", area: "", note: "", consent: true };

describe("validateQuestion", () => {
  it("requires name and question", () => {
    expect(validateQuestion({ ...q, author: " " })).toEqual({ ok: false, error: "Add your name and your question before posting." });
  });
  it("blocks identifiers and names what it found", () => {
    const r = validateQuestion({ ...q, population: "UHID 123 and Mrs. Rao" });
    expect(r).toEqual({ ok: false, error: "Remove patient identifiers before posting. Found: a record or ID number, a patient name." });
  });
  it("cleans fields: setting falls back, volume clamps, tags split", () => {
    const r = validateQuestion({ ...q, setting: "Moon", volume: "-5", tags: " a , ,b " });
    expect(r.ok && r.data).toMatchObject({ setting: "Clinic / OPD", volume: 0, tags: ["a", "b"], population: null });
  });
});

describe("validatePaper", () => {
  it("checks in the prototype's order", () => {
    expect(validatePaper({ ...p, title: "" }).ok).toBe(false);
    expect(validatePaper({ ...p, source: "ftp://x" })).toMatchObject({ error: "The source link must start with http:// or https://." });
    expect(validatePaper({ ...p, summary: "A gadget", title: "Gadget" })).toMatchObject({ error: "Tick at least one condition it targets, so it can be matched." });
    expect(validatePaper({ ...p, summary: "A gadget", title: "Gadget", conceptIds: ["hf"] }).ok).toBe(true);
    expect(validatePaper({ ...p, settings: [] })).toMatchObject({ error: "Pick at least one setting where it works." });
    expect(validatePaper({ ...p, rights: false })).toMatchObject({ error: "Confirm you wrote this summary or have permission to share it." });
    expect(validatePaper({ ...p, limits: "call 9876543210" })).toMatchObject({ error: "Remove patient identifiers first. Found: a 10-digit number (phone?)." });
  });
  it("drops unknown concepts, settings and needs", () => {
    const r = validatePaper({ ...p, conceptIds: ["hf", "nope", "hf"], settings: ["Home", "Mars"], needs: ["Pilot site", "Cash"] });
    expect(r.ok && r.data).toMatchObject({ conceptIds: ["hf"], settings: ["Home"], needs: ["Pilot site"] });
  });
});

describe("validateNomination", () => {
  it("requires a doctor, a name for a new one, a reason and consent", () => {
    expect(validateNomination({ ...n, doctorId: "" }).ok).toBe(false);
    expect(validateNomination({ ...n, doctorId: NEW_DOCTOR })).toMatchObject({ error: "Add your doctor's name." });
    expect(validateNomination({ ...n, reasons: ["Made up"] })).toMatchObject({ error: "Pick at least one reason you trust them." });
    expect(validateNomination({ ...n, consent: false }).ok).toBe(false);
  });
  it("adds the Dr. prefix to a new doctor", () => {
    const r = validateNomination({ ...n, doctorId: NEW_DOCTOR, newName: "Kavya Iyer" });
    expect(r.ok && r.data.newDoctor?.name).toBe("Dr. Kavya Iyer");
  });
  it("limits the note and checks it for identifiers", () => {
    expect(validateNomination({ ...n, note: "x".repeat(301) }).ok).toBe(false);
    expect(validateNomination({ ...n, note: "email me at a@b.co" })).toMatchObject({ error: "Please remove personal details from your note. Found: an email address." });
  });
});

describe("reviewReasons", () => {
  it("flags the flows doc's example", () => {
    expect(reviewReasons("the 34-year-old teacher from Ward 6")).toEqual(["a ward, bed or room number", "an exact age with details about one person"]);
  });
  it("flags a recent event about one patient", () => {
    expect(reviewReasons("A woman came in yesterday with PPH")).toEqual(["a recent event involving one patient"]);
  });
  it("leaves aggregated descriptions alone", () => {
    for (const t of [
      "Hypertension, 40–70 years, many also diabetic",
      "Girls aged 11–17 at government schools",
      "Type 2 diabetes for 10+ years, mostly working-age men from peri-urban areas",
      "Term newborns from a private maternity hospital, first-time parents",
    ]) expect(reviewReasons(t), t).toEqual([]);
  });
});

describe("duplicate doctors", () => {
  const d = (id: string, name: string, extra: Partial<Doctor> = {}): Doctor => ({ id, name, city: "Bengaluru", specialty: "Diabetology", ...extra });
  it("measures edit distance", () => {
    expect(levenshtein("kavyaiyer", "kavyaiyar")).toBe(1);
  });
  it("matches initials, typos and spacing", () => {
    expect(nameSimilarity("Dr. K. Iyer", "Dr. Kavya Iyer")).toBe("Same surname, matching initials");
    expect(nameSimilarity("Dr Kavya Iyer", "Kavya Iyar")).toBe("Names differ by one or two letters");
    expect(nameSimilarity("Dr. Kavya Iyer", "kavya iyer")).toBe("Same name");
    expect(nameSimilarity("Dr. Kavya Iyer", "Dr. Kiran Iyer")).toBeNull();
    expect(nameSimilarity("Dr. Ravi Rao", "Dr. Vikram Rao")).toBeNull();
  });
  it("rules out different cities or specialties unless the names are identical", () => {
    const list = [d("1", "Dr. Kavya Iyer"), d("2", "Dr. K. Iyer", { city: "Chennai" }), d("3", "Dr. K Iyer"), d("4", "Kavya Iyer", { specialty: "Cardiology" })];
    expect(findDuplicates(list).map((x) => [x.a.id, x.b.id])).toEqual([
      ["1", "3"], // initials, same city and specialty
      ["1", "4"], // identical name, so the different specialty doesn't rule it out
      ["2", "3"], // identical once punctuation is dropped
    ]);
  });
});
