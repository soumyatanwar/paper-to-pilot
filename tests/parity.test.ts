// The TypeScript port must reproduce the prototype's numbers exactly.
// Golden output comes from running the prototype's own JS: `npm run golden`.

import { describe, expect, it } from "vitest";
import golden from "./golden/prototype-output.json";
import sample from "./golden/sample-state.json";
import { concepts, paperConcepts, questionText } from "@/lib/matching/detect";
import { idfTable } from "@/lib/matching/similarity";
import { matchPair } from "@/lib/matching/match";
import { champion, relevantChampions } from "@/lib/scoring/champion";
import { phiProblems } from "@/lib/safety/phi";
import { parseCsvLine } from "@/lib/import/csv";
import type { Exchange } from "@/lib/types";

const ex = sample as unknown as Exchange;
const q = (id: string) => ex.questions.find((x) => x.id === id)!;
const p = (id: string) => ex.inventions.find((x) => x.id === id)!;

describe("parity with the prototype", () => {
  it("detects the same concepts", () => {
    for (const x of ex.questions) expect(concepts(questionText(x)), x.id).toEqual(golden.concepts.questions[x.id as keyof typeof golden.concepts.questions]);
    for (const x of ex.inventions) expect(paperConcepts(x), x.id).toEqual(golden.concepts.inventions[x.id as keyof typeof golden.concepts.inventions]);
  });

  it(`scores all ${golden.matches.length} question × paper pairs identically`, () => {
    const idf = idfTable(ex.questions, ex.inventions);
    for (const g of golden.matches) {
      const { q: qid, i: iid, ...expected } = g;
      expect(matchPair(q(qid), p(iid), idf), `${qid}×${iid}`).toEqual(expected);
    }
  });

  it("gives every doctor the same champion score and parts", () => {
    for (const d of ex.doctors) {
      const c = champion(ex, d);
      expect(
        { total: c.total, dual: c.dual, posts: c.posts, endorsed: c.endorsed, submitted: c.submitted, nominations: c.noms.length, parts: c.parts },
        d.id,
      ).toEqual(golden.champions[d.id as keyof typeof golden.champions]);
    }
  });

  it("ranks likely champions the same way from a question", () => {
    for (const x of ex.questions) {
      const got = relevantChampions(ex, concepts(questionText(x)), 4).map((r) => ({ d: r.d.id, score: r.score, hit: r.hit, end: r.end }));
      // The prototype leaves `end` undefined (dropped from JSON) when there is no paper; the port uses false.
      const want = golden.relevantForQuestion[x.id as keyof typeof golden.relevantForQuestion].map((r) => ({ end: false, ...r }));
      expect(got, x.id).toEqual(want);
    }
  });

  it("ranks likely champions the same way from a paper", () => {
    for (const x of ex.inventions) {
      const got = relevantChampions(ex, paperConcepts(x), 4, x).map((r) => ({ d: r.d.id, score: r.score, hit: r.hit, end: r.end }));
      expect(got, x.id).toEqual(golden.relevantForInvention[x.id as keyof typeof golden.relevantForInvention]);
    }
  });

  it("parses CSV lines the same way", () => {
    for (const g of golden.csv) expect(parseCsvLine(g.line)).toEqual(g.cells);
  });

  it("flags the same identifiers, except the fixed patient-name check", () => {
    // Deliberate divergence, see lib/safety/phi.ts: the prototype missed titled names.
    const fixed: Record<string, string[]> = {
      "Mrs. Sharma had a foot ulcer": ["a patient name"],
      "Baby of Priya was jaundiced": ["a patient name"],
    };
    for (const g of golden.phi) expect(phiProblems(g.text), g.text).toEqual(fixed[g.text] ?? g.problems);
  });
});
