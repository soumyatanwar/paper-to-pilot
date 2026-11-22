// Creates a fresh, uniquely named database for one e2e run, applies migrations and seeds it.
// Non-destructive: it never drops or resets an existing database.
// Usage: node scripts/e2e-db.mjs <database-url>
import { execSync } from "node:child_process";
import pg from "pg";

const url = new URL(process.argv[2]);
const name = url.pathname.slice(1);
if (!/^[a-z0-9_]+$/.test(name)) throw new Error(`unexpected database name: ${name}`);

const admin = new URL(url);
admin.pathname = "/postgres";
const client = new pg.Client({ connectionString: admin.toString() });
await client.connect();
const { rowCount } = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [name]);
if (!rowCount) await client.query(`CREATE DATABASE "${name}"`);
await client.end();

const env = { ...process.env, DATABASE_URL: url.toString() };
execSync("npx prisma migrate deploy", { stdio: "inherit", env });
execSync("npx prisma db seed", { stdio: "inherit", env });
