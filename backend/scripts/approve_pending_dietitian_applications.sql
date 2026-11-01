-- Approve every pending / needs_info dietitian application.
-- Matches Admin → Applications → Approve:
--   application = approved
--   listing     = approved + verified + featured (patients can now see them)
--
-- How to use in Supabase → SQL Editor:
--   1. Run STEP 1 to see who will be approved.
--   2. Run STEP 2 (BEGIN … COMMIT) to approve them.
--   3. Hard-refresh Admin. Safe to re-run; already-approved rows are skipped.

-- ═══════════════════════════════════════════════════════════════════
-- STEP 1 — PREVIEW (read only)
-- ═══════════════════════════════════════════════════════════════════
select
  a.id as application_id,
  a.email,
  a.full_name,
  a.status as application_status,
  coalesce(d.status, '(no listing)') as listing_status,
  coalesce(jsonb_array_length(a.documents), 0) as document_count
from public.mp_applications a
left join public.mp_dietitians d on d.user_id = a.user_id
where a.status in ('pending', 'needs_info')
order by a.submitted_at;


-- ═══════════════════════════════════════════════════════════════════
-- STEP 2 — APPROVE ALL PENDING. Highlight this block and run it.
-- ═══════════════════════════════════════════════════════════════════
begin;

create temporary table tmp_approve_apps (
  application_id uuid primary key,
  user_id uuid not null,
  full_name text not null
) on commit drop;

insert into tmp_approve_apps (application_id, user_id, full_name)
select a.id, a.user_id, a.full_name
from public.mp_applications a
where a.status in ('pending', 'needs_info');

update public.mp_applications a
set
  status = 'approved',
  reviewed_at = now(),
  more_info_request = null,
  admin_notes = coalesce(a.admin_notes, '[]'::jsonb)
    || jsonb_build_array('Approved by admin bulk SQL on ' || to_char(now() at time zone 'utc', 'YYYY-MM-DD HH24:MI') || ' UTC')
where a.id in (select application_id from tmp_approve_apps);

-- Make the listing live, same flags as the admin Approve button.
update public.mp_dietitians d
set
  status = 'approved',
  verified = true,
  featured = true,
  updated_at = now()
where d.user_id in (select user_id from tmp_approve_apps);

-- If a pending application has no listing yet, create an approved one.
insert into public.mp_dietitians (
  user_id, name, title, country, specialties, conditions,
  years_experience, bio, languages, workplace, documents,
  education, experience, reviews, availability, verified, featured, status
)
select
  a.user_id,
  a.full_name,
  'Dietitian',
  coalesce(a.country, ''),
  coalesce(a.specialties, '[]'::jsonb),
  coalesce(a.specialties, '[]'::jsonb),
  coalesce(a.years_experience, 0),
  coalesce(a.bio, ''),
  coalesce(a.languages, '[]'::jsonb),
  coalesce(a.workplace, ''),
  coalesce(a.documents, '[]'::jsonb),
  coalesce(a.education, '[]'::jsonb),
  coalesce(a.experience, '[]'::jsonb),
  '[]'::jsonb,
  '[
    {"day":"Mon","enabled":true,"start":"09:00","end":"17:00"},
    {"day":"Tue","enabled":true,"start":"09:00","end":"17:00"},
    {"day":"Wed","enabled":true,"start":"09:00","end":"17:00"},
    {"day":"Thu","enabled":true,"start":"09:00","end":"17:00"},
    {"day":"Fri","enabled":true,"start":"09:00","end":"17:00"},
    {"day":"Sat","enabled":false,"start":"09:00","end":"17:00"},
    {"day":"Sun","enabled":false,"start":"09:00","end":"17:00"}
  ]'::jsonb,
  true,
  true,
  'approved'
from public.mp_applications a
join tmp_approve_apps t on t.application_id = a.id
where not exists (
  select 1 from public.mp_dietitians d where d.user_id = a.user_id
);

-- Keep marketplace role on dietitian so they land in practice, not the patient app.
update public.mp_profiles p
set
  role = 'dietitian',
  title = coalesce(nullif(p.title, ''), 'Dietitian'),
  updated_at = now()
where p.id in (select user_id from tmp_approve_apps)
  and p.role <> 'admin';

-- Legacy table, if it exists.
do $legacy$
begin
  if to_regclass('public.dietitian_profiles') is null then
    return;
  end if;
  update public.dietitian_profiles dp
  set
    verification_status = 'verified',
    is_listed = true,
    verified_at = now(),
    updated_at = now()
  where dp.user_id in (select user_id from tmp_approve_apps);

  insert into public.dietitian_profiles (
    user_id, display_name, headline, bio, years_experience,
    languages, verification_status, is_listed, accepts_platform_clients,
    verified_at
  )
  select
    t.user_id,
    t.full_name,
    'Dietitian',
    '',
    0,
    array['English']::text[],
    'verified',
    true,
    true,
    now()
  from tmp_approve_apps t
  where not exists (
    select 1 from public.dietitian_profiles dp where dp.user_id = t.user_id
  );
end
$legacy$;

-- Same specialist notification the admin Approve button sends.
insert into public.mp_notifications (user_id, kind, title, body, href, read)
select
  t.user_id,
  'info',
  'You''re approved',
  'Your dietitian application was approved. Open your practice to set availability.',
  '/dietitian',
  false
from tmp_approve_apps t
where not exists (
  select 1
  from public.mp_notifications n
  where n.user_id = t.user_id
    and n.title = 'You''re approved'
    and n.created_at > now() - interval '1 day'
);

select
  t.full_name,
  a.email,
  a.status as application_status,
  d.status as listing_status,
  d.verified,
  d.featured
from tmp_approve_apps t
join public.mp_applications a on a.id = t.application_id
join public.mp_dietitians d on d.user_id = t.user_id
order by a.email;

commit;
