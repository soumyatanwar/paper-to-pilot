"use client";

/** A GET form that submits itself whenever a field changes (filters, pickers). */
export function AutoSubmitForm({ children, className, action }: { children: React.ReactNode; className?: string; action: string }) {
  return (
    <form method="get" action={action} className={className} onChange={(e) => e.currentTarget.requestSubmit()}>
      {children}
      <noscript>
        <button type="submit" className="small">Apply</button>
      </noscript>
    </form>
  );
}
