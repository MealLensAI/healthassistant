-- Completes persistence for existing backend endpoints that currently call
-- Supabase tables not present in the deployed schema.
-- Run after the existing migrations.

create extension if not exists pgcrypto;

create table if not exists public.ai_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt text not null,
  response text not null,
  timestamp timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ai_sessions_user_timestamp_idx
  on public.ai_sessions (user_id, timestamp desc);

create table if not exists public.user_sessions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  login_at timestamptz not null default now(),
  device_info jsonb not null default '{}'::jsonb,
  last_active_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists user_sessions_user_active_idx
  on public.user_sessions (user_id, last_active_at desc);

alter table public.ai_sessions enable row level security;
alter table public.user_sessions enable row level security;

-- The Flask backend uses the service role after validating the caller's
-- Supabase token. No browser-facing table policies are granted here.
