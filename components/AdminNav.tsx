import Link from "next/link";
import { logout } from "@/app/admin/actions";

export function AdminNav({ current }: { current: "content" | "doctors" }) {
  return (
    <div className="toolbar" style={{ justifyContent: "space-between" }}>
      <div className="seg" role="group" aria-label="Team pages">
        <Link href="/admin" aria-current={current === "content" ? "true" : undefined}>Review and moderation</Link>
        <Link href="/admin/doctors" aria-current={current === "doctors" ? "true" : undefined}>Doctors</Link>
      </div>
      <form action={logout}><button type="submit" className="small ghost">Sign out</button></form>
    </div>
  );
}
