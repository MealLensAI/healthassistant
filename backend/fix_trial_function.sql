-- MINIMAL FIX - Only using columns that actually exist in user_trials table
-- Actual columns: id, user_id, start_date, end_date, is_used, created_at, updated_at
-- NO is_active column, NO duration_days column!

-- Step 1: Drop ALL versions of create_user_trial to fix overloading
DROP FUNCTION IF EXISTS public.create_user_trial(p_user_id UUID, p_firebase_uid TEXT, p_duration_days INT);
DROP FUNCTION IF EXISTS public.create_user_trial(p_user_id UUID, p_duration_days INT);

-- Step 2: Create clean function using ONLY existing columns
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
  -- Check if user already has a trial
  IF EXISTS (SELECT 1 FROM public.user_trials WHERE user_id = p_user_id) THEN
    -- Update existing trial
    UPDATE public.user_trials 
    SET start_date = start_ts,
        end_date = end_ts,
        is_used = false,
        updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING id INTO trial_id;
    
    RETURN jsonb_build_object('id', trial_id, 'success', true);
  ELSE
    -- Insert new trial - ONLY using columns that exist
    INSERT INTO public.user_trials (id, user_id, start_date, end_date, is_used)
    VALUES (trial_id, p_user_id, start_ts, end_ts, false);
    
    RETURN jsonb_build_object('id', trial_id, 'success', true);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Step 3: Create trial for test user
SELECT public.create_user_trial('7d6eb9a1-2680-45a1-9152-34c38fba3e97'::UUID, 7);

-- Step 4: Verify (using only columns that exist)
SELECT 
    user_id,
    start_date,
    end_date,
    EXTRACT(DAY FROM (end_date - start_date)) as days_between,
    is_used,
    created_at,
    updated_at
FROM public.user_trials
WHERE user_id = '7d6eb9a1-2680-45a1-9152-34c38fba3e97'
ORDER BY created_at DESC
LIMIT 1;
