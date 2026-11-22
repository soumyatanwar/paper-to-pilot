"use client";

import { useActionState } from "react";
import { endorse, type EndorseState } from "@/app/actions";
import { DoctorOptions, type DoctorOption } from "./Options";

export function EndorseForm({ paperId, doctors }: { paperId: string; doctors: DoctorOption[] }) {
  const [state, action, pending] = useActionState<EndorseState, FormData>(endorse.bind(null, paperId), { n: 0 });
  return (
    <form action={action} className="actions" style={{ marginTop: 0 }}>
      <label className="sr" htmlFor={`e-${paperId}`}>Endorse as</label>
      <select id={`e-${paperId}`} name="doctorId" className="inline" defaultValue="">
        <option value="">Endorse as…</option>
        <DoctorOptions doctors={doctors} />
      </select>
      <button type="submit" className="small ghost" disabled={pending}>I would pilot this</button>
      {state.message ? <span className="meta" role="status">{state.message}</span> : null}
    </form>
  );
}
