-- Clearaer download log. Each click stores a timestamp.
-- Paste this in Supabase → SQL Editor → Run.
-- It does not change MealLensAI tables.

create table if not exists public.clearaer_downloads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text,
  email text,
  feedback text
);

alter table public.clearaer_downloads
  add column if not exists name text,
  add column if not exists email text,
  add column if not exists feedback text;

alter table public.clearaer_downloads enable row level security;

drop policy if exists clearaer_downloads_read on public.clearaer_downloads;
create policy clearaer_downloads_read
  on public.clearaer_downloads
  for select
  to anon, authenticated
  using (true);

drop policy if exists clearaer_downloads_insert on public.clearaer_downloads;
create policy clearaer_downloads_insert
  on public.clearaer_downloads
  for insert
  to anon, authenticated
  with check (true);

grant select, insert on public.clearaer_downloads to anon, authenticated;
