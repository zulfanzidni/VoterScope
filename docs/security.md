# VoterScope Demo — Security Architecture

> This application is a portfolio/demo system using synthetic data only.
> NOT approved for production processing of real voter personal data.

---

## 1. Password Security

**Algorithm:** Argon2id (OWASP recommended)

Implementation: `argon2` npm package (wraps the reference C implementation).

Configuration defaults:
- Memory: 65536 KB
- Iterations: 3
- Parallelism: 4

Rules:
- Passwords are NEVER stored as plaintext
- Passwords are NEVER logged
- Passwords are NEVER returned in API responses
- Password hashes are NEVER exposed in API responses

---

## 2. Session Management

**Library:** iron-session 8.x

iron-session stores session data in an encrypted, signed HTTP-only cookie.

No server-side session store is required.

**Cookie settings:**

| Property | Value |
|---|---|
| httpOnly | `true` (not accessible via JavaScript) |
| secure | `true` in production, `false` in development |
| sameSite | `lax` (CSRF mitigation) |
| maxAge | 8 hours |
| path | `/` |

**Session expiry:** The session cookie expires after 8 hours of inactivity.

**No sensitive data in session:** The session stores only: user ID, username, email, full name, role, and scope IDs.

---

## 3. NIK Protection

Even though all NIK values are synthetic demo data, the system demonstrates production-grade NIK protection.

### 3.1 Storage

NIK is NEVER stored as plaintext in the database.

Two fields are stored per voter:

| Field | Purpose | Algorithm |
|---|---|---|
| `nikEncrypted` | Encrypted NIK for authorized decryption | AES-256-GCM |
| `nikLookupHash` | Deterministic hash for duplicate detection | HMAC-SHA-256 |

### 3.2 Encryption (AES-256-GCM)

```
Input:   Synthetic NIK (plaintext)
IV:      12 random bytes per encryption (randomBytes(12))
Key:     32-byte key from NIK_ENCRYPTION_KEY env var
Output:  base64(iv):base64(authTag):base64(ciphertext)
```

The GCM mode provides authenticated encryption — the auth tag ensures ciphertext integrity.

### 3.3 Lookup Hash (HMAC-SHA-256)

```
Input:   Synthetic NIK (plaintext)
Key:     NIK_LOOKUP_SECRET env var
Output:  64-character hex string
```

HMAC is deterministic — the same NIK always produces the same hash with the same key.

Used to detect duplicate NIK without storing plaintext or requiring decryption.

### 3.4 Display Masking

NIK is always displayed masked in the UI:

```
3201000000000001 → 3201**********01
```

---

## 4. Security Headers

Applied via `middleware.ts` on every response:

| Header | Value | Purpose |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limit referrer leakage |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Limit browser permissions |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` (production only) | Enforce HTTPS |
| `Content-Security-Policy` | See below | XSS mitigation |

**CSP:**
```
default-src 'self'
script-src 'self' 'unsafe-inline' 'unsafe-eval'
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com
font-src 'self' https://fonts.gstatic.com
img-src 'self' data: blob:
connect-src 'self'
frame-ancestors 'none'
```

> **Note:** `unsafe-inline` and `unsafe-eval` are required for Next.js development mode. In production, a stricter nonce-based CSP should be used.

---

## 5. Rate Limiting

**Implementation:** Simple in-memory Map (demo only).

| Endpoint | Window | Max Requests |
|---|---|---|
| `/api/auth/login` | 15 minutes | 10 |
| `/api/voters/lookup` | 1 minute | 20 |
| All other API endpoints | 1 minute | 200 |

**⚠️ Warning:** This rate limiter resets on server restart and does NOT work across multiple Node.js processes. Production MUST use a Redis-backed distributed rate limiter.

---

## 6. Input Validation

All inputs are validated with Zod schemas on the server side.

Validation rules:
- NIK: exactly 16 digits
- Names: letters, spaces, and common punctuation only
- Dates: valid date format with bounds checking
- Enums: only allowed values accepted
- IDs: CUID format
- Hierarchy: parent-child relationships validated

Client-side validation mirrors these rules using `react-hook-form`'s built-in
validators, deliberately without importing the Zod schemas — doing so would ship
zod to the browser for two text fields. Client validation is a UX affordance
only; the route handler re-validates every request through the Zod schemas, which
remain the single source of truth.

---

## 7. Authorization Security

See `docs/authorization.md` for the full authorization model.

Key security properties:

- **IDOR prevention:** Every voter access verifies that the voter's scope matches the user's scope
- **Privilege escalation prevention:** Role assignment is restricted to same or lower roles
- **No trusted client data:** URL parameters, query strings, and hidden fields are NEVER used for authorization decisions
- **Server-authoritative scope:** The server computes the user's scope from the database, never from client input

---

## 8. Audit Logging Security

The audit log:
- NEVER records passwords
- NEVER records plaintext NIK
- NEVER records session tokens or secrets
- NEVER records encryption keys
- Automatically sanitizes metadata before storage

Audit events recorded:
- Login, logout, failed login
- Voter CRUD operations
- Archive operations
- Authorization failures (403)
- User management operations

---

## 9. Sensitive Data Exposure Prevention

API responses:
- NEVER include `passwordHash`
- NEVER include `nikEncrypted`
- NEVER include raw `nikLookupHash`
- NEVER include session secrets
- NEVER include stack traces or internal error messages
- NEVER include SQL query details

Error messages are generic and use Indonesian language (reducing information leakage).

---

## 10. Environment Variables Security

| Variable | Purpose | Required |
|---|---|---|
| `DATABASE_URL` | SQLite connection string | Yes |
| `SESSION_SECRET` | iron-session encryption key (≥32 chars) | Yes |
| `NIK_ENCRYPTION_KEY` | AES-256-GCM key (64 hex chars = 32 bytes) | Yes |
| `NIK_LOOKUP_SECRET` | HMAC-SHA-256 key | Yes |

Rules:
- `.env` is in `.gitignore` — NEVER commit to version control
- `.env.example` contains placeholders only
- Production secrets must use a KMS (AWS/GCP/HashiCorp Vault)
- Development secrets are explicitly labeled "dev-only"

---

## 11. Known Security Limitations (Demo)

- No formal penetration testing
- No WAF
- No DDoS protection
- No production TLS certificate management
- Rate limiter is in-memory only
- SQLite lacks row-level security
- No database encryption at rest
- No audit log integrity protection (no immutable log store)
- CSP uses `unsafe-inline` (required by Next.js dev mode)

See `docs/future-production-upgrade.md` for mitigation strategies.
