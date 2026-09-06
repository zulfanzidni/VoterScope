# VoterScope Demo — Future Production Upgrade Path

> This document describes how VoterScope Demo would evolve into a production system.
> The demo uses simplified components appropriate for a local development environment.

---

## Current Demo Architecture

```
Browser → Next.js (SQLite + iron-session + in-memory rate limiter)
```

## Target Production Architecture

```
Browser → CDN/WAF → Load Balancer
            ↓
         Next.js (Containerized, horizontally scaled)
            ↓
       NestJS/Fastify API (separate microservice, optional)
            ↓
     PostgreSQL (managed, replicated)
     Redis (session, rate limiting, caching)
     Object Storage (S3/GCS for document uploads)
            ↓
       KMS (key management for NIK encryption)
       OIDC Provider (Keycloak/Auth0 for authentication)
       SIEM/Logging (ELK/CloudWatch)
       Monitoring (Prometheus/Grafana)
```

---

## Migration Steps

### Step 1: Database — SQLite → PostgreSQL

**Why:** PostgreSQL supports:
- Row-level security (RLS)
- Full-text search
- Concurrent write operations
- Managed backups and point-in-time recovery
- Proper enum types
- Connection pooling (PgBouncer)

**How:**
1. Keep Prisma ORM — only change the `datasource` block
2. Replace `provider = "sqlite"` with `provider = "postgresql"`
3. Update `DATABASE_URL` to PostgreSQL connection string
4. Run `prisma migrate deploy` on the new database
5. Add row-level security policies in PostgreSQL for defense-in-depth

### Step 2: Authentication — iron-session → OIDC

**Why:** Enterprise environments require:
- Multi-factor authentication (MFA/TOTP/WebAuthn)
- Single Sign-On (SSO) with existing identity provider
- Centralized user management
- Token refresh and rotation
- Audit trail of authentication events

**How:**
1. Set up Keycloak (self-hosted) or Auth0 (SaaS)
2. Configure OIDC realms, clients, and roles
3. Map OIDC claims to application roles
4. Use `next-auth` or `oidc-client-ts` in the Next.js app
5. Replace `iron-session` with JWT access tokens + refresh tokens

### Step 3: Sessions → Redis

**Why:** Horizontal scaling requires shared session state across multiple application instances.

**How:**
1. Deploy Redis (Redis Cluster or Redis Sentinel for HA)
2. Replace `iron-session` with a Redis-backed session store (e.g., `express-session` + `connect-redis`)
3. Configure session TTL and cleanup

### Step 4: Rate Limiting → Redis-backed

**Why:** Current in-memory rate limiter doesn't work across multiple server instances.

**How:**
1. Use `ioredis` with a sliding window algorithm
2. Libraries: `rate-limiter-flexible` or a custom Redis Lua script
3. Apply at the API Gateway layer (Kong, AWS API Gateway) for defense-in-depth

### Step 5: NIK Encryption Keys → KMS

**Why:** Environment variable secrets are vulnerable to:
- Server compromise
- Accidental logging
- CI/CD secret exposure

**How:**
1. AWS: Use AWS KMS + AWS Secrets Manager
2. GCP: Use Cloud KMS + Secret Manager
3. Self-hosted: HashiCorp Vault with auto-unseal
4. Application requests key from KMS at startup (never stores key locally)
5. Consider envelope encryption for NIK fields

### Step 6: Infrastructure

| Component | Demo | Production |
|---|---|---|
| Compute | `npm run dev` | ECS Fargate / Kubernetes |
| Database | SQLite file | RDS PostgreSQL Multi-AZ |
| Cache | None | ElastiCache Redis |
| CDN | None | CloudFront / Cloudflare |
| WAF | None | AWS WAF / Cloudflare WAF |
| TLS | HTTP (local) | ACM certificates / Let's Encrypt |
| Secrets | .env file | AWS Secrets Manager / Vault |
| Logging | console.error | CloudWatch Logs / ELK Stack |
| Monitoring | None | CloudWatch / Prometheus + Grafana |
| Backups | None | Automated RDS snapshots |
| DR | None | Multi-region failover |

### Step 7: Security Hardening

| Area | Demo | Production |
|---|---|---|
| Penetration testing | None | Annual pen test + continuous DAST |
| SAST | ESLint only | SonarQube / Snyk / CodeQL |
| Dependency scanning | None | Dependabot / Snyk |
| Container scanning | None | Amazon Inspector / Trivy |
| CSP | unsafe-inline | Strict nonce-based CSP |
| HSTS | Headers only | Preload list submission |
| Audit log | SQLite table | Immutable log store (AWS CloudTrail) |

### Step 8: Compliance

For production processing of real voter data:

1. **Legal review:** Consult with legal counsel on UU PDP (Undang-Undang Perlindungan Data Pribadi)
2. **Data residency:** Ensure data remains within Indonesian jurisdiction
3. **Privacy by design:** Implement data minimization and purpose limitation
4. **Incident response:** Develop and test incident response procedures
5. **Security certification:** Consider ISO 27001 or equivalent
6. **Formal security audit:** Engage a qualified penetration testing firm

---

## Timeline Estimate

| Phase | Duration |
|---|---|
| Database migration (SQLite → PostgreSQL) | 1–2 weeks |
| OIDC integration | 2–4 weeks |
| Redis sessions + rate limiting | 1 week |
| KMS integration | 1–2 weeks |
| Infrastructure (IaC with Terraform) | 4–6 weeks |
| Security hardening + pen test | 4–8 weeks |
| Compliance review | Varies |

---

> This document describes a migration path, not a production commitment.
> All timeline estimates are approximate and depend on team size, requirements, and regulatory context.
