
-- Step 1: Add duration_days column to user_trials table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_trials' AND column_name = 'duration_days'
    ) THEN
        ALTER TABLE public.user_trials ADD COLUMN duration_days INT DEFAULT 7;
        RAISE NOTICE 'Added duration_days column';
    ELSE
        RAISE NOTICE 'duration_days column already exists';
    END IF;
END $$;

-- Step 2: Drop the old 3-parameter function
DROP FUNCTION IF EXISTS public.create_user_trial(p_user_id UUID, p_firebase_uid TEXT, p_duration_days INT);

-- Step 3: Create the correct 2-parameter function with 7-day default
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
        duration_days = days,
        is_active = true,
        updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING id INTO trial_id;
    
    RETURN jsonb_build_object('id', trial_id, 'success', true, 'action', 'updated');
  ELSE
    -- Insert new trial record
    INSERT INTO public.user_trials (id, user_id, start_date, end_date, duration_days, is_active)
    VALUES (trial_id, p_user_id, start_ts, end_ts, days, true);
    
    RETURN jsonb_build_object('id', trial_id, 'success', true, 'action', 'created');
  END IF;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
