# VoterScope Demo — Database Design

> ALL DATA IN THIS SYSTEM IS SYNTHETIC DEMO DATA.
> This application is a portfolio/demo system and is NOT for production use with real voter data.

---

## 1. Database

**Engine:** SQLite 3 (via Prisma)

SQLite was chosen for:
- Zero installation (no database server required)
- Cross-platform (Windows, macOS, Linux)
- Easy reset and re-seed for demos
- Full Prisma ORM support

Production would use PostgreSQL. See `docs/future-production-upgrade.md`.

---

## 2. Entity Relationship Diagram

```
Province (1)
  ├── code (UNIQUE)
  ├── name
  └── Kabupaten[] (N)
        ├── code (UNIQUE)
        ├── name
        └── Kecamatan[] (N)
              ├── code (UNIQUE)
              ├── name
              └── Kelurahan[] (N)
                    ├── code (UNIQUE)
                    ├── name
                    ├── Voter[] (N)
                    └── User[] (N)
```

---

## 3. Models

### Province
| Column | Type | Constraints |
|---|---|---|
| id | String (CUID) | PK |
| code | String | UNIQUE |
| name | String | NOT NULL |
| isActive | Boolean | DEFAULT true |
| createdAt | DateTime | DEFAULT now() |
| updatedAt | DateTime | AUTO |

### Kabupaten
| Column | Type | Constraints |
|---|---|---|
| id | String (CUID) | PK |
| provinceId | String | FK → Province.id |
| code | String | UNIQUE |
| name | String | NOT NULL |
| isActive | Boolean | DEFAULT true |
| createdAt | DateTime | DEFAULT now() |
| updatedAt | DateTime | AUTO |

### Kecamatan
| Column | Type | Constraints |
|---|---|---|
| id | String (CUID) | PK |
| kabupatenId | String | FK → Kabupaten.id |
| code | String | UNIQUE |
| name | String | NOT NULL |
| isActive | Boolean | DEFAULT true |
| createdAt | DateTime | DEFAULT now() |
| updatedAt | DateTime | AUTO |

### Kelurahan
| Column | Type | Constraints |
|---|---|---|
| id | String (CUID) | PK |
| kecamatanId | String | FK → Kecamatan.id |
| code | String | UNIQUE |
| name | String | NOT NULL |
| isActive | Boolean | DEFAULT true |
| createdAt | DateTime | DEFAULT now() |
| updatedAt | DateTime | AUTO |

### User
| Column | Type | Constraints |
|---|---|---|
| id | String (CUID) | PK |
| username | String | UNIQUE |
| email | String | UNIQUE |
| fullName | String | NOT NULL |
| passwordHash | String | NOT NULL (Argon2id) |
| role | String | Enum enforced in app layer |
| isActive | Boolean | DEFAULT true |
| provinceId | String? | FK → Province.id (nullable) |
| kabupatenId | String? | FK → Kabupaten.id (nullable) |
| kecamatanId | String? | FK → Kecamatan.id (nullable) |
| kelurahanId | String? | FK → Kelurahan.id (nullable) |
| createdAt | DateTime | DEFAULT now() |
| updatedAt | DateTime | AUTO |

**Note:** Scope fields are nullable. SUPER_ADMIN has all nulls (national scope).

### Voter
| Column | Type | Constraints |
|---|---|---|
| id | String (CUID) | PK |
| nikEncrypted | String | AES-256-GCM encrypted |
| nikLookupHash | String | UNIQUE — HMAC-SHA-256 |
| fullName | String | NOT NULL |
| placeOfBirth | String | NOT NULL |
| dateOfBirth | DateTime | NOT NULL |
| gender | String | Enum: LAKI_LAKI, PEREMPUAN |
| address | String | NOT NULL |
| religion | String | Enum: ISLAM, KRISTEN, etc. |
| maritalStatus | String | Enum: BELUM_KAWIN, KAWIN, etc. |
| occupation | String | NOT NULL |
| citizenship | String | DEFAULT "WNI" |
| validUntil | DateTime? | nullable |
| tps | String | NOT NULL |
| status | String | Enum: ACTIVE, INACTIVE, NEEDS_REVIEW, ARCHIVED |
| provinceId | String | FK → Province.id |
| kabupatenId | String | FK → Kabupaten.id |
| kecamatanId | String | FK → Kecamatan.id |
| kelurahanId | String | FK → Kelurahan.id |
| createdBy | String? | FK → User.id |
| updatedBy | String? | FK → User.id |
| archivedAt | DateTime? | nullable |
| createdAt | DateTime | DEFAULT now() |
| updatedAt | DateTime | AUTO |

**Security notes:**
- `nikEncrypted` is AES-256-GCM encrypted — never plaintext
- `nikLookupHash` is HMAC-SHA-256 — enables duplicate detection without decryption
- NIK is NEVER stored in plaintext

### AuditLog
| Column | Type | Constraints |
|---|---|---|
| id | String (CUID) | PK |
| userId | String? | FK → User.id (nullable for pre-auth events) |
| action | String | Enum: LOGIN, VOTER_CREATE, etc. |
| resourceType | String | Enum: AUTH, VOTER, USER, SYSTEM |
| resourceId | String? | nullable |
| timestamp | DateTime | DEFAULT now() |
| ipAddress | String? | nullable |
| userAgent | String? | nullable (max 500 chars) |
| result | String | Enum: SUCCESS, FAILURE |
| metadata | String? | JSON (sanitized — no secrets) |

---

## 4. Indexes

Indexes are added on all frequently queried columns:

| Table | Index Columns | Purpose |
|---|---|---|
| Province | code, isActive | Search and filter |
| Kabupaten | provinceId, code, isActive | Hierarchy traversal |
| Kecamatan | kabupatenId, code, isActive | Hierarchy traversal |
| Kelurahan | kecamatanId, code, isActive | Hierarchy traversal |
| User | username, email, role, scope IDs | Auth + user lookup |
| Voter | provinceId, kabupatenId, kecamatanId, kelurahanId | Scope filtering |
| Voter | status, gender, dateOfBirth, tps | Dashboard aggregation |
| Voter | nikLookupHash | Duplicate detection (UNIQUE) |
| Voter | fullName | Name search |
| Voter | archivedAt | Active voter filter |
| AuditLog | userId, action, resourceType, timestamp, result | Audit log filtering |

---

## 5. Data Integrity

- All foreign key relationships are declared in Prisma schema
- `nikLookupHash` has a UNIQUE constraint preventing duplicate voter NIK
- Administrative code fields have UNIQUE constraints
- `username` and `email` have UNIQUE constraints per User
- Enums are enforced at the application layer (Zod validation + TypeScript)

---

## 6. Soft Delete Strategy

Voters are NEVER permanently deleted.

Instead, the `archive` operation:
1. Sets `status = "ARCHIVED"`
2. Sets `archivedAt = now()`
3. Creates an audit log entry

Restoring an archived voter (future feature) would clear `archivedAt` and set `status = "ACTIVE"`.

---

## 7. Migrations

Migrations are managed by Prisma Migrate:

```bash
# Create and apply a new migration
npm run db:migrate

# Reset database (drops all data and re-migrates)
npx prisma migrate reset

# View migration history
npx prisma migrate status
```

Migration files are stored in `prisma/migrations/`.
