# Design plan: Clinician Research Exchange → production app

Source material:

- **Prototype**: the "Clinician Research Exchange" artifact. It is one HTML file (~560 lines of vanilla JS) with five tabs. All its data sits in a JSON block inside the page, and each change is saved by republishing the whole page.
- **Spec**: the "Clinician Research Exchange: flows" doc. It covers the seven flows, both scoring tables and the known gaps.

The goal is a working multi-user web app that keeps the prototype's behaviour and look. It also needs to close the gaps the flows doc lists: no sign-in, endorsing as anyone, unlimited votes and nominations, exact-name dedupe only, a hand-written vocabulary, and a pattern-only identifier check.

---

## 1. What the prototype does (scope to preserve)

| Tab | Records | Key behaviour |
|---|---|---|
| Clinician questions | `Question` | Post form with an identifier (PHI) check; "I see this too" votes; sorted by votes; "Find matching papers" deep-links to Match |
| Papers | `Invention` + annotations | Role toggle (Doctor / Inventor / Independent researcher) that keeps typed input; live condition detection that auto-ticks boxes unless the user touched them; six ordered validation checks; a doctor submitter auto-endorses when their name matches a profile; "I would pilot this" endorsement (once per doctor) |
| Champions | `Doctor` | City / specialty / "Clinic + hospital only" filters; a note on how many unverified patient-nominated doctors are hidden; champion score with 8 part bars; CSV import that merges into unverified patient-added profiles |
| Nominate a doctor | `Nomination` | Pick a listed doctor or add a new one (creates an "Added by a patient, not verified" profile); trust reasons; consent; PHI check; "Most nominated" side list |
| Match | derived | Question→papers or paper→questions; 0–100 match score with part bars and reason chips; "Likely champions" side panel |

Scoring logic, ported exactly (the numbers live in the flows doc and in `matchPair` / `champ` / `relevantChampions`):

- **Match** = 45% condition fit + 25% TF-IDF cosine (×2.2, capped at 1) + 15% setting (1 or 0.3) + 10% evidence stage + 5% endorsements (capped at 2).
- **Champion** = 20 clinic+hospital, 15 trials, 15 exchange activity, 15 patient trust, 10 publications, 10 interests/teaching, 10 career stage, 5 reach.
- **Relevant champions** = 0.75 × champion score + 15 for an interest hit + 10 for an endorsement. Sorted by endorsed, then dual practice, then score.
- **Highlight rule**: the top 3 results (question mode) or top 2 (paper mode) get the accent border when their score is ≥ 45.

Visual system to keep: IBM Plex Sans / Sans Condensed / Mono; the `--paper / --panel / --ink / --accent / --signal / --warn` tokens with a dark-mode set; the two-column "case sheet" layout; cards with a score at top right; chips (`condition`, `therapeutic area`, `signal`, `sample`, `warn`).

---

## 2. Architecture

**Recommended stack:** Next.js (App Router) + TypeScript + PostgreSQL via Prisma, with Auth.js (email magic link) for sign-in. Deploy on Vercel or Render with a managed Postgres instance.

Why: the prototype is form-plus-list CRUD with derived scores. Server components plus server actions fit that directly. A separate SPA and API would add a second deploy for little gain.

```
app/
  (exchange)/
    questions/page.tsx      # list + post form
    papers/page.tsx         # list + submit form + endorse
    champions/page.tsx      # filters, cards, CSV import (admin)
    nominate/page.tsx       # patient form + most nominated
    match/page.tsx          # ?question=<id> | ?paper=<id>
  api/                      # only where a client needs JSON (live condition preview)
lib/
  vocab/concepts.ts         # CONCEPTS, settings, stages, trust reasons, needs
  matching/detect.ts        # norm, hasTerm, concepts(), qText, iText
  matching/similarity.ts    # tokens, idf, vec, cosine
  matching/match.ts         # matchPair
  scoring/champion.ts       # champ, relevantChampions
  safety/phi.ts             # phiProblems
  import/csv.ts             # parseCsvLine, row → Doctor
  db.ts                     # Prisma client
components/                 # Card, Chip, ScoreBars, Seg, Field, Panel, Tabs
styles/tokens.css           # the prototype's :root tokens, unchanged
prisma/schema.prisma, prisma/seed.ts
```

**Rule:** everything in `lib/matching`, `lib/scoring`, `lib/safety` and `lib/import` is a pure function over plain objects. It never touches the database or React, so it can be tested on its own and reused on both server and client.

### Where scoring runs

- At this scale (tens to low thousands of records), compute matches **on request on the server**: load the questions and papers, build the IDF table, score.
- Later, cache the IDF table and each record's detected concepts, refreshing them when a record is written. Move to precomputed `MatchScore` rows only if latency requires it. The IDF depends on the whole corpus, so any precompute must be invalidated on every insert.
- Live condition detection while someone types a paper runs **client-side** from the same `lib/matching/detect.ts`.

---

## 3. Data model

The prototype's denormalised JSON becomes relational tables. The main changes are that votes, endorsements and nominations become rows tied to a signed-in user, and hospitals become their own table.

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  role      Role     // CLINICIAN | INVENTOR | RESEARCHER | PATIENT | ADMIN
  doctor    Doctor?  @relation(fields: [doctorId], references: [id])
  doctorId  String?  @unique   // set once a clinician claims/verifies a profile
  createdAt DateTime @default(now())
}

model Doctor {
  id         String   @id @default(cuid())
  name       String
  nameKey    String   // normalised name, indexed for dedupe
  specialty  String?
  city       String?
  years      Int      @default(0)
  clinic     String?
  hospitals  DoctorHospital[]
  pubs       Int      @default(0)
  trials     Int      @default(0)
  teaching   Boolean  @default(false)
  reviews    Int      @default(0)
  interests  String?
  url        String?
  source     DoctorSource // IMPORT | PATIENT_NOMINATED | SELF
  verified   Boolean  @default(false)
  isSample   Boolean  @default(false)
  @@index([nameKey])
}

model Hospital       { id String @id @default(cuid()) name String @unique doctors DoctorHospital[] }
model DoctorHospital { doctorId String  hospitalId String  @@id([doctorId, hospitalId]) }

model Question {
  id         String  @id @default(cuid())
  author     User    @relation(fields: [authorId], references: [id])
  authorId   String
  specialty  String
  city       String?
  setting    Setting
  volume     Int     @default(0)
  question   String
  population String?
  tags       String[]
  votes      QuestionVote[]
  isSample   Boolean @default(false)
  createdAt  DateTime @default(now())
}
model QuestionVote { questionId String  userId String  @@id([questionId, userId]) }

model Paper {                      // "Invention" in the prototype
  id          String   @id @default(cuid())
  title       String
  kind        PaperKind            // DEVICE | DIAGNOSTIC | SOFTWARE | PROTOCOL
  stage       EvidenceStage        // CONCEPT | BENCH | PILOT_DATA | VALIDATED
  settings    Setting[]
  summary     String
  sourceUrl   String?
  submitter   User     @relation(fields: [submitterId], references: [id])
  submitterId String
  role        SubmitterRole
  conceptIds  String[]             // ticked annotations (tagIds)
  claim       String?
  population  String?
  needs       String[]
  limits      String?
  rightsConfirmed Boolean
  endorsements Endorsement[]
  isSample    Boolean  @default(false)
  createdAt   DateTime @default(now())
}
model Endorsement { paperId String  doctorId String  createdAt DateTime @default(now())  @@id([paperId, doctorId]) }

model Nomination {
  id        String   @id @default(cuid())
  doctorId  String
  by        NominatorKind  // PATIENT | CAREGIVER
  nominator User     @relation(fields: [nominatorId], references: [id])
  nominatorId String       // stored for rate limiting; never shown
  reasons   String[]
  area      String?
  since     String
  note      String?  @db.VarChar(300)
  createdAt DateTime @default(now())
  @@unique([doctorId, nominatorId])  // one nomination per patient per doctor
}
```

`Concept` stays in code (`lib/vocab/concepts.ts`) for v1 so that matching is versioned with the code. It moves to a table only if admins need to edit it (see §6).

Derived values, never stored in v1: a question's vote count, a doctor's champion score, a doctor's activity (posts, endorsed, submitted), and match scores.

---

## 4. Closing the prototype's known gaps

| Gap (from the flows doc) | Fix |
|---|---|
| No sign-in; anyone can post or endorse as anyone | Auth.js magic link. Each write action checks the session. `Question.authorId` and `Paper.submitterId` come from the session, not a typed name. |
| Endorse as any doctor | Only a user linked to a `Doctor` (`User.doctorId`, verified) can endorse, and only as themselves. The "Endorse as…" dropdown is removed. A doctor's own submission auto-endorses by ID, not by name match. |
| Unlimited votes / nominations | `QuestionVote` and `Nomination` primary/unique keys. "I see this too" becomes a toggle. |
| Exact-name dedupe only | Use `nameKey` (prototype's `nameKey()`) plus a fuzzy candidate search: trigram similarity in Postgres (`pg_trgm`), with initials handling and city/specialty as tie-breaks. CSV import and new-doctor nominations show likely duplicates for an admin to merge, not auto-merge. |
| Hand-written 17-concept vocabulary | v1 keeps it (behaviour parity). v2 maps concepts to MeSH/SNOMED IDs and adds synonyms; see §6. |
| Pattern-only identifier check | Keep `phiProblems` and run it **on the server too** (the client check is only for UX). Add a reviewed-before-public flag for posts that trip a softer heuristic (ages plus a place/occupation, ward/bed numbers). An optional NER-based check comes in v2. |

New pieces the prototype didn't need:

- **Roles and permissions.** Clinicians post questions and (once verified) endorse. Inventors and researchers submit papers. Patients nominate. Admins import CSVs, verify doctors and merge duplicates.
- **Doctor verification flow.** A clinician claims a profile, then an admin approves (later: registration-number check).
- **Moderation.** Admins can hide a record. Records keep `createdAt` and an audit trail.
- **Sample data.** `isSample` rows are seeded for demos and staging only, never in production. The "Sample" chip stays.

---

## 5. Build phases

**Phase 0: Scaffold (½ day)**
Next.js + TS + Prisma + Postgres via docker-compose for local development, ESLint/Prettier, Vitest, Playwright, GitHub Actions CI (lint, typecheck, unit, e2e).

**Phase 1: Port the logic with golden tests (1–2 days)**
1. Copy the prototype's JS functions into typed `lib/` modules, unchanged in behaviour.
2. Create golden fixtures: run the original artifact JS in Node against its sample `app-state` and record every `matchPair` score for all 6×12 pairs, every `champ` total and its parts, and `relevantChampions` for each question and paper.
3. Unit tests assert that the TS port reproduces those numbers exactly. This is the main guard against drift while the logic is refactored later.
4. Add tests for `phiProblems`, `concepts()` (plurals, hyphen handling), and CSV parsing (quoted commas, `""` escapes, merge into unverified profiles).

**Phase 2: Data and read-only UI (2–3 days)**
Prisma schema, migrations, seeding from the prototype's sample JSON. Port the CSS tokens and components. Build the five pages read-only, with tabs as real routes. Match uses `?question=` / `?paper=` query params, replacing the `#hash` plus in-memory selection.

**Phase 3: Auth and writes (2–3 days)**
Sign-in and roles. Server actions for: post question, vote, submit paper, endorse, nominate, CSV import (admin). Each has server-side validation that mirrors the prototype's order and messages, and keeps the form's input on error (the prototype's `keepForm`; this falls out of server-action form state). Rate limiting on writes.

**Phase 4: Gap fixes (2 days)**
Doctor claim/verify, the duplicate-candidate review queue for admins, the moderation hide flag, server-side PHI checks, the softer "needs review" heuristic.

**Phase 5: Hardening and launch (1–2 days)**
Accessibility pass (the prototype already uses labels, `aria-pressed`, `role=status/alert` and focus rings; keep them and test with axe). Phone-width layout, dark mode, error and empty states, privacy notice for patients, backups, deploy.

**Later (v2)**
Standard vocabulary (MeSH/SNOMED) and concept admin; embeddings-based similarity in place of, or blended with, TF-IDF; notifications ("a new paper matches your question"); and the parts of the repo's stated goal the prototype doesn't cover yet (see §7).

---

## 6. Testing strategy

- **Unit (Vitest):** all `lib/` modules, golden parity tests, edge cases (empty corpus, question with no concepts, doctor with zero years).
- **Integration:** server actions against a test Postgres: uniqueness (double vote, double endorsement, repeat nomination), permission denials, PHI rejection server-side even when the client check is bypassed.
- **E2E (Playwright):** one test per flow in the flows doc (sections 1–6), including the deep links "Find matching papers" and "See matches", the role toggle keeping input, auto-ticked conditions respecting manual changes, the hidden-by-filter note, and CSV merge marking a profile verified.

---

## 7. Open questions for you

1. **Product scope vs. the README.** The README describes paper-to-pilot as: given a paper or patent, find *the most viable clinical use, the hospitals with that need, the budget owner, and the evidence required for a paid pilot*. The prototype covers clinical use (concepts and matching), hospitals (doctor consultancies) and champions. It has **no budget owner and no "evidence for a paid pilot"** model. Should v1 match the prototype, with those added in v2, or should they be designed in now? If now, `Hospital` grows fields such as department, procurement contact and budget cycle, and `Paper` gets an evidence-gap checklist.
2. **Who are the first users?** One city or network of clinicians, or open sign-up? This decides how strict doctor verification has to be on day one.
3. **Hosting and data residency.** The sample data is India-based. Does patient-adjacent data need to stay in-region (DPDP Act)? That affects the choice of host and database region.
4. **Patients' sign-in.** Magic-link email may not suit all patients. Is phone/OTP (for example, WhatsApp) needed for the nomination flow?
5. **Stack preference.** The plan assumes Next.js + Postgres. Say if your team prefers something else (for example, a Python/FastAPI backend), and the module split above still applies.
