import { NominateForm } from "@/components/NominateForm";
import { getExchange } from "@/lib/data";
import { nominationsFor, topReasons } from "@/lib/scoring/champion";
import { doctorOptions, specialtyList } from "@/lib/view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nominate a doctor · Clinician Research Exchange" };

export default async function NominatePage() {
  const ex = await getExchange();
  const counts = new Map<string, number>();
  ex.nominations.forEach((n) => counts.set(n.doctorId, (counts.get(n.doctorId) ?? 0) + 1));
  const top = ex.doctors
    .filter((d) => counts.has(d.id))
    .map((d) => ({ d, n: counts.get(d.id)! }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 8);

  return (
    <div className="grid wide">
      <NominateForm doctors={doctorOptions(ex.doctors)} specialties={specialtyList(ex.doctors)} />
      <div className="stack">
        <section className="panel" aria-labelledby="hn-h">
          <h2 id="hn-h">How nominations are used</h2>
          <div className="mini">
            <div className="m">Each nomination adds to the doctor&apos;s patient-trust score, which helps researchers decide who to approach first.</div>
            <div className="m">&quot;Open to new treatments or tools&quot; carries extra weight, because a pilot needs a doctor willing to try something new.</div>
            <div className="m">Nominations are anonymous. Only the reasons, how long you have seen them and the broad area of care are shown.</div>
            <div className="m">A doctor you add who is not on the list appears as &quot;not verified&quot; until their practice details are checked.</div>
          </div>
        </section>
        <section className="panel" aria-labelledby="mn-h">
          <h2 id="mn-h">Most nominated</h2>
          {top.length ? (
            <div className="mini">
              {top.map(({ d, n }) => {
                const r = topReasons(nominationsFor(ex, d));
                return (
                  <div key={d.id} className="m">
                    <b>{d.name}</b> · {n}
                    <br />
                    <span className="meta">
                      {d.specialty}{d.city ? `, ${d.city}` : ""}{r ? ` · ${r}` : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : <p className="sub">No nominations yet.</p>}
        </section>
      </div>
    </div>
  );
}
