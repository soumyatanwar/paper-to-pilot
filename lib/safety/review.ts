// Softer identifier heuristic. Unlike phiProblems (which blocks posting), a hit here
// saves the record as NEEDS_REVIEW: hidden until an admin approves it.
// It targets combinations that can point to one person even without a name or number,
// e.g. "the 34-year-old teacher from Ward 6".

const AGE = /\b\d{1,3}[\s-]?(?:year|yr)s?[\s-]?old\b|\baged?\s+\d{1,3}\b(?!\s*[-–]\s*\d)/i;
const LOCATION = /\b(?:ward|bed|room|cabin|icu|unit)\s*(?:no\.?|number|#)?\s*\d+[a-z]?\b/i;
const OCCUPATION = /\b(?:teacher|driver|farmer|nurse|engineer|student|shopkeeper|police(?:man)?|lawyer|clerk|tailor|priest|principal|sarpanch|mla|actor)\b/i;
const SINGULAR = /\b(?:a|one|this|the)\s+(?:patient|man|woman|boy|girl|child|baby|lady|gentleman)\b/i;
const EVENT_DATE = /\b(?:yesterday|last (?:night|week|monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/i;

export function reviewReasons(t: string): string[] {
  const r: string[] = [];
  const age = AGE.test(t), loc = LOCATION.test(t), job = OCCUPATION.test(t), one = SINGULAR.test(t);
  if (loc) r.push("a ward, bed or room number");
  if (age && (job || one)) r.push("an exact age with details about one person");
  if (one && EVENT_DATE.test(t)) r.push("a recent event involving one patient");
  return r;
}
