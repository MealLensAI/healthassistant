-- Marketplace / care data for the existing MealLensAI Supabase project.
--
-- This schema deliberately uses the mp_ prefix.  The original application
-- already owns public.profiles, payments, subscriptions and enterprise tables.
-- Marketplace users share the same Supabase Auth UUID, but their marketplace
-- role and care-specific data remain isolated here.
--
-- Run this migration in the Supabase SQL editor before enabling CARE_STORE=supabase.

create extension if not exists pgcrypto;

create table if not exists public.mp_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null unique,
  role text not null default 'patient' check (role in ('patient', 'dietitian', 'admin')),
  avatar_key text,
  country text,
  title text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mp_dietitians (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.mp_profiles(id) on delete cascade,
  name text not null default '',
  title text not null default 'Dietitian',
  country text not null default '',
  specialties jsonb not null default '[]'::jsonb,
  conditions jsonb not null default '[]'::jsonb,
  years_experience integer not null default 0 check (years_experience >= 0),
  rating numeric not null default 0 check (rating >= 0 and rating <= 5),
  review_count integer not null default 0 check (review_count >= 0),
  bio text not null default '',
  languages jsonb not null default '[]'::jsonb,
  workplace text not null default '',
  avatar_key text,
  cover_image_key text,
  verified boolean not null default false,
  featured boolean not null default false,
  education jsonb not null default '[]'::jsonb,
  experience jsonb not null default '[]'::jsonb,
  documents jsonb not null default '[]'::jsonb,
  reviews jsonb not null default '[]'::jsonb,
  availability jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (status in ('approved', 'pending', 'needs_info')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mp_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.mp_profiles(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text not null default '',
  country text not null default '',
  years_experience integer not null default 0 check (years_experience >= 0),
  bio text not null default '',
  specialties jsonb not null default '[]'::jsonb,
  workplace text not null default '',
  languages jsonb not null default '[]'::jsonb,
  education jsonb not null default '[]'::jsonb,
  experience jsonb not null default '[]'::jsonb,
  documents jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (status in ('approved', 'pending', 'needs_info', 'rejected')),
  submitted_at timestamptz not null default now(),
  admin_notes jsonb not null default '[]'::jsonb,
  more_info_request text,
  reviewed_by uuid references public.mp_profiles(id) on delete set null,
  reviewed_at timestamptz
);

create table if not exists public.mp_conversations (
  id uuid primary key default gen_random_uuid(),
  last_message text not null default '',
  last_at timestamptz not null default now(),
  last_read_at jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.mp_conversation_participants (
  conversation_id uuid not null references public.mp_conversations(id) on delete cascade,
  user_id uuid not null references public.mp_profiles(id) on delete cascade,
  primary key (conversation_id, user_id)
);

create table if not exists public.mp_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.mp_conversations(id) on delete cascade,
  sender_id uuid not null references public.mp_profiles(id) on delete cascade,
  text text not null default '',
  timestamp timestamptz not null default now(),
  attachments jsonb not null default '[]'::jsonb
);

create table if not exists public.mp_appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.mp_profiles(id) on delete cascade,
  dietitian_id uuid not null references public.mp_dietitians(id) on delete cascade,
  starts_at timestamptz not null,
  status text not null default 'upcoming' check (status in ('upcoming', 'completed', 'cancelled', 'no_show')),
  type text not null default 'video' check (type in ('video', 'chat')),
  topic text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mp_patient_files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.mp_profiles(id) on delete cascade,
  shared_with_id uuid references public.mp_profiles(id) on delete set null,
  bucket text not null default 'meallens-care-private',
  object_key text not null unique,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  category text not null default 'other',
  uploaded_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.mp_consultation_requests (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.mp_profiles(id) on delete cascade,
  dietitian_id uuid not null references public.mp_dietitians(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  note text not null default ''
);

create table if not exists public.mp_patient_profiles (
  user_id uuid primary key references public.mp_profiles(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.mp_patient_settings (
  user_id uuid primary key references public.mp_profiles(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.mp_device_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.mp_profiles(id) on delete cascade,
  device text not null default '',
  location text not null default '',
  last_active timestamptz not null default now(),
  current boolean not null default false
);

create table if not exists public.mp_missed_calls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.mp_profiles(id) on delete cascade,
  peer_id uuid not null references public.mp_profiles(id) on delete cascade,
  peer_name text not null default '',
  created_at timestamptz not null default now(),
  seen boolean not null default false
);

create table if not exists public.mp_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.mp_profiles(id) on delete cascade,
  kind text not null default 'info',
  title text not null,
  body text not null default '',
  href text,
  created_at timestamptz not null default now(),
  read boolean not null default false
);

create table if not exists public.mp_live_calls (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.mp_conversations(id) on delete cascade,
  caller_id uuid not null references public.mp_profiles(id) on delete cascade,
  callee_id uuid not null references public.mp_profiles(id) on delete cascade,
  status text not null default 'ringing' check (status in ('ringing', 'live')),
  started_at timestamptz not null default now(),
  offer jsonb,
  answer jsonb,
  ice jsonb not null default '[]'::jsonb
);

create index if not exists mp_dietitians_status_idx on public.mp_dietitians (status);
create index if not exists mp_messages_conversation_timestamp_idx on public.mp_messages (conversation_id, timestamp);
create index if not exists mp_appointments_patient_starts_idx on public.mp_appointments (patient_id, starts_at);
create index if not exists mp_appointments_dietitian_starts_idx on public.mp_appointments (dietitian_id, starts_at);
create index if not exists mp_patient_files_owner_idx on public.mp_patient_files (owner_id) where deleted_at is null;
create index if not exists mp_notifications_user_created_idx on public.mp_notifications (user_id, created_at desc);
create index if not exists mp_live_calls_participants_idx on public.mp_live_calls (caller_id, callee_id);

-- Browser clients never receive direct table access.  The Flask API verifies
-- Supabase Auth tokens and uses its server-side service role to access these.
alter table public.mp_profiles enable row level security;
alter table public.mp_dietitians enable row level security;
alter table public.mp_applications enable row level security;
alter table public.mp_conversations enable row level security;
alter table public.mp_conversation_participants enable row level security;
alter table public.mp_messages enable row level security;
alter table public.mp_appointments enable row level security;
alter table public.mp_patient_files enable row level security;
alter table public.mp_consultation_requests enable row level security;
alter table public.mp_patient_profiles enable row level security;
alter table public.mp_patient_settings enable row level security;
alter table public.mp_device_sessions enable row level security;
alter table public.mp_missed_calls enable row level security;
alter table public.mp_notifications enable row level security;
alter table public.mp_live_calls enable row level security;
