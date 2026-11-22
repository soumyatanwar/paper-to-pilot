"use client";

import { useActionState } from "react";
import { importCsv, login, type ImportState } from "@/app/admin/actions";
import { CSV_TEMPLATE } from "@/lib/import/csv";
import { FormMessages } from "./FormMessages";

export function LoginForm() {
  const [state, action, pending] = useActionState<{ error?: string }, FormData>(login, {});
  return (
    <form action={action} className="panel stack" style={{ maxWidth: 420 }} aria-labelledby="login-h">
      <div>
        <h2 id="login-h">Exchange team</h2>
        <p className="sub">Moderation, doctor imports and duplicate review. Enter the team password.</p>
      </div>
      <label className="f" htmlFor="admin-pw">Password
        <input type="password" id="admin-pw" name="password" autoComplete="current-password" required />
      </label>
      <FormMessages error={state.error} />
      <button type="submit" disabled={pending}>Sign in</button>
    </form>
  );
}

export function ImportForm() {
  const [state, action, pending] = useActionState<ImportState, FormData>(importCsv, { n: 0 });
  return (
    <form action={action} className="stack">
      <p className="sub" style={{ margin: 0 }}>Paste rows you have collected. Hospitals separated by semicolons. Header row required.</p>
      <pre className="tpl">{CSV_TEMPLATE}</pre>
      <label className="f" htmlFor="csv-in">CSV rows
        <textarea id="csv-in" name="csv" key={state.message ? state.n : "csv"} style={{ minHeight: 120 }} />
      </label>
      <FormMessages error={state.error} ok={state.message} />
      <div><button type="submit" className="small" disabled={pending}>Import</button></div>
    </form>
  );
}
