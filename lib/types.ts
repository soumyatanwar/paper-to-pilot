// Record shapes, matching the prototype's JSON state (reference/clinician-research-exchange.html).

export type Setting = "Clinic / OPD" | "Hospital ward" | "Labour ward" | "Community / camps" | "Home";
export type EvidenceStage = "Concept" | "Bench" | "Pilot data" | "Validated";
export type PaperKind = "Device" | "Diagnostic" | "Software" | "Protocol";
export type SubmitterRole = "Doctor" | "Inventor" | "Independent researcher";

export interface Question {
  id: string;
  author: string;
  specialty: string;
  city?: string;
  setting: string;
  volume?: number;
  question: string;
  population?: string;
  tags?: string[];
  votes?: number;
  created?: string;
  sample?: boolean;
}

export interface Annotations {
  claim?: string;
  population?: string;
  needs?: string[];
  limits?: string;
}

/** A paper, patent or invention ("inventions" in the prototype's state). */
export interface Paper {
  id: string;
  title: string;
  kind: string;
  stage: string;
  settings?: string[];
  summary: string;
  source?: string;
  role?: string;
  submitter?: string;
  tagIds?: string[];
  annot?: Annotations;
  endorsements?: string[];
  created?: string;
  sample?: boolean;
}

export interface Doctor {
  id: string;
  name: string;
  specialty?: string;
  city?: string;
  years?: number;
  clinic?: string;
  hospitals?: string[];
  pubs?: number;
  trials?: number;
  teaching?: boolean;
  reviews?: number;
  interests?: string;
  url?: string;
  nominated?: boolean;
  verified?: boolean;
  sample?: boolean;
}

export interface Nomination {
  id: string;
  doctorId: string;
  by: string;
  reasons?: string[];
  area?: string;
  since?: string;
  note?: string;
  created?: string;
  sample?: boolean;
}

/** Everything the scoring functions read. */
export interface Exchange {
  questions: Question[];
  inventions: Paper[];
  doctors: Doctor[];
  nominations: Nomination[];
}
