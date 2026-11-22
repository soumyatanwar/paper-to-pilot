export function Options({ list }: { list: readonly string[] }) {
  return (
    <>
      {list.map((v) => (
        <option key={v} value={v}>{v}</option>
      ))}
    </>
  );
}

export interface DoctorOption { id: string; label: string }

export function DoctorOptions({ doctors }: { doctors: DoctorOption[] }) {
  return (
    <>
      {doctors.map((d) => (
        <option key={d.id} value={d.id}>{d.label}</option>
      ))}
    </>
  );
}
