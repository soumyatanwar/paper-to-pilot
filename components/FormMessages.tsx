export function FormMessages({ error, ok }: { error?: string; ok?: string }) {
  return (
    <>
      {error ? <div className="err" role="alert">{error}</div> : null}
      {ok ? <div className="ok" role="status">{ok}</div> : null}
    </>
  );
}
