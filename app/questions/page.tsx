import Link from "next/link";
import { ConceptChips, SampleChip } from "@/components/Chips";
import { QuestionForm } from "@/components/QuestionForm";
import { VoteButton } from "@/components/VoteButton";
import { getExchange } from "@/lib/data";
import { concepts, questionText } from "@/lib/matching/detect";
import { readVoterKey } from "@/lib/server/session";
import { specialtyList } from "@/lib/view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Clinician questions · Clinician Research Exchange" };

export default async function QuestionsPage() {
  const ex = await getExchange(await readVoterKey());
  const qs = [...ex.questions].sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0));

  return (
    <div className="grid">
      <QuestionForm specialties={specialtyList(ex.doctors)} />
      <section aria-label="Questions">
        <div className="toolbar">
          <div className="meta">
            {qs.length} questions, most-seen first. &quot;I see this too&quot; tells inventors a pattern is shared across practices.
          </div>
        </div>
        <div className="list">
          {qs.length ? (
            qs.map((q) => (
              <article key={q.id} className="card">
                <div>
                  <h3>{q.question}</h3>
                  <div className="meta">
                    {q.author} · {q.specialty}
                    {q.city ? ` · ${q.city}` : ""} · {q.setting}
                    {q.volume ? ` · ~${q.volume} patients/month` : ""}
                  </div>
                </div>
                <div className="score">
                  {q.votes ?? 0}
                  <small>see this too</small>
                </div>
                {q.population ? (
                  <div className="body">
                    <p><b className="lb">Patient group:</b> {q.population}</p>
                  </div>
                ) : null}
                <div className="chips">
                  <ConceptChips ids={concepts(questionText(q))} />
                  <SampleChip show={q.sample} />
                </div>
                <div className="actions">
                  <VoteButton id={q.id} voted={ex.myVotes.has(q.id)} />
                  <Link className="button small" href={`/match?question=${q.id}`}>Find matching papers</Link>
                </div>
              </article>
            ))
          ) : (
            <div className="empty">No questions yet.</div>
          )}
        </div>
      </section>
    </div>
  );
}
