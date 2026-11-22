import Link from "next/link";
import { ConceptChips, SampleChip } from "@/components/Chips";
import { EndorseForm } from "@/components/EndorseForm";
import { PaperForm } from "@/components/PaperForm";
import { getExchange } from "@/lib/data";
import { paperConcepts } from "@/lib/matching/detect";
import { doctorOptions } from "@/lib/view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Papers · Clinician Research Exchange" };

export default async function PapersPage() {
  const ex = await getExchange();
  const byId = new Map(ex.doctors.map((d) => [d.id, d]));
  const opts = doctorOptions(ex.doctors);
  const papers = [...ex.inventions].sort((a, b) => (b.endorsements ?? []).length - (a.endorsements ?? []).length);

  return (
    <div className="grid wide">
      <PaperForm />
      <section aria-label="Papers and inventions">
        <div className="toolbar">
          <div className="meta">
            {papers.length} papers and inventions. Annotated conditions count in matching the same as conditions found in the text.
          </div>
        </div>
        <div className="list">
          {papers.length ? papers.map((p) => {
            const a = p.annot ?? {};
            const ends = (p.endorsements ?? []).map((id) => byId.get(id)).filter((d) => !!d);
            return (
              <article key={p.id} className={"card" + (ends.length ? " hit" : "")}>
                <div>
                  <h3>{p.title}</h3>
                  <div className="meta">
                    {p.kind} · {p.stage} · {(p.settings ?? []).join(", ")}
                    {p.submitter ? ` · submitted by ${p.submitter}` : ""}
                  </div>
                </div>
                <div className="score">{ends.length}<small>doctor endorsements</small></div>
                <div className="body">
                  <p>
                    {p.summary}{" "}
                    {p.source ? <a href={p.source} rel="noopener noreferrer nofollow" target="_blank">Source</a> : <span className="meta">No source link yet</span>}
                  </p>
                  {a.claim ? <p><b className="lb">Claim:</b> {a.claim}</p> : null}
                  {a.population ? <p><b className="lb">Studied in:</b> {a.population}</p> : null}
                  {a.needs?.length ? <p><b className="lb">Pilot needs:</b> {a.needs.join(", ")}</p> : null}
                  {a.limits ? <p><b className="lb">Limitations:</b> {a.limits}</p> : null}
                  {ends.length ? <p><b className="lb">Endorsed by:</b> {ends.map((d) => d.name).join(", ")}</p> : null}
                </div>
                <div className="chips">
                  {p.role ? <span className="chip sig">{p.role}</span> : null}
                  <ConceptChips ids={paperConcepts(p)} />
                  <SampleChip show={p.sample} />
                </div>
                <div className="actions">
                  <EndorseForm paperId={p.id} doctors={opts} />
                  <Link className="button small" href={`/match?paper=${p.id}`}>See matches</Link>
                </div>
              </article>
            );
          }) : <div className="empty">No papers yet.</div>}
        </div>
      </section>
    </div>
  );
}
