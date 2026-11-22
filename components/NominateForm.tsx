"use client";

import { useActionState, useState } from "react";
import { nominate, type FieldValues, type FormState } from "@/app/actions";
import { TRUST_REASONS } from "@/lib/vocab/concepts";
import { NEW_DOCTOR, NOMINATOR, NOTE_MAX, SINCE } from "@/lib/validate";
import { FormMessages } from "./FormMessages";
import { DoctorOptions, Options, type DoctorOption } from "./Options";

export function NominateForm({ doctors, specialties }: { doctors: DoctorOption[]; specialties: string[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(nominate, { n: 0 });
  return (
    <form key={state.n} action={action} className="panel stack" aria-labelledby="n-h">
      <Fields v={state.values ?? {}} doctors={doctors} specialties={specialties} />
      <FormMessages error={state.error} ok={state.ok} />
      <button type="submit" disabled={pending}>{pending ? "Sending…" : "Send nomination"}</button>
    </form>
  );
}

function Fields({ v, doctors, specialties }: { v: FieldValues; doctors: DoctorOption[]; specialties: string[] }) {
  const s = (k: string, d = "") => (typeof v[k] === "string" ? (v[k] as string) : d);
  const arr = (k: string) => (Array.isArray(v[k]) ? (v[k] as string[]) : typeof v[k] === "string" ? [v[k] as string] : []);
  const [doc, setDoc] = useState(s("doctorId"));
  const [note, setNote] = useState(s("note"));

  return (
    <>
      <div>
        <h2 id="n-h">Nominate a doctor you trust</h2>
        <p className="sub">
          Researchers are looking for doctors to try new treatments, tools and ways of caring for patients. Tell us which doctor you would trust to do this well.
        </p>
      </div>
      <label className="f" htmlFor="n-doc">Your doctor
        <select id="n-doc" name="doctorId" value={doc} onChange={(e) => setDoc(e.target.value)}>
          <option value="">Choose a doctor</option>
          <DoctorOptions doctors={doctors} />
          <option value={NEW_DOCTOR}>My doctor is not on this list</option>
        </select>
      </label>
      {doc === NEW_DOCTOR ? (
        <div className="stack">
          <label className="f" htmlFor="n-name">Doctor&apos;s name
            <input type="text" id="n-name" name="newName" placeholder="Dr. …" defaultValue={s("newName")} maxLength={120} />
          </label>
          <div className="row2">
            <label className="f" htmlFor="n-spec">What they treat
              <select id="n-spec" name="newSpecialty" defaultValue={s("newSpecialty")}>
                <option value="">Not sure</option>
                <Options list={specialties} />
              </select>
            </label>
            <label className="f" htmlFor="n-city">City
              <input type="text" id="n-city" name="newCity" defaultValue={s("newCity")} maxLength={120} />
            </label>
          </div>
          <label className="f" htmlFor="n-clinic">Clinic or hospital where you see them
            <input type="text" id="n-clinic" name="newClinic" defaultValue={s("newClinic")} maxLength={200} />
          </label>
        </div>
      ) : null}
      <fieldset className="checks tight">
        <legend className="meta">Why do you trust them? Pick any</legend>
        {TRUST_REASONS.map((r, i) => (
          <label key={r} htmlFor={`n-r-${i}`}>
            <input type="checkbox" id={`n-r-${i}`} name="reasons[]" value={r} defaultChecked={arr("reasons[]").includes(r)} /> {r}
          </label>
        ))}
      </fieldset>
      <div className="row2">
        <label className="f" htmlFor="n-since">How long have you seen them?
          <select id="n-since" name="since" defaultValue={s("since", "1–3 years")}><Options list={SINCE} /></select>
        </label>
        <label className="f" htmlFor="n-by">I am a
          <select id="n-by" name="by" defaultValue={s("by", "Patient")}><Options list={NOMINATOR} /></select>
        </label>
      </div>
      <label className="f" htmlFor="n-area">Area of care
        <span className="h">Optional. A broad area such as diabetes or child health, not your diagnosis.</span>
        <input type="text" id="n-area" name="area" defaultValue={s("area")} maxLength={120} />
      </label>
      <label className="f" htmlFor="n-note">Anything else researchers should know?
        <span className="h">Optional, up to {NOTE_MAX} characters. Do not include your name, phone number or health details.</span>
        <textarea id="n-note" name="note" maxLength={NOTE_MAX} style={{ minHeight: 60 }} value={note} onChange={(e) => setNote(e.target.value)} />
        <span className="h" aria-live="polite">{NOTE_MAX - note.length} characters left</span>
      </label>
      <label className="checks" htmlFor="n-consent">
        <input type="checkbox" id="n-consent" name="consent" defaultChecked={v.consent === "on"} /> I understand my nomination is anonymous and only the reasons, how long I have seen them and the area of care are shown.
      </label>
    </>
  );
}
