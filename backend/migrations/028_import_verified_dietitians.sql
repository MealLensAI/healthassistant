-- Import verified, publicly listed legacy dietitians into the care directory.
-- Run after 025/026. Preserve all existing marketplace records and approvals.
begin;
do $migration$
declare
  profile_id_type text;
  listing_id_type text;
begin
  if to_regclass('public.dietitian_profiles') is null then return; end if;
  select data_type into profile_id_type from information_schema.columns
    where table_schema = 'public' and table_name = 'mp_profiles' and column_name = 'id';
  select data_type into listing_id_type from information_schema.columns
    where table_schema = 'public' and table_name = 'mp_dietitians' and column_name = 'id';
  -- Older installations have text IDs; fresh installations have UUIDs.
  execute format($query$
    insert into public.mp_profiles (id, name, email, role, avatar_key, country, title)
    select d.user_id::%s, coalesce(nullif(d.display_name, ''), split_part(u.email, '@', 1)),
      u.email, 'dietitian', d.photo_url, d.license_country, coalesce(d.headline, 'Dietitian')
    from public.dietitian_profiles d join auth.users u on u.id = d.user_id
    where d.verification_status = 'verified' and d.is_listed = true
      and d.accepts_platform_clients = true and u.email is not null
    on conflict do nothing
  $query$, profile_id_type);
  execute format($query$
    insert into public.mp_dietitians
      (id, user_id, name, title, country, bio, years_experience, languages,
       avatar_key, verified, status, specialties)
    select d.id::%s, d.user_id::%s, coalesce(nullif(d.display_name, ''), p.name),
      coalesce(d.headline, 'Dietitian'), coalesce(d.license_country, ''), coalesce(d.bio, ''),
      greatest(coalesce(d.years_experience, 0), 0), to_jsonb(coalesce(d.languages, array[]::text[])),
      d.photo_url, true, 'approved',
      coalesce((select jsonb_agg(n.label order by n.sort_order)
        from public.dietitian_specialties s join public.dietitian_needs n on n.id = s.need_id
        where s.dietitian_id = d.id), '[]'::jsonb)
    from public.dietitian_profiles d join public.mp_profiles p on p.id = d.user_id::%s
    where d.verification_status = 'verified' and d.is_listed = true
      and d.accepts_platform_clients = true and p.role = 'dietitian'
      and not exists (select 1 from public.mp_dietitians m where m.user_id = p.id)
    on conflict do nothing
  $query$, listing_id_type, profile_id_type, profile_id_type);
end
$migration$;
commit;
