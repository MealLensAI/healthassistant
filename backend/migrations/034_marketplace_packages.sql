-- Bronze / Silver / Gold patient packages and appointment visit kind.
-- Does not change enterprise invite / organization_users.

alter table public.mp_appointments
  add column if not exists visit_kind text not null default 'consultation';

alter table public.mp_appointments drop constraint if exists mp_appointments_visit_kind_check;
alter table public.mp_appointments
  add constraint mp_appointments_visit_kind_check
  check (visit_kind in ('consultation', 'follow_up'));

insert into public.subscription_plans (name, display_name, price_usd, duration_days, features, is_active)
select 'bronze', 'Bronze', 10, 30,
  '["Unlimited AI meal tools","Ingredient scanning","Food detection","Meal planning","Health history","No marketplace dietitian"]'::jsonb,
  true
where not exists (select 1 from public.subscription_plans where name = 'bronze');

insert into public.subscription_plans (name, display_name, price_usd, duration_days, features, is_active)
select 'silver', 'Silver', 20, 30,
  '["Everything in Bronze","Marketplace access","1 dietitian at a time","1 consultation","2 follow-up appointments","Appointment calendar"]'::jsonb,
  true
where not exists (select 1 from public.subscription_plans where name = 'silver');

insert into public.subscription_plans (name, display_name, price_usd, duration_days, features, is_active)
select 'gold', 'Gold', 50, 90,
  '["Everything in Silver","3 months of access","1 consultation","6 follow-up appointments","20% off vs 3 months of Silver"]'::jsonb,
  true
where not exists (select 1 from public.subscription_plans where name = 'gold');

update public.subscription_plans
set display_name = 'Bronze', price_usd = 10, duration_days = 30, is_active = true,
    features = '["Unlimited AI meal tools","Ingredient scanning","Food detection","Meal planning","Health history","No marketplace dietitian"]'::jsonb
where name = 'bronze';

update public.subscription_plans
set display_name = 'Silver', price_usd = 20, duration_days = 30, is_active = true,
    features = '["Everything in Bronze","Marketplace access","1 dietitian at a time","1 consultation","2 follow-up appointments","Appointment calendar"]'::jsonb
where name = 'silver';

update public.subscription_plans
set display_name = 'Gold', price_usd = 50, duration_days = 90, is_active = true,
    features = '["Everything in Silver","3 months of access","1 consultation","6 follow-up appointments","20% off vs 3 months of Silver"]'::jsonb
where name = 'gold';

-- Hide the old duration-only SKUs from the plans catalog. Existing
-- subscribers keep their rows; entitlement mapping still recognizes them.
update public.subscription_plans
set is_active = false
where name in ('monthly', 'six_months', 'yearly')
   or name ilike '$20%'
   or name ilike '$120%'
   or name ilike '$240%';
