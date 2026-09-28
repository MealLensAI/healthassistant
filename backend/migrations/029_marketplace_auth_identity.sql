-- Marketplace identity is the Supabase Auth UUID (mp_profiles.id), not email.
-- Keeping email unique caused a recreated Auth account to be merged into the
-- old person's care profile when both records used the same email address.

alter table public.mp_profiles
  drop constraint if exists mp_profiles_email_key;

create index if not exists mp_profiles_email_idx
  on public.mp_profiles (lower(email));
