import { CONCEPT_MAP } from "@/lib/vocab/concepts";

/** Condition chips followed by their therapeutic areas, as in the prototype. */
export function ConceptChips({ ids }: { ids: string[] }) {
  if (!ids.length) return <span className="chip ta">No conditions detected yet</span>;
  const areas = [...new Set(ids.map((c) => CONCEPT_MAP[c].ta))];
  return (
    <>
      {ids.map((c) => (
        <span key={c} className="chip">{CONCEPT_MAP[c].label}</span>
      ))}
      {areas.map((t) => (
        <span key={t} className="chip ta">{t}</span>
      ))}
    </>
  );
}

export function SampleChip({ show, label = "Sample" }: { show?: boolean; label?: string }) {
  return show ? <span className="chip sample">{label}</span> : null;
}
