-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "VolunteerStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "Classification" AS ENUM ('GREEN', 'YELLOW', 'RED', 'BLACK');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('VERIFIED', 'UNVERIFIED');

-- CreateEnum
CREATE TYPE "VoteStatus" AS ENUM ('PENDING', 'DONE');

-- CreateEnum
CREATE TYPE "BoothStatus" AS ENUM ('NOT_STARTED', 'VOTING_STARTED', 'PROBLEM');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('VOTING_SLOW', 'VOLUNTEER_ISSUE', 'BOOTH_ISSUE', 'OTHER');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('UPLOADED', 'REVIEWING', 'COMMITTED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'ADMIN',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assembly" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "electionYear" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assembly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booth" (
    "id" TEXT NOT NULL,
    "boothNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "village" TEXT,
    "assemblyId" TEXT NOT NULL,
    "volunteerId" TEXT,
    "status" "BoothStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Volunteer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "status" "VolunteerStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Volunteer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Voter" (
    "id" TEXT NOT NULL,
    "epic" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameHindi" TEXT,
    "fatherName" TEXT,
    "fatherNameHindi" TEXT,
    "motherName" TEXT,
    "husbandName" TEXT,
    "gender" TEXT,
    "age" INTEGER,
    "dateOfBirth" TEXT,
    "houseNumber" TEXT,
    "village" TEXT,
    "assemblyNumber" TEXT,
    "partNumber" TEXT,
    "partSerial" TEXT,
    "pollingStationName" TEXT,
    "assemblyId" TEXT NOT NULL,
    "boothId" TEXT NOT NULL,
    "mobile" TEXT,
    "verification" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "classification" "Classification",
    "voteStatus" "VoteStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Voter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassificationHistory" (
    "id" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "oldValue" "Classification",
    "newValue" "Classification" NOT NULL,
    "changedById" TEXT,
    "changedByUserId" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassificationHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'UPLOADED',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "validRows" INTEGER NOT NULL DEFAULT 0,
    "duplicateRows" INTEGER NOT NULL DEFAULT 0,
    "errorRows" INTEGER NOT NULL DEFAULT 0,
    "importedRows" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportError" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "rawData" JSONB NOT NULL,
    "errorMessage" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportError_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "details" JSONB,
    "userId" TEXT,
    "volunteerId" TEXT,
    "voterId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL,
    "strongGreenPercent" DOUBLE PRECISION NOT NULL DEFAULT 55,
    "moderateGreenPercent" DOUBLE PRECISION NOT NULL DEFAULT 40,
    "highOpportunityYellow" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "mediumOpportunityYellow" DOUBLE PRECISION NOT NULL DEFAULT 8,
    "highVerification" DOUBLE PRECISION NOT NULL DEFAULT 80,
    "mediumVerification" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "Assembly_number_idx" ON "Assembly"("number");

-- CreateIndex
CREATE INDEX "Assembly_electionYear_idx" ON "Assembly"("electionYear");

-- CreateIndex
CREATE INDEX "Assembly_isActive_idx" ON "Assembly"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Booth_volunteerId_key" ON "Booth"("volunteerId");

-- CreateIndex
CREATE INDEX "Booth_assemblyId_idx" ON "Booth"("assemblyId");

-- CreateIndex
CREATE INDEX "Booth_village_idx" ON "Booth"("village");

-- CreateIndex
CREATE INDEX "Booth_status_idx" ON "Booth"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Booth_assemblyId_boothNumber_key" ON "Booth"("assemblyId", "boothNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Volunteer_mobile_key" ON "Volunteer"("mobile");

-- CreateIndex
CREATE INDEX "Volunteer_status_idx" ON "Volunteer"("status");

-- CreateIndex
CREATE INDEX "Voter_epic_idx" ON "Voter"("epic");

-- CreateIndex
CREATE INDEX "Voter_name_idx" ON "Voter"("name");

-- CreateIndex
CREATE INDEX "Voter_mobile_idx" ON "Voter"("mobile");

-- CreateIndex
CREATE INDEX "Voter_houseNumber_idx" ON "Voter"("houseNumber");

-- CreateIndex
CREATE INDEX "Voter_boothId_idx" ON "Voter"("boothId");

-- CreateIndex
CREATE INDEX "Voter_village_idx" ON "Voter"("village");

-- CreateIndex
CREATE INDEX "Voter_classification_idx" ON "Voter"("classification");

-- CreateIndex
CREATE INDEX "Voter_verification_idx" ON "Voter"("verification");

-- CreateIndex
CREATE INDEX "Voter_gender_idx" ON "Voter"("gender");

-- CreateIndex
CREATE INDEX "Voter_age_idx" ON "Voter"("age");

-- CreateIndex
CREATE INDEX "Voter_partNumber_idx" ON "Voter"("partNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Voter_assemblyId_epic_key" ON "Voter"("assemblyId", "epic");

-- CreateIndex
CREATE INDEX "ClassificationHistory_voterId_idx" ON "ClassificationHistory"("voterId");

-- CreateIndex
CREATE INDEX "ClassificationHistory_changedById_idx" ON "ClassificationHistory"("changedById");

-- CreateIndex
CREATE INDEX "ClassificationHistory_changedByUserId_idx" ON "ClassificationHistory"("changedByUserId");

-- CreateIndex
CREATE INDEX "ClassificationHistory_changedAt_idx" ON "ClassificationHistory"("changedAt");

-- CreateIndex
CREATE INDEX "ImportBatch_uploadedById_idx" ON "ImportBatch"("uploadedById");

-- CreateIndex
CREATE INDEX "ImportBatch_status_idx" ON "ImportBatch"("status");

-- CreateIndex
CREATE INDEX "ImportBatch_createdAt_idx" ON "ImportBatch"("createdAt");

-- CreateIndex
CREATE INDEX "ImportError_batchId_idx" ON "ImportError"("batchId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_entity_idx" ON "AuditLog"("entity");

-- CreateIndex
CREATE INDEX "AuditLog_entityId_idx" ON "AuditLog"("entityId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_volunteerId_idx" ON "AuditLog"("volunteerId");

-- CreateIndex
CREATE INDEX "AuditLog_voterId_idx" ON "AuditLog"("voterId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Booth" ADD CONSTRAINT "Booth_assemblyId_fkey" FOREIGN KEY ("assemblyId") REFERENCES "Assembly"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booth" ADD CONSTRAINT "Booth_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "Volunteer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voter" ADD CONSTRAINT "Voter_assemblyId_fkey" FOREIGN KEY ("assemblyId") REFERENCES "Assembly"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voter" ADD CONSTRAINT "Voter_boothId_fkey" FOREIGN KEY ("boothId") REFERENCES "Booth"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassificationHistory" ADD CONSTRAINT "ClassificationHistory_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "Voter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassificationHistory" ADD CONSTRAINT "ClassificationHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "Volunteer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassificationHistory" ADD CONSTRAINT "ClassificationHistory_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportError" ADD CONSTRAINT "ImportError_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ImportBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "Volunteer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "Voter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
