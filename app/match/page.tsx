import Link from "next/link";
import { AutoSubmitForm } from "@/components/AutoSubmitForm";
import { Bars } from "@/components/Bars";
import { ConceptChips, SampleChip } from "@/components/Chips";
import { getExchange } from "@/lib/data";
import { concepts, nameKey, paperConcepts, questionText } from "@/lib/matching/detect";
import { HIGHLIGHT_THRESHOLD, matchPair, MATCH_WEIGHTS, type MatchResult } from "@/lib/matching/match";
import { idfTable } from "@/lib/matching/similarity";
import { relevantChampions, type RelevantChampion } from "@/lib/scoring/champion";
import type { Paper } from "@/lib/types";
import { CONCEPT_MAP } from "@/lib/vocab/concepts";
import { param, plural, type SearchParams } from "@/lib/view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Match · Clinician Research Exchange" };

const PART_LABELS: [keyof MatchResult["parts"], string][] = [
  ["concept", "Condition fit"], ["text", "Text similarity"], ["setting", "Setting"], ["ready", "Evidence stage"], ["endorse", "Endorsements"],
];

function MatchBars({ m }: { m: MatchResult }) {
  return <Bars parts={PART_LABELS.map(([k, label]) => ({ label, value: m.parts[k] * MATCH_WEIGHTS[k] * 100, max: MATCH_WEIGHTS[k] * 100 }))} />;
}

function ReasonChips({ m, paper }: { m: MatchResult; paper: Paper }) {
  const n = (paper.endorsements ?? []).length;
  return (
    <>
      {m.shared.map((id) => <span key={id} className="chip">{CONCEPT_MAP[id].label}</span>)}
      {m.taOnly.map((t) => <span key={t} className="chip ta">Same area: {t}</span>)}
      {m.settingFit ? <span className="chip sig">Fits the setting</span> : <span className="chip ta">Different setting</span>}
      {n ? <span className="chip sig">{plural(n, "doctor endorsement")}</span> : null}
    </>
  );
}

function Champions({ list, author }: { list: RelevantChampion[]; author?: string }) {
  if (!list.length) return <p className="sub">No matching doctors yet. Ask patients to nominate, or ask the team to import profiles.</p>;
  return (
    <div className="mini">
      {list.map((x) => (
        <div key={x.d.id} className="m">
          <b>{x.d.name}</b> · {x.c.total}
          <br />
          <span className="meta">
            {x.d.specialty}{x.d.city ? `, ${x.d.city}` : ""}{x.c.dual ? " · clinic + hospital" : ""}
            {x.c.noms.length ? ` · ${plural(x.c.noms.length, "patient nomination")}` : ""}
          </span>
          {author && nameKey(author) === nameKey(x.d.name) ? <><br /><span className="chip sig">Asked this question</span></> : null}
          {x.end ? <><br /><span className="chip sig">Endorsed this paper</span></> : null}
          {x.hit.length ? <><br /><span className="meta">Interest match: {x.hit.map((h) => CONCEPT_MAP[h].label).join(", ")}</span></> : null}
        </div>
      ))}
    </div>
  );
}

export default async function MatchPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const mode = param(sp, "paper") || param(sp, "mode") === "paper" ? "paper" : "question";
  const ex = await getExchange();
  const idf = idfTable(ex.questions, ex.inventions);

  const seg = (
    <div className="seg" role="group" aria-label="Start from">
      <Link href="/match?mode=question" aria-current={mode === "question" ? "true" : undefined}>Start from a question</Link>
      <Link href="/match?mode=paper" aria-current={mode === "paper" ? "true" : undefined}>Start from a paper</Link>
    </div>
  );

  let main: React.ReactNode;
  let side: React.ReactNode = null;

  if (mode === "question") {
    const q = ex.questions.find((x) => x.id === param(sp, "question")) ?? ex.questions[0];
    if (!q) main = <><div className="toolbar">{seg}</div><div className="empty">Post a question first.</div></>;
    else {
      const qc = concepts(questionText(q));
      const res = ex.inventions.map((p) => ({ p, m: matchPair(q, p, idf) })).sort((a, b) => b.m.score - a.m.score);
      main = (
        <>
          <AutoSubmitForm action="/match" className="toolbar">
            {seg}
            <input type="hidden" name="mode" value="question" />
            <label className="f" htmlFor="sel-q" style={{ flex: 1, minWidth: 240 }}>Question
              <select id="sel-q" name="question" defaultValue={q.id}>
                {ex.questions.map((x) => <option key={x.id} value={x.id}>{x.question.length > 90 ? x.question.slice(0, 90) + "…" : x.question}</option>)}
              </select>
            </label>
          </AutoSubmitForm>
          <div className="sel-summary">
            <b>Research bridge:</b> this question maps to{" "}
            <span className="chips" style={{ display: "inline-flex", verticalAlign: "middle" }}><ConceptChips ids={qc} /></span>
          </div>
          <div className="list">
            {res.map(({ p, m }, ix) => (
              <article key={p.id} className={"card" + (ix < 3 && m.score >= HIGHLIGHT_THRESHOLD ? " hit" : "")}>
                <div>
                  <h3>{p.title}</h3>
                  <div className="meta">
                    {p.kind} · {p.stage} · {(p.settings ?? []).join(", ")}{p.role ? ` · from ${p.role.toLowerCase()}` : ""}
                  </div>
                </div>
                <div className="score">{m.score}<small>match</small></div>
                <div className="body">
                  <p>
                    {p.summary}{" "}
                    {p.source ? <a href={p.source} rel="noopener noreferrer nofollow" target="_blank">Source</a> : null}
                  </p>
                </div>
                <div className="chips"><ReasonChips m={m} paper={p} /><SampleChip show={p.sample} /></div>
                <MatchBars m={m} />
              </article>
            ))}
          </div>
        </>
      );
      side = (
        <section className="panel" aria-labelledby="lc-h">
          <h2 id="lc-h">Likely champions</h2>
          <p className="sub">Doctors in the relevant specialties, clinic + hospital first.</p>
          <Champions list={relevantChampions(ex, qc, 4)} author={q.author} />
        </section>
      );
    }
  } else {
    const p = ex.inventions.find((x) => x.id === param(sp, "paper")) ?? ex.inventions[0];
    if (!p) main = <><div className="toolbar">{seg}</div><div className="empty">Submit a paper first.</div></>;
    else {
      const pc = paperConcepts(p);
      const res = ex.questions.map((q) => ({ q, m: matchPair(q, p, idf) })).sort((a, b) => b.m.score - a.m.score);
      main = (
        <>
          <AutoSubmitForm action="/match" className="toolbar">
            {seg}
            <input type="hidden" name="mode" value="paper" />
            <label className="f" htmlFor="sel-i" style={{ flex: 1, minWidth: 240 }}>Paper or invention
              <select id="sel-i" name="paper" defaultValue={p.id}>
                {ex.inventions.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
              </select>
            </label>
          </AutoSubmitForm>
          <div className="sel-summary">
            <b>Research bridge:</b> this paper maps to{" "}
            <span className="chips" style={{ display: "inline-flex", verticalAlign: "middle" }}><ConceptChips ids={pc} /></span>
          </div>
          <div className="list">
            {res.map(({ q, m }, ix) => (
              <article key={q.id} className={"card" + (ix < 2 && m.score >= HIGHLIGHT_THRESHOLD ? " hit" : "")}>
                <div>
                  <h3>{q.question}</h3>
                  <div className="meta">{q.author} · {q.specialty} · {q.setting} · {q.votes ?? 0} see this too</div>
                </div>
                <div className="score">{m.score}<small>match</small></div>
                <div className="chips"><ReasonChips m={m} paper={p} /></div>
                <MatchBars m={m} />
              </article>
            ))}
          </div>
        </>
      );
      side = (
        <section className="panel" aria-labelledby="lc-h">
          <h2 id="lc-h">Likely champions</h2>
          <p className="sub">Doctors who endorsed this paper come first, then those whose specialty or interests fit.</p>
          <Champions list={relevantChampions(ex, pc, 4, p)} />
        </section>
      );
    }
  }

  return (
    <div className="split">
      <div>{main}</div>
      <div>
        {side}
        <p className="legend">
          Match = 45% condition fit from the research bridge (text plus annotations), 25% text similarity, 15% setting fit, 10% evidence stage, 5% doctor endorsements.
        </p>
      </div>
    </div>
  );
}
