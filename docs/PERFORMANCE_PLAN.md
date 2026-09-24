# VoterScope — performance analysis & optimization plan

**Target:** https://voter-scope.vercel.app
**Measured:** 2026-09-23, from Indonesia (client side) + direct DB probes (read-only)
**Stack:** Next.js 16.3.5 (Turbopack) · React 19.3 · Prisma 6.19.3 · Supabase Postgres (ap-southeast-1) · Vercel functions (sin1)

---

## Verdict

**The page load is not the problem.** The login page is statically prerendered, edge-cached
and serves in **~230–320 ms** warm (TTFB 129–245 ms). Nothing is wrong with how it loads.

The slowness is in two other places:

| Symptom | Measured | Where |
|---|---|---|
| **Login submit** | **2.9–3.1 s** warm, **6.2 s** cold | `POST /api/auth/login` |
| **Dashboard navigation** | 0.4–1.4 s server work + ~870 KB JS | `/dashboard` |
| Login page load | 0.23–0.32 s | ✅ fine |
| Static assets | `x-vercel-cache: HIT` | ✅ fine |

Region is **co-located** (functions `sin1` ↔ DB `ap-southeast-1`), so no cross-region penalty.

---

## Evidence

### Login endpoint — differential test

| Request path | Does DB work? | Latency |
|---|---|---|
| Empty body → Zod rejects | no | **379–481 ms** |
| Unknown user (read + argon2 + audit write) | yes | **2 894–4 372 ms** |
| Real user, wrong password (read + argon2 + audit write) | yes | **2 835–3 097 ms** |

Baseline function overhead ≈ **400 ms**. Everything DB-touching adds **~2.5 s**.
So the cost is **database round-trips, not argon2** — locally `argon2.verify` is only **109 ms**.

### Database probe (direct, read-only, real data)

| Query | min | variance |
|---|---|---|
| `SELECT 1` (first, includes connect) | **1 589 ms** | — |
| `SELECT 1` (warm) | 188 ms | 188 / 669 / 428 |
| `voter.count` | 195 ms | 195–1 341 |
| unpaginated `voter.findMany` (3 joins) | 518 ms | 518–1 136 |
| full dashboard query set | **427 ms** | 427–1 422 |
| paginated list (take 10) | 163 ms | 163–171 |

Warm variance of **188 → 669 → 428 ms** for a trivial `SELECT 1` is the signature of
**connection setup/queueing**, not query cost. `DATABASE_URL` sets only `pgbouncer=true`
— **no `connection_limit`**.

---

## Findings, ranked

### P0 — Login takes ~3 s

**P0-1 · No `connection_limit` on the pooled URL.**
`DATABASE_URL` carries only `pgbouncer=true`. Prisma's default pool is
`num_physical_cpus * 2 + 1` **per function instance**, and on serverless every cold
instance opens its own. Against Supavisor (port 6543, transaction mode) this queues.
Serverless + pooler needs `connection_limit=1&pool_timeout=20`.
*Evidence: first query 1 589 ms; warm `SELECT 1` swinging 188–669 ms.*

**P0-2 · Two sequential DB round-trips inside the login request, both awaited.**
`user.findUnique` → then `createAuditLog` (`prisma.auditLog.create`) **awaited before the
response is returned**. On the failed path it is worse: `argon2.hash("dummy-…")` (~101 ms+)
*plus* an audit INSERT, all before the 401 goes out.
*Evidence: validation-only 400 ms vs DB-touching 2 900 ms.*

**P0-3 · Prisma engine + native module cold start.**
No `engines` field in `package.json`, no `runtime` export on any route, no `maxDuration`.
Every route is default `nodejs`. `argon2` is a native addon — its first load per instance
is not free.
*Evidence: cold 6 249 ms vs warm 2 939 ms.*

### P1 — Dashboard is heavier than it needs to be

**P1-1 · Unpaginated `voter.findMany` with 3 relation joins, on every dashboard view.**
`app/dashboard/page.tsx` and `app/api/dashboard/stats/route.ts` both pull **every voter in
scope** with `kelurahan`/`kecamatan`/`kabupaten` joined, then aggregate in JavaScript
(`calculateDemographics`, `territoryMap`). Correct at today's **101 rows** (518 ms), but it
is **O(n)** — it degrades linearly and silently.
*Fix: aggregate in SQL (`groupBy` / `count` with `_count`), return only the summary.*

**P1-2 · `/api/dashboard/stats` is dead code.**
Nothing calls it — no client fetch, no test. It duplicates `page.tsx`'s entire query set
*and* carries the same unpaginated `findMany`. Delete it.

**P1-3 · `recharts` is 377 KB raw (~120 KB gzip) statically imported into the dashboard.**
`components/dashboard/DemographicCharts.tsx` is a client component with a top-level
`import { PieChart, BarChart, … } from "recharts"`. There is **no `dynamic()` anywhere in
the codebase** — nothing is code-split. The chart library is in the dashboard's initial JS
even though charts are below the fold.
*Fix: `dynamic(() => import(...), { ssr: false })` so it loads after first paint.*

**P1-4 · No `loading.tsx` and no `Suspense` anywhere.**
Every dashboard route is `ƒ` (dynamic, server-rendered on demand). The user stares at a
blank screen until the **whole** query set resolves. No streaming, no skeleton.

**P1-5 · No caching layer.**
No `unstable_cache`, no `revalidate` on the dashboard query set. The counts and
demographics are recomputed from scratch on every navigation. (The only `revalidate` in the
repo is for the static `kodewilayah` reference data.)

### P2 — Bundle and cleanliness

**P2-1 · Inter is downloaded twice.**
`app/layout.tsx` self-hosts Inter via `next/font/google` (woff2, 48 KB, preloaded) — **and**
`app/globals.css` line 1 also has:
```css
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap");
```
A CSS `@import` is render-blocking and **invisible to the preload scanner**: CSS must
download → parse → then the import is discovered → then fetched. Measured as a serialized
132 ms hop starting at 595 ms. Removing it also lets the CSP drop `fonts.googleapis.com`
and `fonts.gstatic.com` entirely.

**P2-2 · `zod` is shipped to the browser.**
`app/login/LoginForm.tsx` imports `loginSchema` from `lib/validation/schemas.ts` for
`zodResolver`, pulling the schema module — and zod — into a **425 KB** shared chunk
(102 KB gzip). Client-side Zod for a 2-field form is not worth the bytes; the same
validation already runs server-side.

**P2-3 · `proxy.ts` decrypts the session on every request, including API routes.**
The matcher `/((?!_next/static|_next/image|favicon.ico).*)` lets `/api/*` through, where
`getIronSession` decrypts the cookie — then the route calls `getSessionUser()` and decrypts
it **again**. Duplicated crypto per request.

**P2-4 · In-memory rate limiter, and it writes to the DB on rejection.**
`lib/security/rate-limit.ts` uses a module-level `Map`. On serverless this is **per
instance** and resets on cold start, so the limit is neither global nor durable — the file's
own comment says so. Combined with P0-2, a failed login costs a DB write.

**P2-5 · Minor.**
`Access-Control-Allow-Origin: *` on HTML responses; no `engines` pin; `next.config.ts`
comment still says "applied via middleware" though Next 16 renamed it to `proxy.ts`.

---

## Proposed plan

Ordered by **impact ÷ risk**. Each step is independently shippable and reversible.

### Step 1 — Fix the connection (P0-1) ← biggest win, ~5 min
Append to `DATABASE_URL` in Vercel:
```
?pgbouncer=true&connection_limit=1&pool_timeout=20&connect_timeout=15
```
Then re-measure login. **Expected: 2.9 s → sub-1 s.**
*Risk: low. This is the documented Prisma + Supabase serverless configuration.*

### Step 2 — Take the DB writes off the login critical path (P0-2)
- Don't `await` the audit write on the failure path — fire it and let the response go
  (or move it to `after()` from `next/server`).
- Keep `await` on the success path only if you want the audit row guaranteed before the
  session is issued; otherwise `after()` there too.
- Reuse the already-fetched user instead of re-reading.
**Expected: removes ~200–600 ms per attempt.**

### Step 3 — Trim the dashboard query (P1-1, P1-2)
- Replace the unpaginated `findMany` + JS aggregation with SQL `groupBy`/`count`.
- Delete `app/api/dashboard/stats/route.ts` (dead).
**Expected: 427 ms → well under 100 ms, and it stops degrading with data growth.**

### Step 4 — Ship less JS (P1-3, P2-2)
- `dynamic()` import for `DemographicCharts`.
- Drop `zodResolver` from the login form (or move the shared schema so it isn't pulled
  client-side).
**Expected: dashboard initial JS −120 KB gzip; shared chunk −~60 KB gzip.**

### Step 5 — Perceived speed (P1-4, P1-5)
- Add `loading.tsx` skeletons to `/dashboard/*`.
- Wrap the heavy panels in `Suspense`.
- Add `unstable_cache` (short TTL) on the dashboard aggregates.
**Expected: first paint immediately instead of a blank wait.**

### Step 6 — Cleanups (P2-1, P2-3, P2-4, P2-5)
- Delete the duplicate font `@import`; tighten CSP to `font-src 'self'`.
- Skip the session decrypt in `proxy.ts` for `/api/*` (the routes already authorise).
- Note the rate limiter as a known demo limitation (already documented) — no change needed
  for a demo, but flag it in the README.

---

## What I need from you

1. **Confirm the Vercel env var** — I can't read Vercel's environment, so I can't verify
   whether `DATABASE_URL` there matches the local `.env` (pooler + `pgbouncer=true`).
   If Vercel points at the **direct** port 5432 instead of the pooler, that alone explains
   the 3 s login.
2. **Which steps to run** — I'd do **1 → 2 → 3** first and re-measure; that's the bulk of
   the win. 4–6 are quality-of-life.
3. **Can I re-run the login probe?** — see caveat below.

---

## Caveats (honest)

- **I tripped your rate limiter.** My differential test sent ~11 login attempts from one IP;
  the limiter (10 per 15 min) returned `429` with `Retry-After: 759`. It clears on its own
  in ~13 minutes and is per-instance, so **your own browsing is unaffected**. I have stopped
  probing that endpoint.
- **I could not complete a real login.** I don't type credentials with the browser tool, and
  the demo buttons' second step needs the password field submitted. So the **authenticated
  dashboard numbers are from the local build + direct DB probes**, not from a live logged-in
  session. The server-side query costs are real; the browser-side dashboard timings are
  inferred from the bundle analysis.
- **I made one error mid-analysis** — I reported `middleware.ts` as "missing". It isn't:
  Next 16 renamed middleware to `proxy.ts` and the file is present and correct.
- **The 3 s figure needs one confirmation I can't get from outside**: the exact per-request
  breakdown inside the Vercel function (Vercel's function logs / tracing would show it).
  Step 1's re-measurement is the cheapest way to confirm the diagnosis.
- **`connection_limit=1` is right for serverless but wrong for a long-lived server.** If
  you ever run this on a container/VPS, revisit it.
