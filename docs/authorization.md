# VoterScope Demo — Authorization Model

> This application is a portfolio/demo system using synthetic data only.

---

## 1. Overview

VoterScope Demo implements **RBAC + Hierarchical Scope Authorization**.

The authorization model has two layers:

1. **Role** — what *types* of actions a user can perform
2. **Scope** — *which data* the user is allowed to access

Both layers are enforced **server-side only**. The frontend is never authoritative.

---

## 2. Role Hierarchy

```
SUPER_ADMIN
  │
  ├── PROVINCE_ADMIN
  │     │
  │     ├── KABUPATEN_ADMIN
  │     │     │
  │     │     ├── KECAMATAN_ADMIN
  │     │     │     │
  │     │     │     └── KELURAHAN_OPERATOR
  │     │     │
  │
AUDITOR (read-only, cross-cutting)
```

Higher-level roles have all the permissions of lower-level roles plus additional ones.

---

## 3. Role Definitions

### SUPER_ADMIN
- Full access to all data
- No administrative scope restriction
- Can manage all users including admins
- Can access audit logs

### PROVINCE_ADMIN
- Access: assigned Province + all Kabupaten, Kecamatan, Kelurahan within
- Can manage users at Kabupaten level and below within the Province
- Cannot access data in other Provinces

### KABUPATEN_ADMIN
- Access: assigned Kabupaten + all Kecamatan, Kelurahan within
- Can manage users at Kecamatan level and below within the Kabupaten
- Cannot access data in other Kabupaten

### KECAMATAN_ADMIN
- Access: assigned Kecamatan + all Kelurahan within
- Can manage users at Kelurahan level within the Kecamatan
- Cannot access data in other Kecamatan

### KELURAHAN_OPERATOR
- Access: assigned Kelurahan only
- Can create, update, and archive voters within their Kelurahan
- Cannot access data in other Kelurahan

### AUDITOR
- Read-only access at their assigned scope
- Can access the audit log
- Cannot create, update, or archive any records

---

## 4. Action Permissions Matrix

| Action | SUPER_ADMIN | PROVINCE_ADMIN | KABUPATEN_ADMIN | KECAMATAN_ADMIN | KELURAHAN_OPERATOR | AUDITOR |
|---|---|---|---|---|---|---|
| Voter: Read | ✅ | ✅ (scope) | ✅ (scope) | ✅ (scope) | ✅ (scope) | ✅ (scope) |
| Voter: Create | ✅ | ✅ (scope) | ✅ (scope) | ✅ (scope) | ✅ (scope) | ❌ |
| Voter: Update | ✅ | ✅ (scope) | ✅ (scope) | ✅ (scope) | ✅ (scope) | ❌ |
| Voter: Archive | ✅ | ✅ (scope) | ✅ (scope) | ✅ (scope) | ✅ (scope) | ❌ |
| NIK Lookup | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| User: Read | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| User: Create | ✅ | ✅ (≤ KABUPATEN_ADMIN) | ✅ (≤ KECAMATAN_ADMIN) | ✅ (≤ KELURAHAN_OPERATOR) | ❌ | ❌ |
| User: Update | ✅ | ✅ (scope) | ✅ (scope) | ✅ (scope) | ❌ | ❌ |
| Audit Log: Read | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Dashboard | ✅ | ✅ (scope) | ✅ (scope) | ✅ (scope) | ✅ (scope) | ✅ (scope) |

---

## 5. Scope Resolution

The `getUserScope(user)` function computes the user's data access boundaries:

```typescript
// SUPER_ADMIN → { level: "NATIONAL" }
// PROVINCE_ADMIN → { level: "PROVINCE", provinceId: "..." }
// KABUPATEN_ADMIN → { level: "KABUPATEN", kabupatenId: "..." }
// KECAMATAN_ADMIN → { level: "KECAMATAN", kecamatanId: "..." }
// KELURAHAN_OPERATOR → { level: "KELURAHAN", kelurahanId: "..." }
```

---

## 6. Voter Filter Generation

Every voter query uses `buildAuthorizedVoterFilter(user)`:

```typescript
// SUPER_ADMIN → {} (no WHERE restriction)
// PROVINCE_ADMIN → { provinceId: "prov-001" }
// KABUPATEN_ADMIN → { kabupatenId: "kab-001" }
// KECAMATAN_ADMIN → { kecamatanId: "kec-001" }
// KELURAHAN_OPERATOR → { kelurahanId: "kel-001" }
```

This filter is applied to **every** Prisma voter query. There is no bypass.

---

## 7. IDOR Prevention

When accessing a specific voter by ID (`/voters/[id]`), the server:

1. Fetches the voter from the database
2. Calls `canAccessVoter(user, voter)` which compares the voter's scope IDs with the user's scope
3. If the scope does not match → returns **403 Forbidden**
4. The 403 is recorded in the audit log as `ACCESS_DENIED`

Example:
```
kelurahan_operator (kelurahanId: "kel-001")
  → GET /api/voters/voter-in-kel-002
  → canAccessVoter() → false (kel-001 ≠ kel-002)
  → 403 Forbidden
  → AuditLog: ACCESS_DENIED
```

---

## 8. Role Escalation Prevention

When creating or updating a user:

```typescript
canPerformUserAction(actor, "create", targetRole):
  // Fails if getRoleLevel(targetRole) >= getRoleLevel(actor.role)
```

A user can only assign roles **strictly lower** than their own.

Example: A `KECAMATAN_ADMIN` cannot create a `PROVINCE_ADMIN` or another `KECAMATAN_ADMIN`.

---

## 9. Implementation Files

| File | Purpose |
|---|---|
| `lib/authorization/index.ts` | Central authorization functions |
| `lib/types.ts` | Role enums and hierarchy constants |
| `middleware.ts` | Route-level authentication guard |
| `lib/auth/session.ts` | Session validation |

All protected API routes call authorization functions before performing any database operations.
