import sample from "@/tests/golden/sample-state.json";
import { idfTable } from "@/lib/matching/similarity";
import { matchPair } from "@/lib/matching/match";
import type { Exchange } from "@/lib/types";

// Phase 0–1 placeholder: proves the ported scoring runs on the server.
// The five sections arrive in Phase 2, backed by Postgres.
export default function Home() {
  const ex = sample as unknown as Exchange;
  const idf = idfTable(ex.questions, ex.inventions);
  const best = ex.questions.map((q) => {
    const top = ex.inventions.map((p) => ({ p, m: matchPair(q, p, idf) })).sort((a, b) => b.m.score - a.m.score)[0];
    return { q, ...top };
  });

  return (
    <>
      <div className="notice" role="status">
        <b>Preview build.</b> Sections are being ported from the prototype. Entries below are sample data, not real people
        or products.
      </div>
      <div className="list">
        {best.map(({ q, p, m }) => (
          <article key={q.id} className={"card" + (m.score >= 45 ? " hit" : "")}>
            <div>
              <h3>{q.question}</h3>
              <div className="meta">
                Best match: {p.title} · {p.stage}
              </div>
            </div>
            <div className="score">
              {m.score}
              <small>match</small>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
