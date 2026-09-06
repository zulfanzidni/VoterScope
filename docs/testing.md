# VoterScope Demo — Testing & Quality Assurance Strategy

> **⚠️ DEMO DISCLAIMER:**
> All tests in this suite operate exclusively with **synthetic demo data**. No real personal voter data, real NIKs, or production government endpoints are utilized at any point.

---

## 1. Overview & Testing Philosophy

The **VoterScope Demo** testing suite is designed to validate all aspects of a mission-critical administrative voter registry system:
* **Server-Authoritative RBAC**: Authorization boundaries are enforced on the backend, ensuring client tampering or IDOR attempts fail deterministically.
* **Cryptographic Invariants**: AES-256-GCM NIK encryption, blind indexing with HMAC-SHA256, and Argon2id password hashing operate consistently without regressions.
* **Zero Trust & Scope Boundaries**: Operators at lower administrative tiers (e.g. Kelurahan) cannot access or manipulate records in parallel jurisdictions.
* **Audit Trail Completeness**: Every state-changing administrative action produces an immutable audit record with user metadata.

---

## 2. Test Pyramid & Tooling

```
            ▲
           / \
          /   \     E2E Tests (Playwright)
         /  ▲  \    • Login & session flows
        /  / \  \   • Voter CRUD, search & unmask
       /  /   \  \  • Scope isolation & audit export
      /  /  ▲  \  \
     /  /  / \  \  \  Unit & Integration Tests (Vitest)
    /  /  /   \  \  \ • 123 tests across 8 suites
   /__/__/_____\__\__\• RBAC, NIK crypto, rate limiting, validation
```

| Tool | Role | Configuration |
|---|---|---|
| **Vitest** (v3.2.7) | Unit & Integration testing | `vitest.config.ts` with TypeScript path aliases (`@/*`) |
| **Playwright** (v1.62.1) | End-to-End browser testing | `playwright.config.ts` running against local dev server |
| **Argon2 / Crypto** | In-memory cryptographic verification | Validates Argon2id hashes, AES-256-GCM, HMAC |

---

## 3. Unit & Integration Test Suites (123 Tests)

The unit test suite comprises **8 test files** containing **123 automated tests**, all passing in under 3 seconds:

### 1. `authorization.test.ts` (26 tests)
* **Role Hierarchy Tests**: Tests `isRoleAtLeast` and `hasMinimumRole` across all 6 roles (`SUPER_ADMIN` down to `AUDITOR`).
* **Territory Boundary Tests**: Validates `canAccessTerritory` for national, province, kabupaten, kecamatan, and kelurahan scopes.
* **Voter Record Access**: Enforces `canAccessVoter` rules (preventing cross-kelurahan access for operators).
* **Audit Log Access**: Validates that only `SUPER_ADMIN` and `AUDITOR` have access to system audit logs.

### 2. `nik.test.ts` (10 tests)
* **Encryption Roundtrip**: Confirms plaintext NIK can be encrypted with AES-256-GCM and decrypted back to the original plaintext.
* **Authentication Tag & Tamper Detection**: Modifying ciphertext or auth tag throws an authentication error.
* **HMAC Blind Index**: Validates deterministic hash generation for duplicate NIK queries without exposing the plaintext NIK.
* **Masking Utility**: Tests `maskNik` formatting (e.g. `3201************`).

### 3. `auth.test.ts` (19 tests)
* **Session Lifecycle**: Creation, verification, and destruction of `iron-session` cookies.
* **Login Schema Validation**: Checks username/password requirements.
* **Rate Limiting**: Sliding-window rate limiter prevents brute-force credential stuffing (5 failed attempts trigger lockout).

### 4. `voter-crud.test.ts` (23 tests)
* **Zod Schema Validation**: `VoterCreateSchema` and `VoterUpdateSchema` field validation (16-digit synthetic NIK, birth date, gender, status enum).
* **Anti-IDOR Defense**: Rejecting updates or archives when the target voter is outside the operator's administrative jurisdiction.
* **Soft Delete / Archival**: Verifies status changes to `ARCHIVED` and notes logging.

### 5. `audit-log.test.ts` (12 tests)
* **Audit Event Creation**: Tests `createAuditLog` with action types, resource IDs, IP addresses, and metadata payloads.
* **Search Schema**: Tests filtering by user ID, date range, action type, and status.
* **CSV/JSON Serialization**: Validates export formatting for compliance audits.

### 6. `user-management.test.ts` (12 tests)
* **Role Escalation Prevention**: Tests `canPerformUserAction` ensuring admins cannot create accounts with higher or equal privileges.
* **Self-Deactivation Guard**: Admins cannot deactivate their own active accounts.
* **Argon2id Password Generation**: Ensures new user passwords meet OWASP complexity and generate valid Argon2id hashes.

### 7. `profile.test.ts` (14 tests)
* **Profile Update Schema**: Validates full name constraints (min 3 chars, max 100) and email formats.
* **Change Password OWASP Rules**: Enforces length (>= 8), uppercase, lowercase, numbers, and special characters (`(?=.*[^A-Za-z0-9])`).
* **Argon2id Verification**: Validates current password verification before updating password hash.

### 8. `dashboard-stats.test.ts` (7 tests)
* **Demographic Aggregation**: Age cohort breakdown (`17-25`, `26-35`, `36-50`, `51+`).
* **Territory Rollup**: Accurate voter counts rolled up to the requesting user's scope boundary.
* **Gender & Quality Metrics**: Verification rate and active voter percentages.

---

## 4. End-to-End (E2E) Test Suites (Playwright)

Located in `tests/e2e/`:

### 1. `login.spec.ts`
* Branding & synthetic data banner presence.
* Rejection of invalid credentials with error feedback.
* Quick-fill demo account buttons (`superadmin`, `kelurahan_operator`, `auditor`).
* Successful authentication and redirect to `/dashboard`.
* Session cookie persistence across reloads.
* Logout and cookie revocation.
* Role-based sidebar navigation rendering.

### 2. `voters.spec.ts`
* Voter table rendering with masked NIK.
* Real-time search debouncing and filtering by status/gender.
* Voter dossier page navigation.
* Interactive NIK unmask toggle (revealing full synthetic NIK with audit log trigger).
* New voter registration form with synthetic data generator button.

### 3. `audit-and-users.spec.ts`
* Auditor access to compliance audit logs and JSON metadata inspection modal.
* Operator access restriction: Operator attempting to view `/dashboard/audit` or `/dashboard/users` receives an "Akses Terbatas" restriction card.
* Super Admin access to user management, subordinate role creation modal.
* User profile settings page loading and Argon2id security architecture card.

---

## 5. Running the Test Suite

### Running Vitest (Unit & Integration Tests)

```bash
# Run all unit and integration tests once
npm run test

# Run tests in watch mode during development
npm run test:watch

# Run with test coverage report
npm run test:coverage
```

### Running ESLint (Code Quality & Type Safety)

```bash
# Verify no lint errors or warnings
npm run lint

# Automatically fix autofixable lint issues
npm run lint:fix
```

### Running Next.js Build Gate

```bash
# Compiles all 23 application routes with TypeScript checking
npm run build
```

### Running Playwright E2E Tests

```bash
# Prerequisites: Ensure the dev server or production build is running
# Terminal 1:
npm run dev

# Terminal 2:
npx playwright test

# Run Playwright with interactive UI
npm run test:e2e:ui
```

---

## 6. Continuous Integration & Build Gates

All commits and pull requests must satisfy three sequential quality gates:
1. **Gate 1: Lint & Code Style**: `npm run lint` must exit with code 0 (0 errors, 0 warnings).
2. **Gate 2: Unit & Integration Tests**: `npm run test` must pass 100% of test cases (123/123).
3. **Gate 3: Production Build**: `npm run build` must compile all dynamic and static routes without TypeScript or Turbopack errors.
