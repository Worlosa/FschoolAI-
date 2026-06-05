-- Migration 002: Add performance indexes to NeuroAGI Brain DB
-- Run this in NeuroAGI Brain DB (Supabase SQL editor)
--
-- PURPOSE:
--   brain.signals will grow to millions of rows.
--   Without these indexes, queries will slow to 200ms+ per message.
--   These indexes make context window assembly fast (<10ms).
--
-- WHEN TO RUN:
--   Before onboarding more than 10 students.
--   Safe to run on live DB — CREATE INDEX IF NOT EXISTS is non-destructive.

-- brain.signals — most queried table
CREATE INDEX IF NOT EXISTS idx_signals_person_type_time
  ON brain.signals (person_id, signal_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_signals_person_source_time
  ON brain.signals (person_id, source, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_signals_unprocessed
  ON brain.signals (processed, created_at DESC)
  WHERE processed = false;

-- agents.messages — chat history lookup
CREATE INDEX IF NOT EXISTS idx_messages_person_session
  ON agents.messages (person_id, session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_person_time
  ON agents.messages (person_id, created_at DESC);

-- brain.reflections — context window assembly
CREATE INDEX IF NOT EXISTS idx_reflections_person_time
  ON brain.reflections (person_id, created_at DESC);

-- neuro.patterns — pattern lookup
CREATE INDEX IF NOT EXISTS idx_patterns_person_confidence
  ON neuro.patterns (person_id, confidence DESC);

-- agents.sessions — session history
CREATE INDEX IF NOT EXISTS idx_sessions_person_time
  ON agents.sessions (person_id, started_at DESC);

-- brain.context_window — fast context lookup
CREATE INDEX IF NOT EXISTS idx_context_window_person
  ON brain.context_window (person_id, updated_at DESC);

-- neuro.memory — key-value lookup
CREATE INDEX IF NOT EXISTS idx_memory_person_key
  ON neuro.memory (person_id, key);

-- neuro.persons — Canvas user lookup
CREATE INDEX IF NOT EXISTS idx_persons_canvas_user_id
  ON neuro.persons (canvas_user_id);

CREATE INDEX IF NOT EXISTS idx_persons_email
  ON neuro.persons (email);
