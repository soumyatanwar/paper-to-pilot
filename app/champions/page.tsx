import { AutoSubmitForm } from "@/components/AutoSubmitForm";
import { Bars } from "@/components/Bars";
import { SampleChip } from "@/components/Chips";
import { getExchange } from "@/lib/data";
import { champion, topReasons } from "@/lib/scoring/champion";
import { param, plural, type SearchParams } from "@/lib/view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Champions · Clinician Research Exchange" };

export default async function ChampionsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const city = param(sp, "city");
  const spec = param(sp, "specialty");
  // Hidden "off" + checkbox "on": absent means the default (on).
  const dualVals = ([] as string[]).concat(sp.dual ?? []);
  const dualOnly = !dualVals.length || dualVals.includes("on");

  const ex = await getExchange();
  const cities = [...new Set(ex.doctors.map((d) => d.city ?? "").filter(Boolean))].sort();
  const specs = [...new Set(ex.doctors.map((d) => d.specialty ?? "").filter(Boolean))].sort();
  const inFilters = ex.doctors.filter((d) => (!city || d.city === city) && (!spec || d.specialty === spec));
  const rows = inFilters
    .map((d) => ({ d, c: champion(ex, d) }))
    .filter((x) => !dualOnly || x.c.dual)
    .sort((a, b) => b.c.total - a.c.total);
  const hidden = dualOnly ? inFilters.filter((d) => d.nominated && !d.verified).length : 0;

  return (
    <div className="grid">
      <aside className="panel stack" aria-labelledby="ch-h">
        <div>
          <h2 id="ch-h">Who counts as a champion</h2>
          <p className="sub">
            Doctors who run their own practice and also consult at a larger hospital can decide quickly in their clinic and bring a hospital site in later.
          </p>
        </div>
        <div className="mini">
          <div className="m"><b>Clinic + hospital (20)</b><br />Own practice and at least one hospital consultancy.</div>
          <div className="m"><b>Trial experience (15)</b><br />Proof they can run a study.</div>
          <div className="m"><b>Activity on exchange (15)</b><br />Questions posted, papers submitted and endorsed.</div>
          <div className="m"><b>Patient trust (15)</b><br />Nominations from patients and caregivers, with extra weight for &quot;open to new treatments or tools&quot;.</div>
          <div className="m"><b>Publications, interests, career stage, reach (35)</b></div>
        </div>
        <p className="meta">Doctor profiles are added by the exchange team. Patients can add a doctor who is missing by nominating them.</p>
      </aside>
      <section aria-label="Doctors">
        <AutoSubmitForm action="/champions" className="toolbar">
          <label className="f" htmlFor="f-city">City
            <select id="f-city" name="city" defaultValue={city}>
              <option value="">All cities</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="f" htmlFor="f-spec">Specialty
            <select id="f-spec" name="specialty" defaultValue={spec}>
              <option value="">All specialties</option>
              {specs.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <input type="hidden" name="dual" value="off" />
          <label className="checks" htmlFor="f-dual" style={{ paddingBottom: 8 }}>
            <input type="checkbox" id="f-dual" name="dual" value="on" defaultChecked={dualOnly} /> Clinic + hospital only
          </label>
        </AutoSubmitForm>
        {hidden ? (
          <p className="meta" style={{ margin: "-6px 0 12px" }}>
            {plural(hidden, "patient-nominated doctor")} {hidden > 1 ? "are" : "is"} hidden by this filter until their practice details are added.
          </p>
        ) : null}
        <div className="list">
          {rows.length ? rows.map(({ d, c }) => {
            const reasons = topReasons(c.noms);
            return (
              <article key={d.id} className={"card" + (c.dual ? " hit" : "")}>
                <div>
                  <h3>{d.name}</h3>
                  <div className="meta">
                    {d.specialty || "Specialty not given"}{d.city ? ` · ${d.city}` : ""}{d.years ? ` · ${d.years} yrs` : ""}
                  </div>
                </div>
                <div className="score">{c.total}<small>champion score</small></div>
                <div className="chips">
                  {d.clinic ? <span className="chip">Own clinic: {d.clinic}</span> : <span className="chip ta">No own practice listed</span>}
                  {(d.hospitals ?? []).map((h) => <span key={h} className="chip ta">Consults: {h}</span>)}
                  {c.noms.length ? <span className="chip sig">{plural(c.noms.length, "patient nomination")}</span> : null}
                  {c.posts ? <span className="chip sig">Posted {plural(c.posts, "question")}</span> : null}
                  {c.endorsed ? <span className="chip sig">Endorsed {plural(c.endorsed, "paper")}</span> : null}
                  {d.nominated && !d.verified ? <span className="chip warn">Added by a patient, not verified</span> : null}
                  <SampleChip show={d.sample} label="Sample profile" />
                </div>
                {d.interests || reasons ? (
                  <div className="body">
                    {d.interests ? (
                      <p>
                        <b className="lb">Interests:</b> {d.interests}
                        {d.url ? <> · <a href={d.url} rel="noopener noreferrer nofollow" target="_blank">Profile</a></> : null}
                      </p>
                    ) : null}
                    {reasons ? <p><b className="lb">Patients say:</b> {reasons}</p> : null}
                  </div>
                ) : null}
                <Bars parts={c.parts.map(([label, value, max]) => ({ label, value, max }))} />
              </article>
            );
          }) : <div className="empty">No doctors match these filters.</div>}
        </div>
      </section>
    </div>
  );
}
