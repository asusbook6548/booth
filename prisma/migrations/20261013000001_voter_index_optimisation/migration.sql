-- ============================================================
-- Migration: voter_index_optimisation
-- ============================================================
-- Goals
--   1. Enable pg_trgm for fast trigram (ILIKE / %) searches on name columns.
--   2. Replace the plain B-tree index on "name" with a GIN trigram index;
--      add GIN trigram indexes on "nameHindi" and "fatherName".
--   3. Drop the low-selectivity B-tree indexes on "gender" and "age".
--
-- NOTE: CONCURRENTLY is intentionally NOT used here because Prisma wraps
-- every migration in a single transaction block and PostgreSQL does not
-- allow CONCURRENTLY inside a transaction.
--
-- CLUSTER and VACUUM ANALYZE are maintenance operations that also cannot
-- run inside a transaction; they are handled by the standalone script
-- scripts/post-import-maintenance.sql (run manually or via a cron job).
-- ============================================================

-- ============================================================
-- 1. pg_trgm extension
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- 2. Drop old plain B-tree indexes being replaced or removed
-- ============================================================

-- Old plain B-tree on name (replaced by GIN below)
DROP INDEX IF EXISTS "Voter_name_idx";

-- Low-selectivity indexes – removed to save write amplification and ~15 MB per 350k rows
DROP INDEX IF EXISTS "Voter_gender_idx";
DROP INDEX IF EXISTS "Voter_age_idx";

-- ============================================================
-- 3. Create GIN trigram indexes on text name columns
-- ============================================================

CREATE INDEX IF NOT EXISTS "Voter_name_gin_idx"
  ON "Voter" USING gin ("name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Voter_nameHindi_gin_idx"
  ON "Voter" USING gin ("nameHindi" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Voter_fatherName_gin_idx"
  ON "Voter" USING gin ("fatherName" gin_trgm_ops);

