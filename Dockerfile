# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────────────────────
# VoterScope Demo — production image
#
# Debian (glibc), not Alpine: the `argon2` dependency ships prebuilt binaries
# for linux-x64 / linux-arm64 glibc only (no musl variant), and Prisma's engine
# targets default to the glibc platform. Alpine would force a source build of
# argon2 and a custom Prisma binaryTarget.
# ─────────────────────────────────────────────────────────────────────────────

# ─── Stage 1: dependencies ───────────────────────────────────────────────────
FROM node:22-bookworm-slim AS deps
WORKDIR /app

# openssl is required by Prisma's query engine on slim Debian images.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy manifests first so this layer is cached until dependencies change.
COPY package.json package-lock.json ./

# package.json declares a `postinstall` script that runs `prisma generate`, so
# the schema must be present before `npm ci` or the install fails with
# "Could not find Prisma Schema". Only the schema is needed here — the rest of
# the source is copied in the build stage.
COPY prisma/schema.prisma ./prisma/schema.prisma

RUN npm ci

# ─── Stage 2: build ──────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS builder
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Regenerate the Prisma client for the *build* platform. The engine in the host
# node_modules is a Windows binary and is useless on Linux.
RUN npx prisma generate

# SESSION_SECRET is required at build time because lib/auth/session.ts reads it.
# This is a throwaway value: it is only used while collecting page data and is
# NOT persisted into the runtime stage, which receives the real secret via the
# environment. No DATABASE_URL is provided — the build never connects to a
# database, which is what keeps the image self-contained.
ENV NEXT_TELEMETRY_DISABLED=1
RUN SESSION_SECRET="build-time-placeholder-secret-not-used-at-runtime-000" \
    NIK_ENCRYPTION_KEY="build-time-placeholder" \
    NIK_LOOKUP_SECRET="build-time-placeholder" \
    npm run build

# ─── Stage 3: runtime ────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runner
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Run unprivileged. node:22-bookworm-slim already provides a `node` user (uid
# 1000); reuse it rather than creating another.
USER node

# `output: "standalone"` emits a self-contained server plus only the traced
# dependencies, so the full node_modules tree is not copied.
COPY --chown=node:node --from=builder /app/.next/standalone ./
COPY --chown=node:node --from=builder /app/.next/static ./.next/static
COPY --chown=node:node --from=builder /app/public ./public

# The Prisma query engine is loaded at runtime and is not always picked up by
# Next's file tracing, so copy it explicitly.
COPY --chown=node:node --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --chown=node:node --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

EXPOSE 3000

# No curl in the slim image, so probe with Node's built-in fetch.
# /login is statically prerendered and needs neither a session nor the database.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
