"use client";

import { useActionState } from "react";
import { postQuestion, type FieldValues, type FormState } from "@/app/actions";
import { SETTINGS } from "@/lib/vocab/concepts";
import { FormMessages } from "./FormMessages";
import { Options } from "./Options";

export function QuestionForm({ specialties }: { specialties: string[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(postQuestion, { n: 0 });
  return (
    <form key={state.n} action={action} className="panel stack" aria-labelledby="q-h">
      <Fields v={state.values ?? {}} specialties={specialties} />
      <FormMessages error={state.error} ok={state.ok} />
      <button type="submit" disabled={pending}>{pending ? "Posting…" : "Post question"}</button>
    </form>
  );
}

function Fields({ v, specialties }: { v: FieldValues; specialties: string[] }) {
  const s = (k: string, d = "") => (typeof v[k] === "string" ? (v[k] as string) : d);
  return (
    <>
      <div>
        <h2 id="q-h">Raise a question</h2>
        <p className="sub">Describe a pattern you keep seeing. Write about the group of patients, never an individual.</p>
      </div>
      <label className="f" htmlFor="q-author">Your name
        <input type="text" id="q-author" name="author" required placeholder="Dr. …" defaultValue={s("author")} maxLength={120} />
      </label>
      <div className="row2">
        <label className="f" htmlFor="q-spec">Specialty
          <select id="q-spec" name="specialty" defaultValue={s("specialty", "General Medicine")}><Options list={specialties} /></select>
        </label>
        <label className="f" htmlFor="q-city">City
          <input type="text" id="q-city" name="city" placeholder="Pune" defaultValue={s("city")} maxLength={120} />
        </label>
      </div>
      <label className="f" htmlFor="q-question">Your question
        <span className="h">What would you test if you had the right tool or protocol?</span>
        <textarea id="q-question" name="question" required defaultValue={s("question")} maxLength={4000} />
      </label>
      <label className="f" htmlFor="q-pop">Patient group
        <span className="h">Condition, age band, setting. No names, dates or record numbers.</span>
        <textarea id="q-pop" name="population" style={{ minHeight: 60 }} defaultValue={s("population")} maxLength={4000} />
      </label>
      <div className="row2">
        <label className="f" htmlFor="q-setting">Where you see them
          <select id="q-setting" name="setting" defaultValue={s("setting", "Clinic / OPD")}><Options list={SETTINGS} /></select>
        </label>
        <label className="f" htmlFor="q-vol">Patients per month
          <input type="number" id="q-vol" name="volume" min={0} placeholder="200" defaultValue={s("volume")} />
        </label>
      </div>
      <label className="f" htmlFor="q-tags">Tags
        <span className="h">Comma separated, e.g. diabetic foot, screening</span>
        <input type="text" id="q-tags" name="tags" defaultValue={s("tags")} maxLength={300} />
      </label>
    </>
  );
}
