-- ============================================================
-- scripts/post-import-maintenance.sql
-- ============================================================
-- Run this script OUTSIDE a transaction (i.e. NOT via Prisma
-- migrations) after a bulk voter import, or as a scheduled
-- maintenance job.
--
-- Usage (psql):
--   psql "$DATABASE_URL" -f scripts/post-import-maintenance.sql
--
-- Or via the npm script:
--   npm run db:maintain
--
-- Why outside a transaction?
--   CLUSTER and VACUUM cannot run inside a transaction block.
--   Prisma's $executeRawUnsafe opens a connection-level txn,
--   so these are safer to run directly via psql.
-- ============================================================

-- ============================================================
-- 1. CLUSTER
-- ============================================================
-- Physically reorders the Voter heap so all rows belonging
-- to the same booth are stored on adjacent pages.
-- This cuts random I/O on per-booth queries from O(rows) to
-- O(booth_size) page reads.
--
-- IMPORTANT: Takes an ACCESS EXCLUSIVE lock for the duration.
-- Run during off-peak hours.
-- ============================================================

CLUSTER "Voter" USING "Voter_boothId_idx";

-- Refresh planner statistics after physical reorder
ANALYZE "Voter";

-- ============================================================
-- 2. VACUUM ANALYZE
-- ============================================================
-- Reclaims dead tuples produced by upsert retries during the
-- bulk import, and updates all column statistics so the query
-- planner picks optimal join/scan strategies.
-- ============================================================

VACUUM ANALYZE "Voter";
