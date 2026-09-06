# VoterScope Demo — Architecture

> This application is a portfolio/demo system using synthetic data only.
> NOT approved for production processing of real voter personal data.

---

## 1. System Overview

VoterScope Demo is a **local-first**, **full-stack** administrative data management demo built as a single Next.js application with an embedded SQLite database.

```
Browser (React + Next.js Client Components)
        ↓ HTTP (localhost:3000)
Next.js App Router (Server Components + Route Handlers)
        ↓ Prisma ORM
SQLite Database (prisma/dev.db)
```

No external services are required to run the application.

---

## 2. Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Framework | Next.js | 16.x | Full-stack React framework |
| Language | TypeScript | 5.x | Type-safe development |
| Styling | Tailwind CSS | 4.x | Utility-first CSS |
| UI Components | Custom Design System | - | Accessible component primitives & glassmorphic panels |
| Forms | React Hook Form + Zod | latest | Form state + validation |
| Charts | Recharts | latest | Dashboard visualizations |
| ORM | Prisma | 6.x | Database access layer |
| Database | SQLite (via Prisma) | 3.x | Embedded relational database |
| Auth | iron-session | 8.x | Encrypted cookie sessions |
| Password | argon2 (Argon2id) | latest | Secure password hashing |
| Icons | Inline SVGs | - | Lightweight vector icons |
| Testing (unit) | Vitest | latest | Unit + integration tests |
| Testing (e2e) | Playwright | latest | End-to-end browser tests |
| Linting | ESLint + Prettier | latest | Code quality |

---

## 3. Application Structure

```
voterscope-demo/
│
├── app/                          ← Next.js App Router
│   ├── login/                    ← Public: login page
│   ├── dashboard/                ← Protected: main dashboard
│   ├── voters/                   ← Protected: voter management
│   │   └── [id]/                 ← Protected: voter detail
│   ├── users/                    ← Protected: user management (SUPER_ADMIN+)
│   ├── audit/                    ← Protected: audit log (SUPER_ADMIN, AUDITOR)
│   ├── profile/                  ← Protected: user profile
│   ├── api/                      ← Route Handlers (server-side API)
│   │   ├── auth/login/           ← POST: authenticate
│   │   ├── auth/logout/          ← POST: invalidate session
│   │   ├── auth/session/         ← GET: current session info
│   │   ├── dashboard/            ← GET: scoped aggregated stats
│   │   ├── voters/               ← GET: list, POST: create
│   │   │   └── [id]/             ← GET: detail, PATCH: update
│   │   │       └── archive/      ← POST: archive voter
│   │   ├── users/                ← GET: list, POST: create
│   │   │   └── [id]/             ← PATCH: update user
│   │   └── audit/                ← GET: audit log entries
│   ├── layout.tsx                ← Root layout (fonts, metadata)
│   ├── not-found.tsx             ← 404 page
│   └── error.tsx                 ← Global error boundary
│
├── components/
│   ├── ui/                       ← shadcn/ui base components
│   ├── layout/                   ← Sidebar, TopNav, Breadcrumbs
│   ├── dashboard/                ← KPI cards, charts
│   ├── voters/                   ← Voter table, form, detail
│   ├── users/                    ← User table, form
│   └── audit/                    ← Audit log table, filters
│
├── lib/
│   ├── types.ts                  ← Shared TypeScript types & enums
│   ├── auth/
│   │   └── session.ts            ← iron-session configuration + helpers
│   ├── authorization/
│   │   └── index.ts              ← RBAC + scope authorization utilities
│   ├── db/
│   │   └── prisma.ts             ← Prisma singleton client
│   ├── validation/
│   │   └── schemas.ts            ← All Zod schemas
│   ├── security/
│   │   ├── nik.ts                ← AES-256-GCM encryption + HMAC
│   │   └── rate-limit.ts         ← In-memory rate limiter
│   ├── audit/
│   │   └── index.ts              ← Audit log creation utilities
│   └── api/
│       └── errors.ts             ← Standardized API error responses
│
├── middleware.ts                  ← Auth guard + security headers
│
├── prisma/
│   ├── schema.prisma             ← Database schema
│   └── seed.ts                   ← Deterministic seed data generator
│
├── tests/
│   ├── unit/                     ← Vitest unit tests
│   ├── integration/              ← Vitest integration tests
│   └── e2e/                      ← Playwright E2E tests
│
└── docs/                         ← Project documentation
```

---

## 4. Request Lifecycle

### Authenticated Request Flow

```
1. Browser → Request
2. middleware.ts → Check iron-session cookie
   ├── No session? → Redirect /login (page) or 401 (API)
   └── Session valid? → Continue
3. Route Handler (app/api/...)
   ├── getSessionUser() → Fetch current user
   ├── buildAuthorizedVoterFilter(user) → Scope filter
   ├── canPerformVoterAction(user, action) → Permission check
   ├── Prisma query (always with scope filter)
   ├── createAuditLog(...) → Record action
   └── Return response
4. Browser ← Response (JSON)
```

### Authorization Check Flow

```
canAccessVoter(user, voter):
  getUserScope(user) → level + IDs
  Match voter.{level}Id === scope.{level}Id
  └── Match → 200 OK
  └── No match → 403 Forbidden + audit log
```

---

## 5. Data Model Overview

```
Province (1)
  └── Kabupaten (N)
        └── Kecamatan (N)
              └── Kelurahan (N)
                    ├── Voter (N)  ← nikEncrypted + nikLookupHash
                    └── User (N)   ← role + scope IDs
```

Users are assigned to exactly one administrative level. Their scope determines what data they can see.

---

## 6. Security Architecture

### Session

- Cookie: HTTP-only, SameSite=Lax, encrypted by iron-session
- Session secret loaded from `SESSION_SECRET` env var
- Session expiry: 8 hours
- No session data stored server-side (stateless JWT-like cookie)

### Password

- Argon2id (recommended by OWASP)
- Never stored as plaintext
- Never returned in API responses
- Never logged

### NIK Protection

```
Input NIK (synthetic) 
  → encryptNik() → AES-256-GCM → nikEncrypted (stored in DB)
  → hashNikForLookup() → HMAC-SHA-256 → nikLookupHash (stored in DB)

Duplicate check: compare new nikLookupHash with existing records
Decryption: only when authorized user requests full NIK (future feature)
Display: always masked (e.g., 3201****1234**)
```

### Headers (via middleware.ts)

| Header | Value |
|---|---|
| X-Content-Type-Options | nosniff |
| X-Frame-Options | DENY |
| Referrer-Policy | strict-origin-when-cross-origin |
| Permissions-Policy | camera=(), microphone=(), geolocation=() |
| Strict-Transport-Security | max-age=63072000 (production only) |
| Content-Security-Policy | See middleware.ts |

---

## 7. Role Hierarchy

```
SUPER_ADMIN         ← All access, all scopes
  PROVINCE_ADMIN    ← Province + all descendants
    KABUPATEN_ADMIN ← Kabupaten + all descendants
      KECAMATAN_ADMIN ← Kecamatan + all Kelurahan
        KELURAHAN_OPERATOR ← Single Kelurahan only
AUDITOR             ← Read-only at assigned scope
```

---

## 8. Demo vs Production Architecture

| Concern | Demo | Production |
|---|---|---|
| Database | SQLite (local file) | PostgreSQL (managed) |
| Sessions | iron-session (stateless cookie) | Redis-backed sessions |
| Auth | Username + password | OIDC (Keycloak/Auth0) |
| Rate limiting | In-memory Map | Redis sliding window |
| Secrets | .env file | KMS (AWS/GCP/HashiCorp Vault) |
| Logging | console.error | Centralized (ELK / CloudWatch) |
| Deployment | `npm run dev` | Containerized (K8s/ECS) |
| WAF | None | Cloudflare / AWS WAF |
| Backups | None | Automated daily snapshots |

See `docs/future-production-upgrade.md` for migration path.

---

## 9. Development Commands

```bash
npm run dev          # Start development server (localhost:3000)
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test         # Run Vitest unit/integration tests
npm run test:e2e     # Run Playwright E2E tests
npm run db:generate  # Generate Prisma client
npm run db:migrate   # Apply migrations
npm run db:seed      # Seed synthetic demo data
npm run db:reset     # Reset database and re-seed
```
