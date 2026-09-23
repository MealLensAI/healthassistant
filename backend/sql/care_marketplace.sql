-- MealLensAI demo schema for Supabase (Postgres).
-- Run this in the SQL editor, then: python -m app.seed

create extension if not exists pgcrypto;

create table if not exists profiles (
  id text primary key,
  name text not null,
  email text not null unique,
  role text not null check (role in ('patient', 'dietitian', 'admin')),
  avatar text not null default '',
  country text,
  title text,
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists dietitians (
  id text primary key,
  user_id text not null references profiles(id) on delete cascade,
  name text not null,
  title text not null default 'Dietitian',
  country text not null default '',
  specialties jsonb not null default '[]'::jsonb,
  conditions jsonb not null default '[]'::jsonb,
  years_experience int not null default 0,
  rating numeric not null default 0,
  review_count int not null default 0,
  bio text not null default '',
  languages jsonb not null default '[]'::jsonb,
  workplace text not null default '',
  avatar text not null default '',
  cover_image text not null default '',
  verified boolean not null default false,
  featured boolean not null default false,
  education jsonb not null default '[]'::jsonb,
  experience jsonb not null default '[]'::jsonb,
  documents jsonb not null default '[]'::jsonb,
  reviews jsonb not null default '[]'::jsonb,
  availability jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (status in ('approved', 'pending', 'needs_info'))
);

create table if not exists applications (
  id text primary key,
  user_id text not null references profiles(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text not null default '',
  country text not null default '',
  years_experience int not null default 0,
  bio text not null default '',
  specialties jsonb not null default '[]'::jsonb,
  workplace text not null default '',
  languages jsonb not null default '[]'::jsonb,
  education jsonb not null default '[]'::jsonb,
  experience jsonb not null default '[]'::jsonb,
  documents jsonb not null default '[]'::jsonb,
  status text not null default 'pending',
  submitted_at timestamptz not null default now(),
  admin_notes jsonb not null default '[]'::jsonb,
  more_info_request text
);

create table if not exists conversations (
  id text primary key,
  last_message text not null default '',
  last_at timestamptz not null default now(),
  last_read_at jsonb not null default '{}'::jsonb
);

create table if not exists conversation_participants (
  conversation_id text not null references conversations(id) on delete cascade,
  user_id text not null references profiles(id) on delete cascade,
  primary key (conversation_id, user_id)
);

create table if not exists messages (
  id text primary key,
  conversation_id text not null references conversations(id) on delete cascade,
  sender_id text not null references profiles(id) on delete cascade,
  text text not null,
  timestamp timestamptz not null default now(),
  attachments jsonb not null default '[]'::jsonb
);

create table if not exists appointments (
  id text primary key,
  patient_id text not null references profiles(id) on delete cascade,
  dietitian_id text not null references dietitians(id) on delete cascade,
  date text not null,
  time text not null,
  status text not null default 'upcoming',
  type text not null default 'video',
  topic text not null default ''
);

create table if not exists patient_files (
  id text primary key,
  owner_id text not null references profiles(id) on delete cascade,
  shared_with_id text references profiles(id) on delete set null,
  name text not null,
  category text not null default 'other',
  size text not null default '',
  uploaded_at timestamptz not null default now(),
  url text
);

create table if not exists consultation_requests (
  id text primary key,
  patient_id text not null references profiles(id) on delete cascade,
  dietitian_id text not null references dietitians(id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  note text not null default ''
);

create table if not exists patient_profiles (
  user_id text primary key references profiles(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb
);

create table if not exists patient_settings (
  user_id text primary key references profiles(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb
);

create table if not exists device_sessions (
  id text primary key,
  user_id text not null references profiles(id) on delete cascade,
  device text not null default '',
  location text not null default '',
  last_active text not null default '',
  current boolean not null default false
);

create table if not exists payment_methods (
  id text primary key,
  patient_id text not null references profiles(id) on delete cascade,
  label text not null,
  kind text not null default 'card',
  last4 text,
  expiry text,
  is_default boolean not null default false
);

create table if not exists payment_quotes (
  id text primary key,
  patient_id text not null references profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  amount numeric not null,
  currency text not null default 'GBP',
  dietitian_name text,
  kind text not null default 'consult',
  status text not null default 'open'
);

create table if not exists payments (
  id text primary key,
  patient_id text not null references profiles(id) on delete cascade,
  quote_id text references payment_quotes(id) on delete set null,
  amount numeric not null,
  currency text not null default 'GBP',
  method text not null default '',
  status text not null default 'paid',
  paid_at timestamptz not null default now(),
  receipt text not null default '',
  description text not null default ''
);

create table if not exists missed_calls (
  id text primary key,
  user_id text not null references profiles(id) on delete cascade,
  peer_id text not null,
  peer_name text not null,
  created_at timestamptz not null default now(),
  seen boolean not null default false
);

create table if not exists notifications (
  id text primary key,
  user_id text not null references profiles(id) on delete cascade,
  kind text not null default 'info',
  title text not null,
  body text not null default '',
  href text,
  created_at timestamptz not null default now(),
  read boolean not null default false
);

alter table profiles enable row level security;
alter table dietitians enable row level security;
alter table applications enable row level security;
alter table conversations enable row level security;
alter table conversation_participants enable row level security;
alter table messages enable row level security;
alter table appointments enable row level security;
alter table patient_files enable row level security;
alter table consultation_requests enable row level security;
alter table patient_profiles enable row level security;
alter table patient_settings enable row level security;
alter table device_sessions enable row level security;
alter table payment_methods enable row level security;
alter table payment_quotes enable row level security;
alter table payments enable row level security;
alter table missed_calls enable row level security;
alter table notifications enable row level security;

create table if not exists live_calls (
  id text primary key,
  conversation_id text not null,
  caller_id text not null references profiles(id) on delete cascade,
  callee_id text not null references profiles(id) on delete cascade,
  caller_name text not null default '',
  caller_avatar text not null default '',
  callee_name text not null default '',
  callee_avatar text not null default '',
  status text not null default 'ringing',
  started_at timestamptz not null default now(),
  offer jsonb,
  answer jsonb,
  ice jsonb not null default '[]'::jsonb
);

alter table live_calls enable row level security;

-- The FastAPI service uses the service role key, which bypasses RLS.
-- No anon policies on purpose: the browser talks to Python, not Supabase.
