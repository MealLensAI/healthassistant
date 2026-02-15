-- ═══════════════════════════════════════════════════════════════════
-- FIX: PGRST203 "Could not choose the best candidate function"
-- Supabase had two create_user_trial overloads; PostgREST can't pick.
-- Run in Supabase → SQL Editor. Run 013 first if you want 7-day default.
-- ═══════════════════════════════════════════════════════════════════

-- Drop the 3-parameter version (p_user_id, p_firebase_uid, p_duration_days)
-- so only the 2-parameter version (p_user_id, p_duration_days) remains.
DO $$
BEGIN
  EXECUTE 'DROP FUNCTION IF EXISTS public.create_user_trial(uuid, text, integer)';
  RAISE NOTICE 'Dropped create_user_trial(uuid, text, integer)';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Drop 3-param create_user_trial: %', SQLERRM;
END $$;
