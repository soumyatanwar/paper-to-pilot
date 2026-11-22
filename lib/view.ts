// Small helpers shared by pages.
import type { Doctor } from "./types";
import type { DoctorOption } from "@/components/Options";

export const SPECIALTY_EXTRAS = ["Community Medicine", "Endocrinology", "Neonatology"];

export function specialtyList(doctors: Doctor[]): string[] {
  return [...new Set(doctors.map((d) => d.specialty ?? "").filter(Boolean).concat(SPECIALTY_EXTRAS))].sort();
}

export function doctorOptions(doctors: Doctor[]): DoctorOption[] {
  return [...doctors]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((d) => ({ id: d.id, label: `${d.name} · ${d.specialty || "Specialty not given"}${d.city ? ", " + d.city : ""}` }));
}

export function plural(n: number, one: string, many = one + "s"): string {
  return `${n} ${n === 1 ? one : many}`;
}

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export function param(sp: Record<string, string | string[] | undefined>, k: string): string {
  const v = sp[k];
  return Array.isArray(v) ? v[v.length - 1] ?? "" : v ?? "";
}
