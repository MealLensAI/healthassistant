-- iClearer: add lead + feedback columns to the shared download table.
-- Paste in Supabase → SQL Editor → Run if not applied automatically.

alter table public.clearaer_downloads
  add column if not exists name text,
  add column if not exists email text,
  add column if not exists feedback text;

-- Keep public read/insert so the frontend can store and show feedback.
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

notify pgrst, 'reload schema';
