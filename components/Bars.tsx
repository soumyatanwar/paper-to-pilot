/** One small bar per score part. `value` and `max` are in points. */
export function Bars({ parts }: { parts: { label: string; value: number; max: number }[] }) {
  return (
    <div className="bars">
      {parts.map((p) => (
        <div key={p.label} className="bar">
          <div className="t">
            <span>{p.label}</span>
            <span>{Math.round(p.value)}/{p.max}</span>
          </div>
          <div className="tr" role="presentation">
            <div className="fl" style={{ width: `${(p.value / p.max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
