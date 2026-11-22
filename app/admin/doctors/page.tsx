import { redirect } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";
import { ImportForm } from "@/components/AdminForms";
import { db } from "@/lib/db";
import { findDuplicates } from "@/lib/dedupe";
import { toDoctor } from "@/lib/data";
import { isAdmin } from "@/lib/server/session";
import type { Doctor } from "@/lib/types";
import { mergeDoctors, verifyDoctor } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Doctors · Team · Clinician Research Exchange", robots: { index: false } };

function Profile({ d, counts }: { d: Doctor; counts: Map<string, { noms: number; ends: number }> }) {
  const c = counts.get(d.id) ?? { noms: 0, ends: 0 };
  return (
    <div className="mini">
      <div className="m">
        <b>{d.name}</b>
        <br />
        <span className="meta">
          {d.specialty || "Specialty not given"}{d.city ? ` · ${d.city}` : ""}{d.clinic ? ` · ${d.clinic}` : ""}
          {(d.hospitals ?? []).length ? ` · ${d.hospitals!.join(", ")}` : ""}
          <br />
          {c.noms} nominations · {c.ends} endorsements · {d.verified ? "verified" : d.nominated ? "added by a patient, not verified" : "not verified"}
        </span>
      </div>
    </div>
  );
}

export default async function AdminDoctorsPage() {
  if (!(await isAdmin())) redirect("/admin");
  const rows = await db.doctor.findMany({ orderBy: { createdAt: "asc" }, include: { _count: { select: { nominations: true, endorsements: true } } } });
  const doctors = rows.map(toDoctor);
  const counts = new Map(rows.map((r) => [r.id, { noms: r._count.nominations, ends: r._count.endorsements }]));
  const pairs = findDuplicates(doctors);
  const unverified = doctors.filter((d) => !d.verified);

  return (
    <div className="stack">
      <AdminNav current="doctors" />
      <section className="panel" aria-labelledby="dp-h">
        <h2 id="dp-h">Likely duplicates ({pairs.length})</h2>
        <p className="sub">
          Same name, matching initials (&quot;Dr. K. Iyer&quot; and &quot;Dr. Kavya Iyer&quot;) or a one-letter difference, in the same city and specialty.
          Merging keeps one profile, moves its nominations and endorsements across, and fills in any missing details.
        </p>
        {pairs.length ? (
          <div className="list">
            {pairs.map(({ a, b, reason }) => (
              <article key={a.id + b.id} className="card" style={{ gridTemplateColumns: "1fr" }}>
                <div className="meta"><span className="chip sig">{reason}</span></div>
                <div className="pair">
                  <Profile d={a} counts={counts} />
                  <Profile d={b} counts={counts} />
                </div>
                <div className="actions">
                  <form action={mergeDoctors.bind(null, a.id, b.id)} className="inline-form">
                    <button type="submit" className="small">Keep {a.name}</button>
                  </form>
                  <form action={mergeDoctors.bind(null, b.id, a.id)} className="inline-form">
                    <button type="submit" className="small">Keep {b.name}</button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        ) : <p className="sub">No likely duplicates.</p>}
      </section>
      <section className="panel" aria-labelledby="uv-h">
        <h2 id="uv-h">Not verified ({unverified.length})</h2>
        <p className="sub">Mostly doctors added by patients. Verify once you have checked their practice details, or import a CSV row with the same name.</p>
        {unverified.length ? (
          <div className="list">
            {unverified.map((d) => (
              <div key={d.id} className="card" style={{ gridTemplateColumns: "1fr auto" }}>
                <Profile d={d} counts={counts} />
                <form action={verifyDoctor.bind(null, d.id)}>
                  <button type="submit" className="small ghost">Mark verified</button>
                </form>
              </div>
            ))}
          </div>
        ) : <p className="sub">Every doctor is verified.</p>}
      </section>
      <section className="panel" aria-labelledby="im-h">
        <h2 id="im-h">Import doctor profiles (CSV)</h2>
        <ImportForm />
      </section>
    </div>
  );
}
