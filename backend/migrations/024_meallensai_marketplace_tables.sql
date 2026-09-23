-- MealLensAI patient marketplace tables (messaging, appointments, dietitian listings)
-- Safe to run on the shared Supabase project: uses mp_* names to avoid clashing with auth profiles.
-- Point the marketplace FastAPI service (meallensaidieticnafrontend/backend) at this DB with service role.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.mp_profiles (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role IN ('patient', 'dietitian', 'admin')),
  avatar text NOT NULL DEFAULT '',
  country text,
  title text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mp_dietitians (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES public.mp_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  title text NOT NULL DEFAULT 'Dietitian',
  country text NOT NULL DEFAULT '',
  specialties jsonb NOT NULL DEFAULT '[]'::jsonb,
  conditions jsonb NOT NULL DEFAULT '[]'::jsonb,
  years_experience int NOT NULL DEFAULT 0,
  rating numeric NOT NULL DEFAULT 0,
  review_count int NOT NULL DEFAULT 0,
  bio text NOT NULL DEFAULT '',
  languages jsonb NOT NULL DEFAULT '[]'::jsonb,
  workplace text NOT NULL DEFAULT '',
  avatar text NOT NULL DEFAULT '',
  cover_image text NOT NULL DEFAULT '',
  verified boolean NOT NULL DEFAULT false,
  featured boolean NOT NULL DEFAULT false,
  education jsonb NOT NULL DEFAULT '[]'::jsonb,
  experience jsonb NOT NULL DEFAULT '[]'::jsonb,
  documents jsonb NOT NULL DEFAULT '[]'::jsonb,
  reviews jsonb NOT NULL DEFAULT '[]'::jsonb,
  availability jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('approved', 'pending', 'needs_info'))
);

CREATE TABLE IF NOT EXISTS public.mp_applications (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES public.mp_profiles(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT '',
  years_experience int NOT NULL DEFAULT 0,
  bio text NOT NULL DEFAULT '',
  specialties jsonb NOT NULL DEFAULT '[]'::jsonb,
  workplace text NOT NULL DEFAULT '',
  languages jsonb NOT NULL DEFAULT '[]'::jsonb,
  education jsonb NOT NULL DEFAULT '[]'::jsonb,
  experience jsonb NOT NULL DEFAULT '[]'::jsonb,
  documents jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  admin_notes jsonb NOT NULL DEFAULT '[]'::jsonb,
  more_info_request text
);

-- Remaining marketplace tables follow the same mp_ prefix pattern.
-- Full DDL lives in meallensaidieticnafrontend/backend/sql/schema.sql (rename profiles→mp_profiles when applying).
