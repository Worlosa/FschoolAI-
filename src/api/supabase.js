/**
 * supabase.js — Supabase client singleton.
 *
 * Expected Supabase schema:
 *
 * create table users (
 *   id                 text primary key,          -- crypto.randomUUID() from localStorage
 *   name               text,
 *   email              text unique,
 *   password_hash      text,                      -- SHA-256 hex, hashed in browser
 *   school             text,
 *   city               text,
 *   country            text,
 *   continent          text,
 *   canvas_token       text,
 *   canvas_base_url    text,
 *   ring_name          text,
 *   study_time         float    default 0,
 *   streak             int      default 0,
 *   gpa                float,
 *   favorite_song      text,
 *   leaderboard_opt_in boolean  default false,
 *   canvas_synced_at   timestamptz
 * );
 *
 * create table canvas_data (
 *   id          bigint generated always as identity primary key,
 *   user_id     text references users(id),
 *   data_type   text,                            -- 'courses' | 'assignments'
 *   payload     jsonb,
 *   synced_at   timestamptz,
 *   unique(user_id, data_type)
 * );
 */

import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://wqgxpouhbwhwpzudrptp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxZ3hwb3VoYndod3B6dWRycHRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2ODAzOTUsImV4cCI6MjA5MDI1NjM5NX0.2QmvwNyCqVL0aEG3J1vwOlSwnf2SDpY2KKTQDC5Sxwg'
);
