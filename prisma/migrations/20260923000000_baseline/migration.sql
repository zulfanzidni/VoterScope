-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "provinces" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provinces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kabupaten" (
    "id" TEXT NOT NULL,
    "provinceId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kabupaten_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kecamatan" (
    "id" TEXT NOT NULL,
    "kabupatenId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kecamatan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelurahan" (
    "id" TEXT NOT NULL,
    "kecamatanId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kelurahan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "provinceId" TEXT,
    "kabupatenId" TEXT,
    "kecamatanId" TEXT,
    "kelurahanId" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voters" (
    "id" TEXT NOT NULL,
    "nikEncrypted" TEXT NOT NULL,
    "nikLookupHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "placeOfBirth" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "gender" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "religion" TEXT NOT NULL,
    "maritalStatus" TEXT NOT NULL,
    "occupation" TEXT NOT NULL,
    "citizenship" TEXT NOT NULL DEFAULT 'WNI',
    "validUntil" TIMESTAMP(3),
    "tps" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "provinceId" TEXT NOT NULL,
    "kabupatenId" TEXT NOT NULL,
    "kecamatanId" TEXT NOT NULL,
    "kelurahanId" TEXT NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "voters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "result" TEXT NOT NULL DEFAULT 'SUCCESS',
    "metadata" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "provinces_code_key" ON "provinces"("code");

-- CreateIndex
CREATE INDEX "provinces_code_idx" ON "provinces"("code");

-- CreateIndex
CREATE INDEX "provinces_isActive_idx" ON "provinces"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "kabupaten_code_key" ON "kabupaten"("code");

-- CreateIndex
CREATE INDEX "kabupaten_provinceId_idx" ON "kabupaten"("provinceId");

-- CreateIndex
CREATE INDEX "kabupaten_code_idx" ON "kabupaten"("code");

-- CreateIndex
CREATE INDEX "kabupaten_isActive_idx" ON "kabupaten"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "kecamatan_code_key" ON "kecamatan"("code");

-- CreateIndex
CREATE INDEX "kecamatan_kabupatenId_idx" ON "kecamatan"("kabupatenId");

-- CreateIndex
CREATE INDEX "kecamatan_code_idx" ON "kecamatan"("code");

-- CreateIndex
CREATE INDEX "kecamatan_isActive_idx" ON "kecamatan"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "kelurahan_code_key" ON "kelurahan"("code");

-- CreateIndex
CREATE INDEX "kelurahan_kecamatanId_idx" ON "kelurahan"("kecamatanId");

-- CreateIndex
CREATE INDEX "kelurahan_code_idx" ON "kelurahan"("code");

-- CreateIndex
CREATE INDEX "kelurahan_isActive_idx" ON "kelurahan"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_provinceId_idx" ON "users"("provinceId");

-- CreateIndex
CREATE INDEX "users_kabupatenId_idx" ON "users"("kabupatenId");

-- CreateIndex
CREATE INDEX "users_kecamatanId_idx" ON "users"("kecamatanId");

-- CreateIndex
CREATE INDEX "users_kelurahanId_idx" ON "users"("kelurahanId");

-- CreateIndex
CREATE UNIQUE INDEX "voters_nikLookupHash_key" ON "voters"("nikLookupHash");

-- CreateIndex
CREATE INDEX "voters_provinceId_idx" ON "voters"("provinceId");

-- CreateIndex
CREATE INDEX "voters_kabupatenId_idx" ON "voters"("kabupatenId");

-- CreateIndex
CREATE INDEX "voters_kecamatanId_idx" ON "voters"("kecamatanId");

-- CreateIndex
CREATE INDEX "voters_kelurahanId_idx" ON "voters"("kelurahanId");

-- CreateIndex
CREATE INDEX "voters_status_idx" ON "voters"("status");

-- CreateIndex
CREATE INDEX "voters_gender_idx" ON "voters"("gender");

-- CreateIndex
CREATE INDEX "voters_dateOfBirth_idx" ON "voters"("dateOfBirth");

-- CreateIndex
CREATE INDEX "voters_tps_idx" ON "voters"("tps");

-- CreateIndex
CREATE INDEX "voters_nikLookupHash_idx" ON "voters"("nikLookupHash");

-- CreateIndex
CREATE INDEX "voters_fullName_idx" ON "voters"("fullName");

-- CreateIndex
CREATE INDEX "voters_archivedAt_idx" ON "voters"("archivedAt");

-- CreateIndex
CREATE INDEX "voters_createdBy_idx" ON "voters"("createdBy");

-- CreateIndex
CREATE INDEX "voters_updatedBy_idx" ON "voters"("updatedBy");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_resourceType_idx" ON "audit_logs"("resourceType");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_result_idx" ON "audit_logs"("result");

-- AddForeignKey
ALTER TABLE "kabupaten" ADD CONSTRAINT "kabupaten_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "provinces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kecamatan" ADD CONSTRAINT "kecamatan_kabupatenId_fkey" FOREIGN KEY ("kabupatenId") REFERENCES "kabupaten"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelurahan" ADD CONSTRAINT "kelurahan_kecamatanId_fkey" FOREIGN KEY ("kecamatanId") REFERENCES "kecamatan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "provinces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_kabupatenId_fkey" FOREIGN KEY ("kabupatenId") REFERENCES "kabupaten"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_kecamatanId_fkey" FOREIGN KEY ("kecamatanId") REFERENCES "kecamatan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_kelurahanId_fkey" FOREIGN KEY ("kelurahanId") REFERENCES "kelurahan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voters" ADD CONSTRAINT "voters_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "provinces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voters" ADD CONSTRAINT "voters_kabupatenId_fkey" FOREIGN KEY ("kabupatenId") REFERENCES "kabupaten"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voters" ADD CONSTRAINT "voters_kecamatanId_fkey" FOREIGN KEY ("kecamatanId") REFERENCES "kecamatan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voters" ADD CONSTRAINT "voters_kelurahanId_fkey" FOREIGN KEY ("kelurahanId") REFERENCES "kelurahan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voters" ADD CONSTRAINT "voters_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voters" ADD CONSTRAINT "voters_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

