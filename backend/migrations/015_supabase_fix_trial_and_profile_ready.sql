-- ═══════════════════════════════════════════════════════════════════
-- RUN THIS ONCE in Supabase → SQL Editor (fixes PGRST203 trial error)
-- 1) Drop the 3-param create_user_trial so PostgREST can pick the 2-param one.
-- 2) Ensure the 2-param function exists and uses 7 days (start_date/end_date).
-- ═══════════════════════════════════════════════════════════════════

-- Step 1: Remove overload (fixes "Could not choose the best candidate function")
DROP FUNCTION IF EXISTS public.create_user_trial(uuid, text, integer);

-- Step 2: Replace 2-param version with 7-day default (start_date/end_date schema)
CREATE OR REPLACE FUNCTION public.create_user_trial(p_user_id UUID, p_duration_days INT DEFAULT 7)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  trial_id UUID := gen_random_uuid();
  start_ts TIMESTAMPTZ := NOW();
  days INT := COALESCE(NULLIF(p_duration_days, 0), 7);
  end_ts TIMESTAMPTZ := start_ts + (days || ' days')::INTERVAL;
BEGIN
  INSERT INTO public.user_trials (id, user_id, start_date, end_date, duration_days, is_active)
  VALUES (trial_id, p_user_id, start_ts, end_ts, days, true);
  RETURN jsonb_build_object('id', trial_id, 'success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
