-- supabase-auth-migration.sql
-- Migrate NeuroAgi login from the hand-rolled neuroagi.users + SHA-256 scheme
-- to Supabase Auth (GoTrue, which owns the `auth` schema and does bcrypt salting).
--
-- STRATEGY: we do NOT move data into `auth`. GoTrue manages auth.users itself.
-- Instead we BRIDGE: keep neuroagi.users as the profile table (gpa, canvas_token,
-- streak, …) and add an auth_id column linking each profile to its auth.users row.
-- This keeps every existing FK (courses.user_id, assignments.user_id, files.user_id
-- → neuroagi.users.id, which stays `text`) untouched. Same pattern as the existing
-- brain_person_id bridge.
--
-- Run in the Supabase SQL editor against the FschoolAI project (wqgxpouhbwhwpzudrptp).
-- Phase 1 is safe to run now (additive). Phase 2 tightens RLS and MUST NOT run until
-- both the web app and the extension are sending a real user JWT — otherwise reads break.

-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 1 — bridge column (safe, additive, run anytime)
-- ─────────────────────────────────────────────────────────────────────────────

alter table neuroagi.users
  add column if not exists auth_id uuid references auth.users(id) on delete set null;

create unique index if not exists users_auth_id_key
  on neuroagi.users (auth_id)
  where auth_id is not null;

-- password_hash stays for now so lazy-migration (verify old hash → create auth user)
-- can still read it. Drop it only after Phase 3 backfill confirms every active user
-- has an auth_id:  alter table neuroagi.users drop column password_hash;


-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 2 — real RLS (run ONLY after app + extension send the user's access_token)
-- ─────────────────────────────────────────────────────────────────────────────
-- Today every table has `open_all USING (true)` because auth.uid() is null.
-- Once login goes through GoTrue, auth.uid() resolves to auth.users.id and we can
-- scope rows to the owner. Child tables key on neuroagi.users.id (text), so they
-- resolve ownership through the profile row.

-- helper: the caller's profile id (text) for the current JWT
create or replace function neuroagi.current_profile_id()
returns text
language sql stable
as $$
  select id from neuroagi.users where auth_id = auth.uid()
$$;

-- users: a row is yours if its auth_id matches your JWT
drop policy if exists open_all on neuroagi.users;
create policy users_self on neuroagi.users
  for all
  using (auth_id = auth.uid())
  with check (auth_id = auth.uid());

-- child tables: row is yours if its user_id maps to your profile
-- (repeat this block for every table that has a user_id fk — courses,
--  assignments, files, and any Canvas-data tables: announcements, modules,
--  assignment_groups, discussion_topics, etc.)
drop policy if exists open_all on neuroagi.courses;
create policy courses_self on neuroagi.courses
  for all
  using (user_id = neuroagi.current_profile_id())
  with check (user_id = neuroagi.current_profile_id());

drop policy if exists open_all on neuroagi.assignments;
create policy assignments_self on neuroagi.assignments
  for all
  using (user_id = neuroagi.current_profile_id())
  with check (user_id = neuroagi.current_profile_id());

drop policy if exists open_all on neuroagi.files;
create policy files_self on neuroagi.files
  for all
  using (user_id = neuroagi.current_profile_id())
  with check (user_id = neuroagi.current_profile_id());


-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 3 — backfill helper (server-side, service_role only — NOT for the client)
-- ─────────────────────────────────────────────────────────────────────────────
-- You cannot import SHA-256 hashes into GoTrue (it expects bcrypt). Existing users
-- get an auth.users row either by:
--   (a) force-reset:  admin.createUser({email, password: random, email_confirm:true})
--                     for every neuroagi.users row, then email a reset link; or
--   (b) lazy migrate: on next successful SHA-256 login, admin.createUser with the
--                     plaintext they just typed, then set auth_id below.
-- Both run in a Vercel function with the service_role key. After creating the auth
-- user, link it:
--   update neuroagi.users set auth_id = $1 where id = $2;
