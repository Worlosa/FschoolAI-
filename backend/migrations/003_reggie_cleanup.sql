-- ============================================================
-- Migration 003: Reggie Brand Cleanup
-- ============================================================
-- 
-- PURPOSE: Consolidate all 'reggie' product tags to 'fschoolai' and
--          drop empty legacy reggie_* tables from FschoolAI Production DB.
--
-- CONTEXT: Reggie was the original codename for the AI tutor inside FschoolAI.
--          Now that FschoolAI is the single product, all data tagged 'reggie'
--          should be retagged to 'fschoolai'. The student names their own tutor.
--
-- WHEN TO RUN: After deploying the code changes in this commit.
--              The code now writes product='fschoolai' everywhere, so this
--              migration just catches up the historical data.
--
-- ============================================================
-- ⚠️  THIS FILE CONTAINS TWO SECTIONS FOR TWO DIFFERENT DATABASES.
--     DO NOT RUN THE ENTIRE FILE IN ONE DATABASE.
-- ============================================================


-- ════════════════════════════════════════════════════════════════
-- SECTION 1: Run in NeuroAGI Brain DB
-- (https://qiolhlvqfzujnkwnymft.supabase.co → SQL Editor)
-- ════════════════════════════════════════════════════════════════

-- Update all signals tagged 'reggie' → 'fschoolai'
UPDATE brain.signals 
SET product = 'fschoolai' 
WHERE product = 'reggie';

-- Update all reflections tagged 'reggie' → 'fschoolai'
UPDATE brain.reflections 
SET product = 'fschoolai' 
WHERE product = 'reggie';

-- Update behavioral_signals if they exist (legacy table from earlier migration)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'behavioral_signals') THEN
    EXECUTE 'UPDATE behavioral_signals SET product = ''fschoolai'' WHERE product = ''reggie''';
  END IF;
END $$;

-- Update insights if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'insights') THEN
    EXECUTE 'UPDATE insights SET product = ''fschoolai'' WHERE product = ''reggie''';
  END IF;
END $$;

-- Drop the legacy reggie_brain_signals view (created in 003_add_product_context.sql)
DROP VIEW IF EXISTS reggie_brain_signals;

-- Update cross_product_insights view to only reference fschoolai
-- (The old view hardcoded 'reggie' as secondary_product — no longer relevant)
DROP VIEW IF EXISTS cross_product_insights;


-- ════════════════════════════════════════════════════════════════
-- SECTION 2: Run in FschoolAI Production DB
-- (https://wqgxpouhbwhwpzudrptp.supabase.co → SQL Editor)
-- ════════════════════════════════════════════════════════════════

-- Drop empty/migrated legacy tables.
-- All data from these was migrated to Brain DB in the May 2025 migration.
-- ⚠️  DO NOT drop public.reggie_founding_record — it has 3 rows of founding quotes (keep forever).

DROP TABLE IF EXISTS public.reggie_impressions;
DROP TABLE IF EXISTS public.reggie_session_notes;
DROP TABLE IF EXISTS public.reggie_arc;
DROP TABLE IF EXISTS public.reggie_config;

-- Verify reggie_founding_record still exists (should have 3 rows)
-- SELECT count(*) FROM public.reggie_founding_record;
-- Expected: 3


-- ════════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES (run after both sections complete)
-- ════════════════════════════════════════════════════════════════

-- In Brain DB: Confirm no 'reggie' product tags remain
-- SELECT count(*) FROM brain.signals WHERE product = 'reggie';
-- Expected: 0

-- SELECT count(*) FROM brain.reflections WHERE product = 'reggie';
-- Expected: 0

-- In FschoolAI Production DB: Confirm tables are gone
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'reggie_%';
-- Expected: only reggie_founding_record
