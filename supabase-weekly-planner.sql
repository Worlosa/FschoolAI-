-- supabase-weekly-planner.sql — tables for the Weekly Plan agent (G3.3).
-- Run in the Supabase SQL editor. Project convention: RLS disabled, server uses the
-- service key. NOTE: calendar tokens are stored here; they are only ever read server-side
-- (service key) and the table has RLS off like the rest — consider column encryption /
-- Vault before public launch (see PRD §9 "Canvas tokens stored encrypted").

create table if not exists public.calendar_connections (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null unique,            -- one connection per user (upsert key)
  provider      text not null default 'google',
  access_token  text,
  refresh_token text,
  expires_at    timestamptz,
  scope         text,
  calendar_id   text not null default 'primary',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
alter table public.calendar_connections disable row level security;

create table if not exists public.weekly_plans (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null,
  week_start         timestamptz not null default now(),
  blocks             jsonb not null default '[]'::jsonb,   -- [{taskId,title,course,start,end}]
  plan_note          text,
  calendar_event_ids jsonb,                                -- Google event ids, once written
  created_at         timestamptz not null default now()
);
create index if not exists weekly_plans_user_idx on public.weekly_plans (user_id, created_at desc);
alter table public.weekly_plans disable row level security;

-- If PostgREST 404s the new tables (PGRST205) right after creating them:
-- notify pgrst, 'reload schema';
