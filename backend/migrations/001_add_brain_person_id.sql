-- Migration 001: Add brain_person_id to users table
-- Run this in FschoolAI Production DB (Supabase SQL editor)
--
-- PURPOSE:
--   Links each FschoolAI user (Canvas account) to their
--   corresponding person in the NeuroAGI Brain DB.
--   This is the bridge between the two databases.
--
-- WHEN TO RUN:
--   Before deploying the brain-person-service.ts changes.

-- Add brain_person_id column to users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS brain_person_id UUID;

-- Add canvas_user_id if it doesn't exist (needed for lookup)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS canvas_user_id TEXT;

-- Index for fast lookup by canvas_user_id
CREATE INDEX IF NOT EXISTS idx_users_canvas_user_id
  ON public.users (canvas_user_id);

-- Index for fast lookup by brain_person_id
CREATE INDEX IF NOT EXISTS idx_users_brain_person_id
  ON public.users (brain_person_id);

-- Comment for documentation
COMMENT ON COLUMN public.users.brain_person_id IS
  'UUID of the corresponding person in NeuroAGI Brain DB (neuro.persons.id). '
  'Set on first Canvas OAuth login by brain-person-service.ts.';

COMMENT ON COLUMN public.users.canvas_user_id IS
  'Canvas user ID string (e.g. "12345"). Used to look up or create the Brain person.';
