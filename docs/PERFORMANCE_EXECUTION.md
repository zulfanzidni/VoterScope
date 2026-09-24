# VoterScope — performance plan: execution status

Companion to `PERFORMANCE_PLAN.md` (the analysis). That document records what was
measured and what was proposed; this one records **what was actually executed**,
what the code proves, and what remains.

**Baseline:** `40c4f93` · 2026-09-24
**Decisions taken:** 2026-09-24 (see *Decisions* below)

---

## Decisions

Two open questions from the analysis were resolved before execution started.

**1. Step 5b (dashboard caching) — deferred.** The plan's caching rationale
(P1-5) was written when the dashboard pulled every voter row with `findMany` and
aggregated in JavaScript. Step 3 replaced that with O(1) `groupBy` aggregates, so
the remaining win at 101 rows is small.

More importantly, the dashboard is **user-scoped by RBAC**: the aggregate queries
filter on `buildAuthorizedVoterFilter(user)`. A cache keyed only by route would
serve one user's voter counts to another — a data-leak bug, not a perf tweak. Any
future caching must key on the user's scope explicitly.

Step 5a (loading/Suspense) proceeds — it is pure perceived speed with no
correctness surface.

**2. Pre-existing proxy security-header bug — folded into Step D.** The
`proxy.ts` redirect (`:59`, `:70`) and 401 (`:48`, `:65`) paths return responses
that never pass through `addSecurityHeaders()`; only the `NextResponse.next()`
path (`:31`) does. Confirmed live: an unauthenticated `/dashboard` request
returns 307 with no CSP or `X-Frame-Options`. Pre-existing, not a regression.

---

## Corrections to the analysis document

Four claims in `PERFORMANCE_PLAN.md` did not survive verification. They are
listed here rather than silently edited out, so the record stays honest.

| Claim | Verdict | Evidence |
|---|---|---|
| P2-5 · `Access-Control-Allow-Origin: *` on HTML responses | **False** | Appears nowhere in source or history. `git log -S "Access-Control-Allow-Origin" --all` is empty; the only match anywhere is the plan document itself. |
| P2-5 · `next.config.ts` comment says "applied via middleware" | **Already fixed** | `next.config.ts:4` reads "applied by proxy.ts (Next 16's rename of middleware)". |
| P2-4 · rate limiter needs flagging in the README | **Already documented** | `lib/security/rate-limit.ts:4-6` carries the warning verbatim: resets on restart, does not work across processes. |
| P0-2 · "reuse the already-fetched user instead of re-reading" | **Already true** | `app/api/auth/login/route.ts:69` fetches once; the value is reused at `:116` and `:139`. No second read exists. |

The P0-2 mechanism itself (an awaited audit INSERT on the response path) **is**
real and is addressed by Step A.

---

## Status

| Step | Finding | Status |
|---|---|---|
| 1 | P0-1 pooler params | ✅ Done (Docker) · ⚠️ Vercel unverified |
| 2 | P0-2 audit off login path | ✅ Done |
| 3 | P1-1, P1-2 SQL aggregation | ✅ Done |
| 4a | P1-3 recharts code-split | ✅ Done |
| 4b | P2-2 client-side zod | ⏳ Pending |
| 5a | P1-4 loading/Suspense | ⏳ Pending |
| 5b | P1-5 dashboard caching | ⏸ Deferred — see Decisions |
| 6 | P2-1, P2-3, P2-5 cleanups | ⏳ Pending |

Steps 1, 3 and 4a were completed and committed before this document was written;
their sections below record what the committed code does. Steps 2, 4b, 5a and 6
are planned work, described here as intent and updated with results as each lands.

### Step 1 — pooler params

`docker-compose.yml` appends `connection_limit=5` (not the serverless `1`; see the
Step 1 caveat in the analysis — a long-lived container wants a real pool, and the
dashboard issues its aggregates in parallel).

**Still open and only the user can resolve:** whether Vercel's `DATABASE_URL`
matches. If it points at the direct port `5432` rather than the pooler, that alone
explains the 3 s login. This was the highest-impact item in the analysis and it is
**not verifiable from inside the repo**.

### Step 2 — audit writes off the login critical path

`after()` from `next/server` is used for all three audit writes
(`app/api/auth/login/route.ts`). `after()` is deliberately chosen over a floating
promise: on serverless an un-awaited promise can be dropped when the instance
freezes, which would silently lose audit rows — compliance data. `after()` is
tracked by the runtime and completes within the route's max duration.

`await argon2.hash("dummy-…")` on the unknown-user path is **kept on the response
path**: it is the timing-attack defence, and removing it would make user
enumeration possible by response latency. `await session.save()` is likewise kept
— the `Set-Cookie` header must be on the response.

**Measured cost of the deferred write** (direct, against the live database,
n=8, connection warm): `prisma.auditLog.create` — min 175 ms, **median 273 ms**,
avg 367 ms, max 732 ms.

**Measured end-to-end login latency** (local production build, `next start`,
failed-login paths, n=4 per case, connection warm):

| Path | Before (HEAD `40c4f93`) | After | Change |
|---|---|---|---|
| Unknown user | median 566 ms (min 499, max 1077) | **median 353 ms** (min 321, max 703) | **−38 %** |
| Wrong password | median 660 ms (min 556, max 1189) | **median 343 ms** (min 323, max 346) | **−48 %** |

The spread also tightened markedly (max 1189 ms → 346 ms on the wrong-password
path): the response no longer waits on a variable-latency INSERT.

**Audit integrity verified.** Driving all three login outcomes through HTTP and
counting rows in the database afterwards:

```
unknown user      -> HTTP 401   delta 1   (USER_NOT_FOUND)
wrong password    -> HTTP 401   delta 1   (WRONG_PASSWORD)
successful login  -> HTTP 200   delta 1   (LOGIN)
TOTAL new rows: 3 (expected 3)  PASS
```

`after()` runs after the response is sent but is awaited by the runtime before
the instance can be reclaimed, so no rows were lost.

### Step 4b — client-side zod

`zodResolver` removed from the login form; `react-hook-form`'s built-in rules
cover the two fields. Server-side `loginSchema.safeParse` remains authoritative —
client validation is UX only and never a security boundary.

### Step 5a — perceived speed

`app/dashboard/loading.tsx` plus Suspense boundaries around the heavy panels.
Static shell and header paint immediately; the aggregates stream in.

### Step 6 — cleanups

- Duplicate Inter `@import` removed from `app/globals.css` (the font is already
  self-hosted through `next/font` in `app/layout.tsx`). This was render-blocking
  and invisible to the preload scanner.
- CSP tightened accordingly: `fonts.googleapis.com` dropped from `style-src`,
  `fonts.gstatic.com` from `font-src`.
- `proxy.ts` no longer decrypts the session for `/api/*`; every API route
  self-authorizes via `getSessionUser`.
- `proxy.ts` redirect and 401 responses now pass through `addSecurityHeaders()`.
- `engines: { node: ">=20" }` pinned in `package.json`.

---

## Verification

Every step was checked against a running build, not by reading code. The gate
suite (`npm run test`, `tsc --noEmit`, `npm run lint`, `npm run build`) was run
after each step, and the login endpoint was measured before and after Step 2
against a local production server.

### Blocker found during Step 2: ESLint lints the tool-managed skills tree

`npm run lint` failed on `.hermes/skills/nextjs-cache-architecture/assets/revalidate.ts`
with `Parsing error: '(' expected`. The file is a markdown template containing
placeholder syntax (`revalidate[Collection]Cache()`, `CACHE_TAGS.[collection]`)
that is deliberately not valid TypeScript.

`tsc` never saw it — TypeScript's `**/*.ts` glob does not match dot-directories,
so `.hermes/` is invisible to the type-checker. ESLint's flat config has no such
rule, so it walked the tree and choked.

This is the same class of failure as the earlier `skills/` incident, but through a
different tool: a non-dot `skills/` directory broke `next build` (tsc *did* match
it), and the dot-prefixed `.hermes/` directory broke `npm run lint` instead.

Fixed by adding `.hermes/**`, `.agents/**` and `skills/**` to `globalIgnores` in
`eslint.config.mjs`. The directories are tool-managed and regenerated by
`skills add`, so ignoring them is correct — they are not project source.

### Note on measurement hygiene

Two probe bugs were found and corrected mid-verification, both of which would
have produced a flattering but false result:

1. `loginSchema`'s username regex is `/^[a-zA-Z0-9_]+$/` — hyphens are rejected
   with **422 before any database work**. Probes using hyphenated usernames were
   silently measuring the ~20 ms Zod-reject path while reporting it as the
   "unknown user" cost.
2. Exporting `.env` into the shell (`set -a && . ./.env`) leaks `NODE_ENV=development`
   into the session. `next build` then runs in development mode and fails
   prerendering `/_global-error` with `Cannot read properties of null (reading
   'useContext')` — a confusing, unrelated-looking error. Unset the exported
   variables before building.
