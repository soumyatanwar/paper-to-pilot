import Link from "next/link";
import { AdminNav } from "@/components/AdminNav";
import { LoginForm } from "@/components/AdminForms";
import { db } from "@/lib/db";
import { reviewReasons } from "@/lib/safety/review";
import { isAdmin } from "@/lib/server/session";
import { setVisibility, type RecordKind } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Team · Clinician Research Exchange", robots: { index: false } };

type Vis = "PUBLIC" | "NEEDS_REVIEW" | "HIDDEN";

interface Row { kind: RecordKind; id: string; text: string; who: string; when: Date; visibility: Vis; extra?: string }

function VisButtons({ r }: { r: Row }) {
  const b = (to: Vis, label: string, ghost = true) => (
    <form action={setVisibility.bind(null, r.kind, r.id, to)} className="inline-form">
      <button type="submit" className={"small" + (ghost ? " ghost" : "")}>{label}</button>
    </form>
  );
  return (
    <div className="actions" style={{ marginTop: 0 }}>
      {r.visibility !== "PUBLIC" ? b("PUBLIC", r.visibility === "NEEDS_REVIEW" ? "Approve" : "Restore", false) : null}
      {r.visibility !== "HIDDEN" ? b("HIDDEN", "Hide") : null}
    </div>
  );
}

function Table({ rows, empty, showReasons }: { rows: Row[]; empty: string; showReasons?: boolean }) {
  if (!rows.length) return <p className="sub">{empty}</p>;
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="admin-table">
        <thead><tr><th>Type</th><th>Content</th><th>From</th><th>Date</th><th><span className="sr">Actions</span></th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.kind + r.id}>
              <td>{r.kind}</td>
              <td>
                {r.text}
                {r.extra ? <div className="meta">{r.extra}</div> : null}
                {showReasons ? <div><span className="chip warn">Mentions {reviewReasons(r.text + " " + (r.extra ?? "")).join(" and ") || "possible identifiers"}</span></div> : null}
              </td>
              <td>{r.who}</td>
              <td>{r.when.toISOString().slice(0, 10)}</td>
              <td><VisButtons r={r} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function rows(where: { visibility: Vis } | object, take: number): Promise<Row[]> {
  const [qs, ps, ns] = await Promise.all([
    db.question.findMany({ where, orderBy: { createdAt: "desc" }, take }),
    db.paper.findMany({ where, orderBy: { createdAt: "desc" }, take }),
    db.nomination.findMany({ where, orderBy: { createdAt: "desc" }, take, include: { doctor: { select: { name: true } } } }),
  ]);
  return [
    ...qs.map((q): Row => ({ kind: "question", id: q.id, text: q.question, extra: q.population ?? undefined, who: q.author, when: q.createdAt, visibility: q.visibility })),
    ...ps.map((p): Row => ({ kind: "paper", id: p.id, text: p.title, extra: [p.summary, p.claim, p.population, p.limits].filter(Boolean).join(" · "), who: p.submitter ?? "", when: p.createdAt, visibility: p.visibility })),
    ...ns.map((n): Row => ({ kind: "nomination", id: n.id, text: `Nominated ${n.doctor.name}: ${n.reasons.join(", ")}`, extra: n.note ?? undefined, who: n.by, when: n.createdAt, visibility: n.visibility })),
  ].sort((a, b) => b.when.getTime() - a.when.getTime());
}

export default async function AdminPage() {
  if (!(await isAdmin())) {
    return (
      <>
        <LoginForm />
        <p className="meta" style={{ marginTop: 12 }}>Not on the team? <Link href="/questions">Back to the exchange</Link>.</p>
      </>
    );
  }
  const [review, hidden, recent] = await Promise.all([
    rows({ visibility: "NEEDS_REVIEW" }, 100),
    rows({ visibility: "HIDDEN" }, 100),
    rows({ visibility: "PUBLIC" }, 25),
  ]);

  return (
    <div className="stack">
      <AdminNav current="content" />
      <section className="panel" aria-labelledby="rq-h">
        <h2 id="rq-h">Waiting for review ({review.length})</h2>
        <p className="sub">These posts mention something that could point to one patient. They stay hidden until approved.</p>
        <Table rows={review} empty="Nothing waiting for review." showReasons />
      </section>
      <section className="panel" aria-labelledby="rc-h">
        <h2 id="rc-h">Recent public posts</h2>
        <p className="sub">Latest 25 of each kind. Nomination notes are shown here only, never publicly.</p>
        <Table rows={recent} empty="No posts yet." />
      </section>
      <section className="panel" aria-labelledby="hd-h">
        <h2 id="hd-h">Hidden ({hidden.length})</h2>
        <Table rows={hidden} empty="Nothing hidden." />
      </section>
    </div>
  );
}
