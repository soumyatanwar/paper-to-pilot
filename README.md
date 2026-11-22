YouTube Demo Intro: https://youtu.be/f-Nbrr6T-IY

# paper-to-pilot

**Clinician Research Exchange**: a place where clinicians' unanswered questions meet the papers and inventions that could answer them, and where the doctors most likely to run a pilot are identified.

- **Clinicians** post patterns they keep seeing in their patients and want to study.
- **Doctors, inventors and independent researchers** submit papers, patents and inventions, annotated so they can be matched.
- **Patients and caregivers** nominate doctors they trust to try something new.

A match engine pairs questions with papers. A champion score then ranks which doctors would champion and run a pilot.

> This repo is the full app, built from a single-page prototype (kept in `reference/`). See [`docs/design-plan.md`](docs/design-plan.md) for the plan and status.

## What it does

### 1. Clinician questions
A clinician describes a pattern they see across a group of patients: the question, the patient group, the setting, patients per month and tags. Before posting, the text is checked for anything that looks like a patient identifier: a 10-digit number, a date, a record or ID number, a patient name or an email. If one is found, posting is blocked. Other clinicians click **I see this too** to show that a pattern is shared across practices, and questions are ranked by these votes.

### 2. Papers
A submitter picks a role (doctor, inventor or independent researcher) and pastes a title, source link, type, evidence stage and abstract. Conditions are detected from the text as they type, and they can add annotations:
- any conditions the text missed
- the settings where it works
- the main claim and the population studied
- what a pilot needs
- known limitations

A doctor's own submission counts as their endorsement.

### 3. Endorsements
Doctors mark a paper **I would pilot this**. An endorsement raises the paper's match score and the doctor's activity score, and it puts that doctor first among the paper's likely champions.

### 4. Patient nominations
Patients and caregivers nominate a doctor they trust and say why: they listen, are open to new treatments or tools, follow up, are honest about risks, or take time with family. Nominations are anonymous. A doctor not yet on the list is added as *not verified* until their practice details are confirmed.

### 5. Champions
Doctor profiles can be imported as CSV. Each doctor gets a champion score out of 100:

| Part | Points |
|---|---|
| Own clinic + hospital consultancy | 20 |
| Trial experience | 15 |
| Activity on the exchange | 15 |
| Patient trust (nominations) | 15 |
| Publications | 10 |
| Interests and teaching | 10 |
| Career stage | 10 |
| Patient reach | 5 |

The **Clinic + hospital** filter is on by default. Doctors who run their own practice and also consult at a hospital can decide quickly in their clinic and bring a hospital site in later.

### 6. Matching
Start from a question to rank papers, or from a paper to rank questions. Each pair gets a score out of 100:

| Part | Weight |
|---|---|
| Condition fit (shared conditions; same therapeutic area gets partial credit) | 45% |
| Text similarity (TF-IDF) | 25% |
| Setting fit | 15% |
| Evidence stage (concept → bench → pilot data → validated) | 10% |
| Doctor endorsements | 5% |

Each result shows why it matched: shared conditions, setting fit, endorsements, and a bar for each part of the score. A side panel lists the likely champions for that match.

## Data principles
- **No patient-identifiable information.** Only aggregated patterns and questions about groups of patients are collected, never individual cases. Identifier checks run on every free-text field.
- **Open to any city.** The base of clinicians, doctors and papers is collected from anywhere. The sample data is illustrative only.
- Clinicians are consulted on which data-protection policy applies before real data is collected.

## Status

Phases 0–5 of [`docs/design-plan.md`](docs/design-plan.md) are built: the five sections, a Postgres database, every write flow, the team tools and the test suite. **Sign-in is not built yet (Phase 6).** Until then:
- authors are the names people type, and anyone can endorse as any listed doctor (as in the prototype)
- votes and nominations are limited to one per browser (a cookie), and writes are rate-limited per connection
- the team area is protected by one shared password (`ADMIN_SECRET`)

## Running it

Requires Node 22 and PostgreSQL 16 (or `docker compose up -d db`).

```bash
cp .env.example .env      # then set ADMIN_SECRET and RATE_LIMIT_SALT
npm install               # also generates the Prisma client
npm run db:migrate        # apply migrations
npm run db:seed           # optional: load the illustrative sample data (never in production)
npm run dev               # http://localhost:3000
```

The team area is at `/admin`: review queue, hide or restore posts, CSV import of doctor profiles, duplicate-doctor merge and verification.

### Tests

```bash
npm test           # unit + parity tests (Vitest)
npm run typecheck
npm run lint
npm run e2e        # Playwright: every flow, accessibility (light + dark), phone width
```

`npm run e2e` creates a fresh database named `exchange_e2e_<timestamp>` for each run (it never resets an existing one), builds the app and runs against it. Locally these test databases accumulate; drop them when you like.

### Deploying

Any Node host plus managed Postgres works (for example Vercel, Render or Railway with Neon or Supabase).
1. Set `DATABASE_URL`, `ADMIN_SECRET` (long and random) and `RATE_LIMIT_SALT`. The team area stays locked if `ADMIN_SECRET` is unset, or left as `change-me` in production.
2. Run `npm run db:migrate` on each deploy, before starting the app. **Do not run the seed in production.**
3. Rate limiting reads the client IP from `x-forwarded-for`, so deploy behind a proxy that sets it (all the hosts above do).
4. Confirm the data-protection policy with participating clinicians before collecting real data (see `/privacy`).

## Code layout
- `lib/`: pure logic, no database or React. `matching/` (conditions, TF-IDF, match score), `scoring/` (champion score), `safety/` (identifier check, review heuristic), `import/` (CSV), `dedupe.ts` (duplicate doctors), `validate.ts` (form rules), `vocab/` (conditions list).
- `lib/data.ts`, `lib/db.ts`, `lib/server/`: database access, the browser cookie, rate limiting, the admin session.
- `app/`: Next.js pages and server actions (`app/actions.ts`, `app/admin/actions.ts`). `components/`: forms and UI pieces.
- `prisma/`: schema, migrations, seed.
- `reference/clinician-research-exchange.html`: the original prototype, the source of truth for scoring. `tests/golden/` holds its recorded output (`npm run golden`); `tests/parity.test.ts` checks that `lib/` reproduces it exactly.

### Differences from the prototype
- **Patient-name check fixed.** The prototype's pattern was case-sensitive and never caught names like "Mrs. Sharma".
- **Second identifier check.** Posts mentioning a ward or bed number, an exact age with details about one person, or a recent event involving one patient are saved but held for review.
- **"I see this too" is a toggle**, once per browser, and nominations are limited to one per browser per doctor.
- **CSV import moved to the team area**, which also adds duplicate review, merge and verification.
- **The "signal" amber is a little darker** (`#8F5E05`) to meet WCAG AA contrast.
- **The champions note counting hidden patient-added doctors** now respects the city and specialty filters.

## License
See [LICENSE](LICENSE).
