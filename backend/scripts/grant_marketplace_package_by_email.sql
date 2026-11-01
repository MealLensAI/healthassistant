-- Grant Bronze / Silver / Gold to a patient (Supabase SQL Editor).
-- Only one plan can be active at a time. Change v_plan_name and re-run to switch.
--
-- 1. Set v_email and v_plan_name below ('bronze' | 'silver' | 'gold')
-- 2. Run this whole script
-- 3. Hard-refresh the app (or log out and in) so subscription status reloads

DO $$
DECLARE
  v_email text := 'danielsamueletukudo@gmail.com';
  v_plan_name text := 'silver';  -- bronze | silver | gold
  v_user_id uuid;
  v_plan_id uuid;
  v_days int;
BEGIN
  v_plan_name := lower(trim(v_plan_name));
  IF v_plan_name NOT IN ('bronze', 'silver', 'gold') THEN
    RAISE EXCEPTION 'v_plan_name must be bronze, silver, or gold (got %)', v_plan_name;
  END IF;

  v_days := CASE v_plan_name
    WHEN 'gold' THEN 90
    ELSE 30
  END;

  SELECT id INTO v_user_id
  FROM public.profiles
  WHERE lower(email) = lower(v_email)
  LIMIT 1;

  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE lower(email) = lower(v_email)
    LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No user found for email %', v_email;
  END IF;

  SELECT id INTO v_plan_id
  FROM public.subscription_plans
  WHERE name = v_plan_name
  LIMIT 1;

  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'Plan % not found. Run backend/migrations/034_marketplace_packages.sql first.', v_plan_name;
  END IF;

  DELETE FROM public.user_subscriptions
  WHERE user_id = v_user_id
    AND status IN ('expired', 'cancelled');

  UPDATE public.user_subscriptions
  SET status = 'expired',
      current_period_end = NOW(),
      updated_at = NOW()
  WHERE user_id = v_user_id
    AND status = 'active';

  INSERT INTO public.user_subscriptions (
    user_id, plan_id, status,
    current_period_start, current_period_end
  ) VALUES (
    v_user_id,
    v_plan_id,
    'active',
    NOW(),
    NOW() + make_interval(days => v_days)
  );

  RAISE NOTICE 'Activated % for % (user_id=%, days=%)',
    v_plan_name, v_email, v_user_id, v_days;
END $$;

-- Verify:
SELECT us.status, us.current_period_start, us.current_period_end, sp.name, sp.display_name, p.email
FROM public.user_subscriptions us
JOIN public.profiles p ON p.id = us.user_id
LEFT JOIN public.subscription_plans sp ON sp.id = us.plan_id
WHERE lower(p.email) = lower('danielsamueletukudo@gmail.com')
ORDER BY us.created_at DESC;
