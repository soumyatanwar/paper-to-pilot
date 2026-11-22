// Runs the ORIGINAL prototype's JavaScript (reference/clinician-research-exchange.html)
// in a sandbox and records its scoring output for the sample data. The TypeScript
// port in lib/ must reproduce these numbers exactly (tests/parity.test.ts).
//
// Usage: npm run golden
import { readFileSync, writeFileSync } from "node:fs";
import vm from "node:vm";

const html = readFileSync(new URL("../reference/clinician-research-exchange.html", import.meta.url), "utf8");
const block = (id) => {
  const m = html.match(new RegExp(`<(script|style)[^>]*id="${id}"[^>]*>([\\s\\S]*?)</\\1>`));
  if (!m) throw new Error(`block ${id} not found`);
  return m[2];
};
const stateJson = block("app-state");
const css = block("app-css");
let js = block("app-js");

// Expose the prototype's internal functions before its final render() call.
const hook = "render();\n})();";
if (!js.trimEnd().endsWith(hook)) throw new Error("unexpected end of app-js; update the hook");
js = js.trimEnd().slice(0, -hook.length) +
  "globalThis.__proto={state:state,CONCEPTS:CONCEPTS,concepts:concepts,qText:qText,iText:iText,iConcepts:iConcepts," +
  "idfTable:idfTable,matchPair:matchPair,champ:champ,relevantChampions:relevantChampions,phiProblems:phiProblems," +
  "parseCsvLine:parseCsvLine,nameKey:nameKey,tokens:tokens};\n})();";

const el = (text) => ({ textContent: text, innerHTML: "", addEventListener() {} });
const nodes = { "app-state": el(stateJson), "app-css": el(css), "app-js": el(js), root: el("") };
const sandbox = {
  document: { getElementById: (id) => nodes[id] ?? null },
  window: { addEventListener() {} },
  location: { hash: "" },
  setTimeout, clearTimeout, console,
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(js, sandbox);
const P = sandbox.__proto;
const S = P.state;
const plain = (x) => JSON.parse(JSON.stringify(x));

const idf = P.idfTable();
const out = {
  generatedFrom: "reference/clinician-research-exchange.html",
  concepts: {
    questions: Object.fromEntries(S.questions.map((q) => [q.id, P.concepts(P.qText(q))])),
    inventions: Object.fromEntries(S.inventions.map((i) => [i.id, P.iConcepts(i)])),
  },
  matches: S.questions.flatMap((q) => S.inventions.map((i) => ({ q: q.id, i: i.id, ...plain(P.matchPair(q, i, idf)) }))),
  champions: Object.fromEntries(S.doctors.map((d) => {
    const c = P.champ(d);
    return [d.id, { total: c.total, dual: c.dual, posts: c.posts, endorsed: c.endorsed, submitted: c.submitted, nominations: c.noms.length, parts: plain(c.parts) }];
  })),
  relevantForQuestion: Object.fromEntries(S.questions.map((q) => [q.id,
    P.relevantChampions(P.concepts(P.qText(q)), 4).map((x) => ({ d: x.d.id, score: x.score, hit: plain(x.hit), end: x.end }))])),
  relevantForInvention: Object.fromEntries(S.inventions.map((i) => [i.id,
    P.relevantChampions(P.iConcepts(i), 4, i).map((x) => ({ d: x.d.id, score: x.score, hit: plain(x.hit), end: x.end }))])),
};

const phiCases = [
  "Call me on 9876543210",
  "Seen on 12/03/2025 in OPD",
  "UHID 44321 was admitted",
  "Mrs. Sharma had a foot ulcer",
  "write to someone@example.com",
  "Baby of Priya was jaundiced",
  "Type 2 diabetes for 10+ years, mostly working-age men",
  "the 34-year-old teacher from Ward 6",
];
out.phi = phiCases.map((t) => ({ text: t, problems: plain(P.phiProblems(t)) }));

const csvCases = [
  'Dr. A Example,Cardiology,Pune,12,Example Heart Clinic,City Hospital;Metro Hospital,4,1,yes,300,heart failure,https://x',
  '"Dr. Quote, Jr",General Medicine,"Pune","",,,0,0,no,0,"says ""hi""",',
];
out.csv = csvCases.map((l) => ({ line: l, cells: plain(P.parseCsvLine(l)) }));

writeFileSync(new URL("../tests/golden/sample-state.json", import.meta.url), JSON.stringify(JSON.parse(stateJson), null, 2) + "\n");
writeFileSync(new URL("../tests/golden/prototype-output.json", import.meta.url), JSON.stringify(out, null, 2) + "\n");
console.log(`golden: ${out.matches.length} match pairs, ${Object.keys(out.champions).length} doctors, ${out.phi.length} PHI cases`);
