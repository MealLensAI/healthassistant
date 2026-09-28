-- Profile-completeness additions for patient, dietitian, and admin care roles.
-- Run after 025_marketplace_care_schema.sql.

-- Patient clinical details are stored as a complete versioned JSON document in
-- mp_patient_profiles.payload.  That payload contains legal/preferred names,
-- date of birth, sex/gender, contact and emergency contact, conditions,
-- measurements, allergies, intolerances, medication, supplements, and lifestyle.
comment on column public.mp_patient_profiles.payload is
  'Clinical profile: identity, contacts, conditions, measurements, diet, medication and lifestyle fields.';

-- User-wide preferences apply to every marketplace role.  This fixes the
-- previous UI-only dietitian/admin notification settings without duplicating
-- patient clinical data or the main application''s authentication/profile rows.
create table if not exists public.mp_account_preferences (
  user_id uuid primary key references public.mp_profiles(id) on delete cascade,
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  timezone text not null default 'UTC',
  notification_preferences jsonb not null default '{
    "push": true,
    "email": true,
    "sms": false,
    "appointment24h": true,
    "appointment1h": true,
    "quietHours": false
  }'::jsonb,
  call_preferences jsonb not null default '{
    "cameraDefaultOn": true,
    "micDefaultOn": true,
    "blurBackground": false
  }'::jsonb,
  privacy_preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.mp_account_preferences enable row level security;

-- Helpful indexes for the administrative profile/verification screens.
create index if not exists mp_profiles_role_idx on public.mp_profiles (role);
create index if not exists mp_applications_user_status_idx on public.mp_applications (user_id, status);
