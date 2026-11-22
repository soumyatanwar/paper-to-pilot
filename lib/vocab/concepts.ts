// Controlled vocabulary, copied from the prototype. Matching depends on this
// list, so changes here change scores; regenerate golden output only on purpose.

import type { EvidenceStage, Setting, SubmitterRole } from "../types";

export interface Concept {
  id: string;
  label: string;
  /** Therapeutic area */
  ta: string;
  /** Specialties that treat it */
  sp: string[];
  terms: string[];
}

export const SETTINGS: Setting[] = ["Clinic / OPD", "Hospital ward", "Labour ward", "Community / camps", "Home"];

export const STAGES: Record<EvidenceStage, number> = { Concept: 0.3, Bench: 0.5, "Pilot data": 0.8, Validated: 1 };

export const ROLES: SubmitterRole[] = ["Doctor", "Inventor", "Independent researcher"];

export const NEEDS = ["Pilot site", "Co-investigator", "Patient feedback", "Data access", "Ethics committee support"];

export const TRUST_REASONS = [
  "Listens and explains clearly",
  "Open to new treatments or tools",
  "Follows up after visits",
  "Honest about risks",
  "Takes time with family",
];

export const OPEN_TO_NEW = "Open to new treatments or tools";

export const CONCEPTS: Concept[] = [
  { id: "dfu", label: "Diabetic foot ulcer", ta: "Diabetes & metabolism", sp: ["Diabetology", "Endocrinology", "General Surgery", "Podiatry", "Vascular Surgery"], terms: ["diabetic foot", "foot ulcer", "dfu", "pre-ulcer", "neuropathic ulcer", "foot wound", "plantar", "offloading"] },
  { id: "diabetes", label: "Diabetes", ta: "Diabetes & metabolism", sp: ["Diabetology", "Endocrinology", "General Medicine"], terms: ["diabetes", "diabetic", "t2dm", "hba1c", "glycaemic", "glycemic"] },
  { id: "neuro", label: "Neuropathy", ta: "Diabetes & metabolism", sp: ["Diabetology", "Neurology", "Endocrinology"], terms: ["neuropathy", "neuropathic"] },
  { id: "wound", label: "Chronic wounds", ta: "Wound care", sp: ["General Surgery", "Plastic Surgery", "Dermatology", "Vascular Surgery"], terms: ["wound", "ulcer", "pressure injury", "pressure injuries", "bedsore", "negative pressure", "npwt", "infected"] },
  { id: "hf", label: "Heart failure", ta: "Cardiovascular", sp: ["Cardiology", "General Medicine"], terms: ["heart failure", "chf", "hfref", "decompensation", "fluid overload", "lung fluid", "pulmonary congestion", "readmission", "readmitted", "readmit"] },
  { id: "af", label: "Atrial fibrillation", ta: "Cardiovascular", sp: ["Cardiology", "Neurology"], terms: ["atrial fibrillation", "afib", "palpitation", "arrhythmia", "ecg"] },
  { id: "stroke", label: "Stroke", ta: "Neurology", sp: ["Neurology", "General Medicine"], terms: ["stroke", "cryptogenic", "tia"] },
  { id: "htn", label: "Hypertension", ta: "Cardiovascular", sp: ["General Medicine", "Cardiology", "Nephrology"], terms: ["hypertension", "blood pressure", "bp", "antihypertensive", "titration"] },
  { id: "pph", label: "Postpartum haemorrhage", ta: "Maternal health", sp: ["Obstetrics & Gynaecology"], terms: ["postpartum haemorrhage", "postpartum hemorrhage", "pph", "blood loss", "labour ward", "labor ward", "delivery"] },
  { id: "anaemia", label: "Anaemia", ta: "Haematology & nutrition", sp: ["Paediatrics", "Obstetrics & Gynaecology", "Community Medicine", "General Medicine"], terms: ["anaemia", "anemia", "haemoglobin", "hemoglobin", "hb", "pallor", "iron deficiency"] },
  { id: "jaundice", label: "Neonatal jaundice", ta: "Neonatology", sp: ["Paediatrics", "Neonatology"], terms: ["neonatal jaundice", "bilirubin", "jaundice", "hyperbilirubinemia", "hyperbilirubinaemia", "phototherapy", "newborn"] },
  { id: "dr", label: "Diabetic retinopathy", ta: "Ophthalmology", sp: ["Ophthalmology", "Diabetology", "Endocrinology"], terms: ["retinopathy", "fundus", "retina", "vision loss", "teleophthalmology"] },
  { id: "ckd", label: "Chronic kidney disease", ta: "Nephrology", sp: ["Nephrology", "Diabetology", "General Medicine"], terms: ["kidney", "ckd", "albuminuria", "albumin", "acr", "egfr", "nephropathy", "creatinine"] },
  { id: "copd", label: "COPD", ta: "Respiratory", sp: ["Pulmonology", "General Medicine"], terms: ["copd", "emphysema", "chronic bronchitis", "spirometry", "exacerbation"] },
  { id: "tb", label: "Tuberculosis", ta: "Infectious disease", sp: ["Pulmonology", "Community Medicine", "General Medicine"], terms: ["tuberculosis", "tb", "sputum", "cough"] },
  { id: "adherence", label: "Adherence & follow-up", ta: "Care delivery", sp: ["General Medicine", "Cardiology", "Diabetology"], terms: ["adherence", "missed doses", "non-compliance", "follow-up", "follow up", "whatsapp", "remote monitoring", "home monitoring", "home readings"] },
  { id: "screen", label: "Point-of-care screening", ta: "Care delivery", sp: ["Community Medicine", "General Medicine", "Paediatrics"], terms: ["screening", "screen", "camp", "camps", "point-of-care", "point of care", "non-invasive", "needle-free", "smartphone"] },
];

export const CONCEPT_MAP: Record<string, Concept> = Object.fromEntries(CONCEPTS.map((c) => [c.id, c]));

export const THERAPEUTIC_AREAS: string[] = [...new Set(CONCEPTS.map((c) => c.ta))];

export const STOP_WORDS = new Set(
  "the a an and or of to in on for with we our my is are be can at by from that this it as us me i you do does there their they them into before after when would could about most many also than then even".split(" "),
);
