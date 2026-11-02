-- Clearaer download counter only.
-- Paste this in Supabase → SQL Editor → Run.
-- It does not change MealLensAI tables.

create table if not exists public.clearaer_download_count (
  id smallint primary key default 1 check (id = 1),
  total bigint not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.clearaer_download_count (id, total)
values (1, 0)
on conflict (id) do nothing;

alter table public.clearaer_download_count enable row level security;

grant select on public.clearaer_download_count to anon, authenticated, service_role;

drop policy if exists clearaer_download_count_read on public.clearaer_download_count;
create policy clearaer_download_count_read
  on public.clearaer_download_count
  for select
  to anon, authenticated
  using (true);

create or replace function public.bump_clearaer_downloads()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  next_total bigint;
begin
  insert into public.clearaer_download_count (id, total, updated_at)
  values (1, 1, now())
  on conflict (id) do update
    set total = public.clearaer_download_count.total + 1,
        updated_at = now()
  returning public.clearaer_download_count.total into next_total;
  return coalesce(next_total, 0);
end;
$$;

revoke all on function public.bump_clearaer_downloads() from public;
grant execute on function public.bump_clearaer_downloads() to anon, authenticated, service_role;
