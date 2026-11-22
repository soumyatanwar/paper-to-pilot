"use client";

import { useState, useTransition } from "react";
import { toggleVote } from "@/app/actions";

export function VoteButton({ id, voted }: { id: string; voted: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <>
      <button
        type="button"
        className="small ghost"
        aria-pressed={voted}
        disabled={pending}
        onClick={() => start(async () => setError((await toggleVote(id)).error ?? ""))}
      >
        {voted ? "✓ You see this too" : "I see this too"}
      </button>
      {error ? <span className="meta" role="alert">{error}</span> : null}
    </>
  );
}
