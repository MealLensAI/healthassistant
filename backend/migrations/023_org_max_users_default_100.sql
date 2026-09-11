-- Ensure organizations start with 100 invite slots (not the legacy default of 10).
-- Run in Supabase → SQL Editor if you want a one-shot DB fix for all existing orgs.

ALTER TABLE public.enterprises
    ALTER COLUMN max_users SET DEFAULT 100;

UPDATE public.enterprises
SET max_users = 100
WHERE COALESCE(max_users, 0) <= 10;

-- Optional: keep seat_limit in sync when that column exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'enterprises'
          AND column_name = 'seat_limit'
    ) THEN
        EXECUTE 'ALTER TABLE public.enterprises ALTER COLUMN seat_limit SET DEFAULT 100';
        EXECUTE 'UPDATE public.enterprises SET seat_limit = 100 WHERE COALESCE(seat_limit, 0) <= 10';
    END IF;
END $$;
