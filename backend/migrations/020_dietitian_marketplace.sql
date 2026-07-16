-- ═══════════════════════════════════════════════════════════════════
-- Dietitian Acquisition & Monetization System
-- Run this once in Supabase → SQL Editor
--
-- Creates:
--   * dietitian_profiles                  (extends profiles for dietitian persona)
--   * dietitian_documents                 (CV / license uploads + review state)
--   * dietitian_needs                     (taxonomy: weight loss, PCOS, diabetes…)
--   * dietitian_specialties               (M:N dietitian ↔ need)
--   * client_dietitian_requests           (platform-generated requests + status)
--   * dietitian_consultations             (active or completed engagements)
--   * dietitian_earnings_ledger           (85/15 split entries, payout_status)
--   * dietitian_payouts                   (admin payout batches)
--   * dietitian_client_invites            (dietitian-invited client invites)
--   * marketplace_settings                (singleton key/value config)
-- ═══════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────
-- 1.  dietitian_profiles  – per-dietitian persona record
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dietitian_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE
        REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name           TEXT,
    headline               TEXT,
    bio                    TEXT,
    years_experience       INT  DEFAULT 0,
    license_number         TEXT,
    license_country        TEXT,
    languages              TEXT[] DEFAULT ARRAY[]::TEXT[],
    photo_url              TEXT,
    -- verification lifecycle: pending | under_review | verified | rejected
    verification_status    TEXT NOT NULL DEFAULT 'pending',
    verification_reason    TEXT,
    verified_at            TIMESTAMPTZ,
    verified_by            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    -- visibility flag in marketplace; auto-true when verified, can be paused
    is_listed              BOOLEAN DEFAULT FALSE,
    accepts_platform_clients BOOLEAN DEFAULT TRUE,
    accepts_invited_clients  BOOLEAN DEFAULT TRUE,
    -- payout details (manual ledger v1)
    payout_method          TEXT DEFAULT 'manual',          -- manual | paystack_subaccount
    payout_account_name    TEXT,
    payout_account_number  TEXT,
    payout_bank_name       TEXT,
    paystack_subaccount_code TEXT,                          -- reserved for future automated split
    metadata               JSONB DEFAULT '{}'::jsonb,
    created_at             TIMESTAMPTZ DEFAULT NOW(),
    updated_at             TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dietitian_profiles_status ON public.dietitian_profiles(verification_status);
CREATE INDEX IF NOT EXISTS idx_dietitian_profiles_listed ON public.dietitian_profiles(is_listed);
CREATE INDEX IF NOT EXISTS idx_dietitian_profiles_user   ON public.dietitian_profiles(user_id);


-- ────────────────────────────────────────────────────────────────────
-- 2.  dietitian_documents  – uploaded credentials
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dietitian_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dietitian_id UUID NOT NULL
        REFERENCES public.dietitian_profiles(id) ON DELETE CASCADE,
    -- type: cv | license | certificate | other
    document_type TEXT NOT NULL,
    file_path     TEXT NOT NULL,        -- supabase storage path
    file_name     TEXT,
    mime_type     TEXT,
    file_size     INT,
    -- review: pending | approved | rejected
    review_status TEXT NOT NULL DEFAULT 'pending',
    review_notes  TEXT,
    reviewed_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at   TIMESTAMPTZ,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dietitian_documents_dietitian ON public.dietitian_documents(dietitian_id);
CREATE INDEX IF NOT EXISTS idx_dietitian_documents_status    ON public.dietitian_documents(review_status);


-- ────────────────────────────────────────────────────────────────────
-- 3.  dietitian_needs   – seeded taxonomy of consultation needs
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dietitian_needs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug         TEXT NOT NULL UNIQUE,
    label        TEXT NOT NULL,
    description  TEXT,
    icon         TEXT,
    sort_order   INT  DEFAULT 0,
    is_active    BOOLEAN DEFAULT TRUE,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.dietitian_needs (slug, label, description, icon, sort_order) VALUES
    ('weight-loss',       'Weight Loss',           'Sustainable weight management plans',                   'scale',     10),
    ('weight-gain',       'Weight Gain',           'Healthy mass gain & muscle nutrition',                  'dumbbell',  20),
    ('pcos',              'PCOS',                  'Nutrition support for polycystic ovary syndrome',       'flower',    30),
    ('diabetes',          'Diabetes',              'Blood-sugar friendly meal planning',                    'droplet',   40),
    ('hypertension',      'Hypertension',          'Heart-healthy, low-sodium guidance',                    'heart',     50),
    ('pregnancy',         'Pregnancy & Postnatal', 'Maternal nutrition for every trimester',               'baby',      60),
    ('pediatric',         'Pediatric Nutrition',   'Healthy eating for children',                           'apple',     70),
    ('sports',            'Sports & Performance',  'Fueling for athletes & active lifestyles',              'activity',  80),
    ('gut-health',        'Gut Health',            'IBS, bloating, and digestion-focused plans',            'leaf',      90),
    ('general-wellness',  'General Wellness',      'Balanced everyday nutrition coaching',                  'sparkles', 100)
ON CONFLICT (slug) DO NOTHING;


-- ────────────────────────────────────────────────────────────────────
-- 4.  dietitian_specialties  – M:N
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dietitian_specialties (
    dietitian_id UUID NOT NULL
        REFERENCES public.dietitian_profiles(id) ON DELETE CASCADE,
    need_id UUID NOT NULL
        REFERENCES public.dietitian_needs(id) ON DELETE CASCADE,
    PRIMARY KEY (dietitian_id, need_id)
);

CREATE INDEX IF NOT EXISTS idx_dietitian_specialties_need ON public.dietitian_specialties(need_id);


-- ────────────────────────────────────────────────────────────────────
-- 5.  client_dietitian_requests
--     A user requests + pays for a platform-generated match
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.client_dietitian_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL
        REFERENCES auth.users(id) ON DELETE CASCADE,
    dietitian_id UUID
        REFERENCES public.dietitian_profiles(id) ON DELETE SET NULL,
    need_id UUID
        REFERENCES public.dietitian_needs(id) ON DELETE SET NULL,
    notes        TEXT,
    -- status: pending_payment | paid | accepted | declined | cancelled | expired | completed
    status       TEXT NOT NULL DEFAULT 'pending_payment',
    fee_amount   NUMERIC(12,2) NOT NULL DEFAULT 0,
    fee_currency TEXT NOT NULL DEFAULT 'NGN',
    payment_reference TEXT,
    paid_at      TIMESTAMPTZ,
    accepted_at  TIMESTAMPTZ,
    declined_at  TIMESTAMPTZ,
    decline_reason TEXT,
    expires_at   TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    metadata     JSONB DEFAULT '{}'::jsonb,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cd_requests_client    ON public.client_dietitian_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_cd_requests_dietitian ON public.client_dietitian_requests(dietitian_id);
CREATE INDEX IF NOT EXISTS idx_cd_requests_status    ON public.client_dietitian_requests(status);


-- ────────────────────────────────────────────────────────────────────
-- 6.  dietitian_consultations
--     Active engagement (created on accept).  source distinguishes flows.
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dietitian_consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dietitian_id UUID NOT NULL
        REFERENCES public.dietitian_profiles(id) ON DELETE CASCADE,
    client_id UUID NOT NULL
        REFERENCES auth.users(id) ON DELETE CASCADE,
    request_id UUID
        REFERENCES public.client_dietitian_requests(id) ON DELETE SET NULL,
    -- source: platform (paid via app)  | invited (dietitian-invited client)
    source       TEXT NOT NULL DEFAULT 'platform',
    -- status: active | paused | ended
    status       TEXT NOT NULL DEFAULT 'active',
    started_at   TIMESTAMPTZ DEFAULT NOW(),
    ended_at     TIMESTAMPTZ,
    notes        TEXT,
    metadata     JSONB DEFAULT '{}'::jsonb,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (dietitian_id, client_id, status)   -- only one active per pair at a time
);

CREATE INDEX IF NOT EXISTS idx_consultations_dietitian ON public.dietitian_consultations(dietitian_id);
CREATE INDEX IF NOT EXISTS idx_consultations_client    ON public.dietitian_consultations(client_id);
CREATE INDEX IF NOT EXISTS idx_consultations_status    ON public.dietitian_consultations(status);


-- ────────────────────────────────────────────────────────────────────
-- 7.  dietitian_earnings_ledger  – immutable financial entries
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dietitian_earnings_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dietitian_id UUID NOT NULL
        REFERENCES public.dietitian_profiles(id) ON DELETE CASCADE,
    consultation_id UUID
        REFERENCES public.dietitian_consultations(id) ON DELETE SET NULL,
    request_id UUID
        REFERENCES public.client_dietitian_requests(id) ON DELETE SET NULL,
    gross_amount   NUMERIC(12,2) NOT NULL,
    platform_fee   NUMERIC(12,2) NOT NULL,
    net_amount     NUMERIC(12,2) NOT NULL,
    currency       TEXT NOT NULL DEFAULT 'NGN',
    -- payout_status: pending | scheduled | paid | reversed
    payout_status  TEXT NOT NULL DEFAULT 'pending',
    payout_id      UUID,
    description    TEXT,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_earnings_dietitian ON public.dietitian_earnings_ledger(dietitian_id);
CREATE INDEX IF NOT EXISTS idx_earnings_status    ON public.dietitian_earnings_ledger(payout_status);


-- ────────────────────────────────────────────────────────────────────
-- 8.  dietitian_payouts  – admin batch payout records
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dietitian_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dietitian_id UUID NOT NULL
        REFERENCES public.dietitian_profiles(id) ON DELETE CASCADE,
    total_amount NUMERIC(12,2) NOT NULL,
    currency     TEXT NOT NULL DEFAULT 'NGN',
    status       TEXT NOT NULL DEFAULT 'pending',  -- pending | processing | paid | failed
    method       TEXT DEFAULT 'manual',
    reference    TEXT,
    notes        TEXT,
    paid_at      TIMESTAMPTZ,
    created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payouts_dietitian ON public.dietitian_payouts(dietitian_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status    ON public.dietitian_payouts(status);


-- ────────────────────────────────────────────────────────────────────
-- 9.  dietitian_client_invites  – invites for "dietitian-invited" flow
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dietitian_client_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dietitian_id UUID NOT NULL
        REFERENCES public.dietitian_profiles(id) ON DELETE CASCADE,
    email         TEXT NOT NULL,
    full_name     TEXT,
    invitation_token TEXT NOT NULL UNIQUE,
    -- status: pending | accepted | expired | revoked
    status        TEXT NOT NULL DEFAULT 'pending',
    message       TEXT,
    expires_at    TIMESTAMPTZ,
    accepted_at   TIMESTAMPTZ,
    accepted_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dci_dietitian ON public.dietitian_client_invites(dietitian_id);
CREATE INDEX IF NOT EXISTS idx_dci_email     ON public.dietitian_client_invites(email);
CREATE INDEX IF NOT EXISTS idx_dci_token     ON public.dietitian_client_invites(invitation_token);


-- ────────────────────────────────────────────────────────────────────
-- 10. marketplace_settings  – single-row tunable config
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.marketplace_settings (
    key   TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

INSERT INTO public.marketplace_settings (key, value) VALUES
    ('consultation_fee',        '{"amount": 5000, "currency": "NGN"}'::jsonb),
    ('platform_split_percent',  '15'::jsonb),
    ('dietitian_split_percent', '85'::jsonb),
    ('platform_registration_fee', '{"amount": 1000, "currency": "NGN"}'::jsonb)
ON CONFLICT (key) DO NOTHING;


-- ────────────────────────────────────────────────────────────────────
-- updated_at triggers
-- ────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    -- dietitian_profiles
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_dp_updated_at') THEN
        CREATE TRIGGER trg_dp_updated_at BEFORE UPDATE ON public.dietitian_profiles
            FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_cdr_updated_at') THEN
        CREATE TRIGGER trg_cdr_updated_at BEFORE UPDATE ON public.client_dietitian_requests
            FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_cons_updated_at') THEN
        CREATE TRIGGER trg_cons_updated_at BEFORE UPDATE ON public.dietitian_consultations
            FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_payout_updated_at') THEN
        CREATE TRIGGER trg_payout_updated_at BEFORE UPDATE ON public.dietitian_payouts
            FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    END IF;
END $$;


-- ────────────────────────────────────────────────────────────────────
-- 11. RLS – disabled here; backend uses service-role key (matches the
-- pattern of existing tables in this project).  If you enable RLS later,
-- add policies similar to migrations/004_simple_rls_for_service_role.sql.
-- ────────────────────────────────────────────────────────────────────


-- ────────────────────────────────────────────────────────────────────
-- 12. Helper view: dietitian earnings summary (per dietitian totals)
-- ────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.dietitian_earnings_summary AS
SELECT
    dp.id  AS dietitian_id,
    dp.user_id,
    COALESCE(SUM(CASE WHEN el.payout_status = 'pending' THEN el.net_amount END), 0)  AS pending_amount,
    COALESCE(SUM(CASE WHEN el.payout_status = 'paid'    THEN el.net_amount END), 0)  AS paid_amount,
    COALESCE(SUM(el.net_amount), 0)  AS lifetime_amount,
    COUNT(el.id)  AS ledger_entries
FROM public.dietitian_profiles dp
LEFT JOIN public.dietitian_earnings_ledger el ON el.dietitian_id = dp.id
GROUP BY dp.id, dp.user_id;
