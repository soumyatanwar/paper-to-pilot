// Request-scoped helpers for server actions and pages. No sign-in yet (Phase 6).
import "server-only";
import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { db } from "../db";

const VOTER_COOKIE = "cre_voter";
const ADMIN_COOKIE = "cre_admin";
const YEAR = 60 * 60 * 24 * 365;

/** Anonymous per-browser id, used to stop repeat votes and nominations. Read-only in pages. */
export async function readVoterKey(): Promise<string | undefined> {
  return (await cookies()).get(VOTER_COOKIE)?.value;
}

/** Same, but creates the cookie if missing. Only callable from a server action. */
export async function voterKey(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(VOTER_COOKIE)?.value;
  if (existing && /^[0-9a-f-]{36}$/.test(existing)) return existing;
  const id = randomUUID();
  jar.set(VOTER_COOKIE, id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: YEAR, path: "/" });
  return id;
}

async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "local").trim();
}

export const RATE_LIMIT = { max: Number(process.env.RATE_LIMIT_MAX ?? 30), windowMinutes: 10 };

/**
 * Records a write and reports whether this connection is over the limit
 * (default 30 writes per 10 minutes). IPs are stored only as salted hashes.
 */
export async function overRateLimit(): Promise<boolean> {
  const key = createHash("sha256").update((process.env.RATE_LIMIT_SALT ?? "") + (await clientIp())).digest("hex").slice(0, 32);
  const since = new Date(Date.now() - RATE_LIMIT.windowMinutes * 60_000);
  const recent = await db.writeEvent.count({ where: { key, createdAt: { gte: since } } });
  if (recent >= RATE_LIMIT.max) return true;
  await db.writeEvent.create({ data: { key } });
  if (Math.random() < 0.02) await db.writeEvent.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 86_400_000) } } });
  return false;
}

export const RATE_LIMIT_MESSAGE = "Too many changes from your connection in the last few minutes. Please try again shortly.";

// ---- Admin: a single shared secret until sign-in exists ----

function adminToken(): string | null {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || (secret === "change-me" && process.env.NODE_ENV === "production")) return null;
  return createHmac("sha256", secret).update("cre-admin-v1").digest("hex");
}

export function checkAdminPassword(pw: string): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || !adminToken()) return false;
  const a = createHash("sha256").update(pw).digest(), b = createHash("sha256").update(secret).digest();
  return timingSafeEqual(a, b);
}

export async function setAdminSession(): Promise<void> {
  const t = adminToken();
  if (t) (await cookies()).set(ADMIN_COOKIE, t, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 8, path: "/" });
}

export async function clearAdminSession(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  const t = adminToken();
  const c = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!t || !c || c.length !== t.length) return false;
  return timingSafeEqual(Buffer.from(c), Buffer.from(t));
}
