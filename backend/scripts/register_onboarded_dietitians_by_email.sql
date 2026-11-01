-- Register onboarded nutritionists into the care marketplace as PENDING applications.
-- Run in Supabase → SQL Editor.
--
-- Safe by design:
--   * Does NOT create Auth accounts (would break login).
--   * Does NOT approve anyone or list them publicly.
--   * Does NOT invent documents, bios, licenses, or specialties.
--   * Does NOT overwrite an existing application / listing that already has data.
--   * Empty credential fields are valid in the database. The apply form requires
--     them only when the specialist submits. They can open /dietitian/apply → Edit later.
--   * Patients cannot see these people until an admin approves.
--
-- How to use:
--   1. Run STEP 1 (preview) first and read the result.
--   2. If the missing-account rows look right, run STEP 2.
--   3. Hard-refresh Admin → Applications. Approve or request more info there.

-- ═══════════════════════════════════════════════════════════════════
-- STEP 1 — PREVIEW (read only). Run this by itself first.
-- ═══════════════════════════════════════════════════════════════════
with raw_emails (email) as (
  values
    ('obisanyadamilolaa@gmail.com'),
    ('ernestprecious35@gmail.com'),
    ('omaarchibong@gmail.com'),
    ('bennieozota@gmail.com'),
    ('amukafavour@gmail.com'),
    ('amakalynda1506@gmail.com'),
    ('halimaardoabdullahi@gmail.com'),
    ('debsnwachukwu@gmail.com'),
    ('lovelynngwu79@gmail.com'),
    ('ezinwapep@gmail.com'),
    ('bawomukwu@gmail.com'),
    ('uzimns@gmail.com'),
    ('ejimofor.nancy@yahoo.com'),
    ('rauthaesau@gmail.com'),
    ('ochanma1@gmail.com'),
    ('mobolaadeoye21@gmail.com'),
    ('isaacsylviachi@gmail.com'),
    ('happinessurebu@gmail.com'),
    ('aadebaare@gmail.com'),
    ('rachealchukwuemeka9@gmail.com'),
    ('dorisianaemene@gmail.com'),
    ('chidinm.onuigbo@unn.edu.ng'),
    ('ukpidorcas@gmail.com'),
    ('ritanwankwo32@gmail.com'),
    ('ekwechidinma06@gmail.com'),
    ('oriazemercy@gmail.com'),
    ('chideraazoribe@gmail.com'),
    ('mariyaibrahim160@gmail.com'),
    ('wisdomsabastine73@gmail.com'),
    ('okechukwunaomi94@gmail.com'),
    ('patienceunyime@gmail.com'),
    ('preshdarl@gmail.com'),
    ('chiscosylvanus@gmail.com'),
    ('onyinyechigift2016@gmail.com'),
    ('mebenezer992@gmail.com'),
    ('ezejiobianuju2015@gmail.com'),
    ('haphsat3@gmail.com'),
    ('zaynabmusashafa@gmail.com'),
    ('celineslime@gmail.com'),
    ('kosidinma05@gmail.com'),
    ('amakaq977@gmail.com'),
    ('defooddoc1@gmail.com'),
    ('roselineamarachi18@gmail.com'),
    ('queendalinenkechi51@gmail.com'),
    ('hanna.enuka2013@outlook.com'),
    ('obianyanwuudochukwu@gmail.com'),
    ('mohammedaishatu598@gmail.com'),
    ('danben4god@gmail.com'),
    ('anamazobiestherada@gmail.com'),
    ('beverleychigbu@gmail.com'),
    ('carolineamagwula@gmail.com'),
    ('agimchioma1900@yahoo.com'),
    ('chinagoromvivian3@gmail.com'),
    ('aishaahmadbuba23@gmail.com'),
    ('okerekedicksono.dufuth@gmail.com'),
    ('ibrahimhamzayb@gmail.com'),
    ('bellomhotorlarh@gmail.com'),
    ('miracleg2019@gmail.com'),
    ('adioayomide963@gmail.com'),
    ('amarachinwaogu20141@gmail.com'),
    ('teeolabodetee@yahoo.com'),
    ('ogunsuyideborah92@gmail.com'),
    ('omotayoaugustine@gmail.com'),
    ('olufunmilolaosinowo@gmail.com'),
    ('izoboomotola@gmail.com'),
    ('ehigiatorjessica24@gmail.com'),
    ('temitopeomola@gmail.com'),
    ('kemisolaayodeji1733@gmail.com'),
    ('blessedeka@gmail.com'),
    ('chukwumamkpamisrael@gmail.com'),
    ('oluwatoyintijani177@gmail.com'),
    ('mojimoke07@yahoo.com'),
    ('brightyboo5@gmail.com'),
    ('mojirolabablo@gmail.com'),
    ('ladybiodun1@gmail.com'),
    ('joseygentle88@gmail.com'),
    ('romsycoates@gmail.com')
),
wanted as (
  select distinct lower(trim(email)) as email from raw_emails
)
select
  w.email,
  u.id as auth_user_id,
  coalesce(mp.role, '(no marketplace profile)') as marketplace_role,
  coalesce(app.status, '(no application)') as application_status,
  coalesce(d.status, '(no listing)') as listing_status,
  case
    when u.id is null then 'MISSING AUTH — cannot register (they must sign up first)'
    when mp.role = 'admin' then 'SKIP — admin account'
    when d.status = 'approved' or app.status = 'approved' then 'SKIP — already approved'
    when app.id is not null and d.id is not null then 'SKIP — already registered, waiting on admin'
    else 'WILL REGISTER as pending (admin must approve)'
  end as action
from wanted w
left join auth.users u on lower(u.email) = w.email
left join public.mp_profiles mp on mp.id = u.id
left join lateral (
  select a.id, a.status
  from public.mp_applications a
  where a.user_id = u.id
  order by a.submitted_at desc nulls last
  limit 1
) app on true
left join public.mp_dietitians d on d.user_id = u.id
order by action, w.email;


-- ═══════════════════════════════════════════════════════════════════
-- STEP 2 — REGISTER. Run after you are happy with the preview.
-- Highlight only this block (from BEGIN to COMMIT) and run it.
-- ═══════════════════════════════════════════════════════════════════
begin;

create temporary table tmp_onboard_emails (
  email text primary key
) on commit drop;

insert into tmp_onboard_emails (email)
select distinct lower(trim(email))
from (
  values
    ('obisanyadamilolaa@gmail.com'),
    ('ernestprecious35@gmail.com'),
    ('omaarchibong@gmail.com'),
    ('bennieozota@gmail.com'),
    ('amukafavour@gmail.com'),
    ('amakalynda1506@gmail.com'),
    ('halimaardoabdullahi@gmail.com'),
    ('debsnwachukwu@gmail.com'),
    ('lovelynngwu79@gmail.com'),
    ('ezinwapep@gmail.com'),
    ('bawomukwu@gmail.com'),
    ('uzimns@gmail.com'),
    ('ejimofor.nancy@yahoo.com'),
    ('rauthaesau@gmail.com'),
    ('ochanma1@gmail.com'),
    ('mobolaadeoye21@gmail.com'),
    ('isaacsylviachi@gmail.com'),
    ('happinessurebu@gmail.com'),
    ('aadebaare@gmail.com'),
    ('rachealchukwuemeka9@gmail.com'),
    ('dorisianaemene@gmail.com'),
    ('chidinm.onuigbo@unn.edu.ng'),
    ('ukpidorcas@gmail.com'),
    ('ritanwankwo32@gmail.com'),
    ('ekwechidinma06@gmail.com'),
    ('oriazemercy@gmail.com'),
    ('chideraazoribe@gmail.com'),
    ('mariyaibrahim160@gmail.com'),
    ('wisdomsabastine73@gmail.com'),
    ('okechukwunaomi94@gmail.com'),
    ('patienceunyime@gmail.com'),
    ('preshdarl@gmail.com'),
    ('chiscosylvanus@gmail.com'),
    ('onyinyechigift2016@gmail.com'),
    ('mebenezer992@gmail.com'),
    ('ezejiobianuju2015@gmail.com'),
    ('haphsat3@gmail.com'),
    ('zaynabmusashafa@gmail.com'),
    ('celineslime@gmail.com'),
    ('kosidinma05@gmail.com'),
    ('amakaq977@gmail.com'),
    ('defooddoc1@gmail.com'),
    ('roselineamarachi18@gmail.com'),
    ('queendalinenkechi51@gmail.com'),
    ('hanna.enuka2013@outlook.com'),
    ('obianyanwuudochukwu@gmail.com'),
    ('mohammedaishatu598@gmail.com'),
    ('danben4god@gmail.com'),
    ('anamazobiestherada@gmail.com'),
    ('beverleychigbu@gmail.com'),
    ('carolineamagwula@gmail.com'),
    ('agimchioma1900@yahoo.com'),
    ('chinagoromvivian3@gmail.com'),
    ('aishaahmadbuba23@gmail.com'),
    ('okerekedicksono.dufuth@gmail.com'),
    ('ibrahimhamzayb@gmail.com'),
    ('bellomhotorlarh@gmail.com'),
    ('miracleg2019@gmail.com'),
    ('adioayomide963@gmail.com'),
    ('amarachinwaogu20141@gmail.com'),
    ('teeolabodetee@yahoo.com'),
    ('ogunsuyideborah92@gmail.com'),
    ('omotayoaugustine@gmail.com'),
    ('olufunmilolaosinowo@gmail.com'),
    ('izoboomotola@gmail.com'),
    ('ehigiatorjessica24@gmail.com'),
    ('temitopeomola@gmail.com'),
    ('kemisolaayodeji1733@gmail.com'),
    ('blessedeka@gmail.com'),
    ('chukwumamkpamisrael@gmail.com'),
    ('oluwatoyintijani177@gmail.com'),
    ('mojimoke07@yahoo.com'),
    ('brightyboo5@gmail.com'),
    ('mojirolabablo@gmail.com'),
    ('ladybiodun1@gmail.com'),
    ('joseygentle88@gmail.com'),
    ('romsycoates@gmail.com')
) as t(email);

create temporary table tmp_onboard_targets (
  user_id uuid primary key,
  email text not null,
  full_name text not null,
  country text not null default '',
  phone text not null default '',
  already_application boolean not null default false,
  already_listing boolean not null default false
) on commit drop;

insert into tmp_onboard_targets (user_id, email, full_name, country, phone, already_application, already_listing)
select
  u.id,
  coalesce(u.email, e.email),
  coalesce(
    nullif(trim(mp.name), ''),
    nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(concat_ws(' ', u.raw_user_meta_data->>'first_name', u.raw_user_meta_data->>'last_name')), ''),
    nullif(trim(initcap(replace(split_part(coalesce(u.email, e.email), '@', 1), '.', ' '))), ''),
    split_part(coalesce(u.email, e.email), '@', 1)
  ),
  coalesce(nullif(trim(mp.country), ''), ''),
  coalesce(nullif(trim(mp.phone), ''), ''),
  exists (select 1 from public.mp_applications a where a.user_id = u.id),
  exists (select 1 from public.mp_dietitians d where d.user_id = u.id)
from tmp_onboard_emails e
join auth.users u on lower(u.email) = e.email
left join public.mp_profiles mp on mp.id = u.id
where coalesce(mp.role, 'patient') <> 'admin';

-- Marketplace identity. New rows become dietitian. Existing non-admin rows
-- are flipped the same way /dietitian/apply already does on submit.
insert into public.mp_profiles (id, name, email, role, country, title, phone)
select t.user_id, t.full_name, t.email, 'dietitian', nullif(t.country, ''), 'Dietitian', nullif(t.phone, '')
from tmp_onboard_targets t
on conflict (id) do update
set
  role = case
    when public.mp_profiles.role = 'admin' then public.mp_profiles.role
    else 'dietitian'
  end,
  title = case
    when public.mp_profiles.role = 'admin' then public.mp_profiles.title
    else coalesce(nullif(public.mp_profiles.title, ''), 'Dietitian')
  end,
  name = case
    when coalesce(nullif(trim(public.mp_profiles.name), ''), '') = '' then excluded.name
    else public.mp_profiles.name
  end,
  email = coalesce(nullif(public.mp_profiles.email, ''), excluded.email),
  updated_at = now();

-- Pending application for admin review. Keep any application that already exists.
insert into public.mp_applications (
  user_id, full_name, email, phone, country,
  years_experience, bio, specialties, workplace, languages,
  education, experience, documents, status, admin_notes
)
select
  t.user_id,
  t.full_name,
  t.email,
  t.phone,
  t.country,
  0,
  '',
  '[]'::jsonb,
  '',
  '["English"]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  'pending',
  jsonb_build_array(
    'Bulk registered from onboarding list. Documents were not uploaded. Specialist can complete them later from /dietitian/apply.'
  )
from tmp_onboard_targets t
where not t.already_application
  and not exists (
    select 1 from public.mp_applications a where a.user_id = t.user_id
  );

-- Hidden pending listing. Patients never see pending/unverified rows.
insert into public.mp_dietitians (
  user_id, name, title, country, specialties, conditions,
  years_experience, bio, languages, workplace, documents,
  education, experience, reviews, availability, verified, featured, status
)
select
  t.user_id,
  t.full_name,
  'Dietitian',
  t.country,
  '[]'::jsonb,
  '[]'::jsonb,
  0,
  '',
  '["English"]'::jsonb,
  '',
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
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
  false,
  false,
  'pending'
from tmp_onboard_targets t
where not t.already_listing
  and not exists (
    select 1 from public.mp_dietitians d where d.user_id = t.user_id
  );

-- Legacy dietitian_profiles row, still pending and not listed.
-- Skipped automatically if that older table is not in this project.
do $legacy$
begin
  if to_regclass('public.dietitian_profiles') is null then
    return;
  end if;
  insert into public.dietitian_profiles (
    user_id, display_name, headline, bio, years_experience,
    languages, verification_status, is_listed, accepts_platform_clients
  )
  select
    t.user_id,
    t.full_name,
    'Dietitian',
    '',
    0,
    array['English']::text[],
    'pending',
    false,
    true
  from tmp_onboard_targets t
  where not exists (
    select 1 from public.dietitian_profiles dp where dp.user_id = t.user_id
  );
end
$legacy$;

-- Tell every marketplace admin, once per newly created application.
insert into public.mp_notifications (user_id, kind, title, body, href, read)
select
  admin.id,
  'registration',
  'New dietitian registration',
  t.full_name || ' registered as a dietitian and is waiting for verification.',
  '/admin/applications/' || a.id::text,
  false
from tmp_onboard_targets t
join public.mp_applications a
  on a.user_id = t.user_id
 and a.status = 'pending'
join public.mp_profiles admin
  on admin.role = 'admin'
where not t.already_application
  and not exists (
    select 1
    from public.mp_notifications n
    where n.user_id = admin.id
      and n.kind = 'registration'
      and n.href = '/admin/applications/' || a.id::text
  );

-- Result set: who was registered, who was skipped, who has no Auth account.
select
  e.email,
  t.user_id,
  t.full_name,
  case
    when t.user_id is null then 'missing_auth_account'
    when t.already_application and t.already_listing then 'already_registered'
    else 'registered_pending'
  end as outcome,
  coalesce(a.status, '(none)') as application_status,
  coalesce(d.status, '(none)') as listing_status,
  coalesce(jsonb_array_length(a.documents), 0) as document_count
from tmp_onboard_emails e
left join tmp_onboard_targets t on t.email = e.email or lower(t.email) = e.email
left join lateral (
  select status, documents
  from public.mp_applications
  where user_id = t.user_id
  order by submitted_at desc nulls last
  limit 1
) a on true
left join public.mp_dietitians d on d.user_id = t.user_id
order by outcome, e.email;

commit;
