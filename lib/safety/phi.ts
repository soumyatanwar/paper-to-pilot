// Patient-identifier check for free text. Pattern-based only: it catches obvious
// identifiers, not indirect ones ("the 34-year-old teacher from Ward 6").
// Run it on the server for every write; the client copy is only for fast feedback.

/**
 * Deliberate difference from the prototype: there the patient-name pattern was
 * case-sensitive, so "Mrs. Sharma" and "Baby of Priya" were never caught. Here the
 * title is matched case-insensitively while the name must still start with a capital.
 */
const NAME_TITLE = /\b(?:[Mm][Rr][Ss]?|[Mm][Ss]|[Mm]aster|MASTER|[Bb]aby of|BABY OF)\.?\s+[A-Z][a-z]+/;

export function phiProblems(t: string): string[] {
  const p: string[] = [];
  if (/\b\d{10}\b/.test(t)) p.push("a 10-digit number (phone?)");
  if (/\b\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}\b/.test(t)) p.push("a specific date");
  if (/\b(uhid|mrn|ip\s?no|op\s?no|reg\.?\s?no|aadhaar)\b/i.test(t)) p.push("a record or ID number");
  if (NAME_TITLE.test(t)) p.push("a patient name");
  if (/[\w.+-]+@[\w-]+\.[\w.]+/.test(t)) p.push("an email address");
  return p;
}
