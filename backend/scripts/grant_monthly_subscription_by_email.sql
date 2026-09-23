-- Grant a 1-month subscription by email (Supabase SQL Editor).
-- Matches Payment.tsx monthly plan: label '$20 Monthly', durationMinutes 43200.
-- features must be jsonb (not text[]).
-- Access gate: user_subscriptions.status = 'active' AND current_period_end > now().

DO $$
DECLARE
  v_email text := 'user@example.com';  -- << change this
  v_user_id uuid;
  v_plan_id uuid;
BEGIN
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

  -- Match Payment.tsx monthly plan (minutes convention in duration_days)
  SELECT id INTO v_plan_id
  FROM public.subscription_plans
  WHERE name = '$20 Monthly'
  LIMIT 1;

  IF v_plan_id IS NULL THEN
    INSERT INTO public.subscription_plans (
      name, display_name, price_usd, duration_days, features, is_active
    ) VALUES (
      '$20 Monthly',
      '$20 Monthly',
      20,
      43200,  -- 30 days in minutes (same as Payment.tsx)
      '["Full app access"]'::jsonb,
      true
    )
    RETURNING id INTO v_plan_id;
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
    NOW() + INTERVAL '30 days'
  );

  RAISE NOTICE 'Activated 30-day sub for % (user_id=%, plan_id=%)',
    v_email, v_user_id, v_plan_id;
END $$;

-- Verify (use the same email you granted):
-- SELECT us.status, us.current_period_start, us.current_period_end, sp.name, p.email
-- FROM public.user_subscriptions us
-- JOIN public.profiles p ON p.id = us.user_id
-- LEFT JOIN public.subscription_plans sp ON sp.id = us.plan_id
-- WHERE lower(p.email) = lower('user@example.com')
-- ORDER BY us.created_at DESC;
