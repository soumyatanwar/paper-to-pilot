"use client";

import { useActionState, useState } from "react";
import { submitPaper, type FieldValues, type FormState } from "@/app/actions";
import { concepts } from "@/lib/matching/detect";
import { CONCEPTS, NEEDS, ROLES, SETTINGS, STAGES } from "@/lib/vocab/concepts";
import { PAPER_KINDS } from "@/lib/validate";
import { ConceptChips } from "./Chips";
import { FormMessages } from "./FormMessages";
import { Options } from "./Options";

const ROLE_HINT: Record<string, string> = {
  Doctor: "Your submission counts as an endorsement and adds to your activity on the exchange.",
  Inventor: "Tell clinicians what you need from a pilot site. Doctors can endorse your paper.",
  "Independent researcher": "Summaries from independent researchers are marked as such until a doctor endorses them.",
};

export function PaperForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(submitPaper, { n: 0 });
  return (
    <form key={state.n} action={action} className="panel stack" aria-labelledby="p-h">
      <Fields v={state.values ?? {}} />
      <FormMessages error={state.error} ok={state.ok} />
      <button type="submit" disabled={pending}>{pending ? "Adding…" : "Add paper to the exchange"}</button>
    </form>
  );
}

function Fields({ v }: { v: FieldValues }) {
  const s = (k: string, d = "") => (typeof v[k] === "string" ? (v[k] as string) : d);
  const arr = (k: string) => (Array.isArray(v[k]) ? (v[k] as string[]) : typeof v[k] === "string" ? [v[k] as string] : []);

  const [role, setRole] = useState(ROLES.includes(s("role") as never) ? s("role") : "Inventor");
  const [text, setText] = useState({ title: s("title"), summary: s("summary"), claim: s("claim") });
  const [ticked, setTicked] = useState<Set<string>>(() => new Set(arr("concepts[]")));
  const [touched, setTouched] = useState<Set<string>>(() => new Set(arr("concepts[]")));
  const found = concepts(`${text.title} ${text.summary} ${text.claim}`);

  // Detected conditions tick themselves, unless the submitter changed that box by hand.
  const onText = (k: keyof typeof text) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const next = { ...text, [k]: e.target.value };
    setText(next);
    const f = concepts(`${next.title} ${next.summary} ${next.claim}`);
    setTicked((prev) => {
      const out = new Set(prev);
      f.forEach((c) => !touched.has(c) && out.add(c));
      return out;
    });
  };
  const toggle = (id: string, on: boolean) => {
    setTouched((t) => new Set(t).add(id));
    setTicked((t) => {
      const out = new Set(t);
      if (on) out.add(id);
      else out.delete(id);
      return out;
    });
  };

  return (
    <>
      <div>
        <h2 id="p-h">Submit a paper</h2>
        <p className="sub">Paste the abstract or claims from a paper, patent or licensing listing, then annotate it so it can be matched.</p>
      </div>
      <div className="stack" style={{ gap: 6 }}>
        <span className="meta" id="p-role-l">I am submitting as</span>
        <div className="seg" role="group" aria-labelledby="p-role-l">
          {ROLES.map((r) => (
            <button type="button" key={r} aria-pressed={role === r} onClick={() => setRole(r)}>{r}</button>
          ))}
        </div>
        <input type="hidden" name="role" value={role} />
        <span className="meta">{ROLE_HINT[role]}</span>
      </div>
      <label className="f" htmlFor="p-name">Your name
        {role === "Doctor" ? <span className="h">Use the name on your profile so the endorsement links to you</span> : null}
        <input type="text" id="p-name" name="name" required defaultValue={s("name")} maxLength={120} />
      </label>
      <label className="f" htmlFor="p-title">Paper or invention title
        <input type="text" id="p-title" name="title" required value={text.title} onChange={onText("title")} maxLength={300} />
      </label>
      <label className="f" htmlFor="p-source">Source link
        <span className="h">DOI, PubMed, patent or listing URL</span>
        <input type="url" id="p-source" name="source" placeholder="https://" defaultValue={s("source")} maxLength={500} />
      </label>
      <div className="row2">
        <label className="f" htmlFor="p-kind">Type
          <select id="p-kind" name="kind" defaultValue={s("kind", "Device")}><Options list={PAPER_KINDS} /></select>
        </label>
        <label className="f" htmlFor="p-stage">Evidence stage
          <select id="p-stage" name="stage" defaultValue={s("stage", "Pilot data")}><Options list={Object.keys(STAGES)} /></select>
        </label>
      </div>
      <label className="f" htmlFor="p-summary">Abstract or summary
        <textarea id="p-summary" name="summary" required value={text.summary} onChange={onText("summary")} maxLength={4000} />
      </label>
      <div className="stack" style={{ gap: 6 }}>
        <span className="meta">Detected from your text</span>
        <div className="chips" id="p-preview" aria-live="polite"><ConceptChips ids={found} /></div>
      </div>

      <h3 className="sec">Annotations</h3>
      <fieldset className="checks tight">
        <legend className="meta">Conditions it targets: add any the text missed</legend>
        {CONCEPTS.map((c) => (
          <label key={c.id} htmlFor={`p-c-${c.id}`}>
            <input type="checkbox" id={`p-c-${c.id}`} name="concepts[]" value={c.id} checked={ticked.has(c.id)} onChange={(e) => toggle(c.id, e.target.checked)} /> {c.label}
          </label>
        ))}
      </fieldset>
      <fieldset className="checks tight">
        <legend className="meta">Settings where it works</legend>
        {SETTINGS.map((x, i) => (
          <label key={x} htmlFor={`p-s-${i}`}>
            <input type="checkbox" id={`p-s-${i}`} name="settings[]" value={x} defaultChecked={arr("settings[]").includes(x)} /> {x}
          </label>
        ))}
      </fieldset>
      <label className="f" htmlFor="p-claim">Main claim in one line
        <input type="text" id="p-claim" name="claim" placeholder="What does it change for patients or clinicians?" value={text.claim} onChange={onText("claim")} maxLength={300} />
      </label>
      <label className="f" htmlFor="p-pop">Population studied and size
        <input type="text" id="p-pop" name="population" placeholder="e.g. 120 adults with type 2 diabetes, one centre" defaultValue={s("population")} maxLength={300} />
      </label>
      <fieldset className="checks tight">
        <legend className="meta">What a pilot needs</legend>
        {NEEDS.map((x, i) => (
          <label key={x} htmlFor={`p-n-${i}`}>
            <input type="checkbox" id={`p-n-${i}`} name="needs[]" value={x} defaultChecked={arr("needs[]").includes(x)} /> {x}
          </label>
        ))}
      </fieldset>
      <label className="f" htmlFor="p-limits">Known limitations
        <textarea id="p-limits" name="limits" style={{ minHeight: 56 }} defaultValue={s("limits")} maxLength={4000} />
      </label>
      <label className="checks" htmlFor="p-rights">
        <input type="checkbox" id="p-rights" name="rights" defaultChecked={v.rights === "on"} /> I wrote this summary, or I have permission to share it
      </label>
    </>
  );
}
