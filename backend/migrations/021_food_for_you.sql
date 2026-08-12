-- Food for you recommendations (1:1 with user)
-- Stores personalized food cards so they load from DB instead of regenerating on every visit.

CREATE TABLE IF NOT EXISTS public.food_for_you (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    foods JSONB NOT NULL DEFAULT '[]'::jsonb,
    source_plan JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_food_for_you_user_id ON public.food_for_you(user_id);
CREATE INDEX IF NOT EXISTS idx_food_for_you_updated_at ON public.food_for_you(updated_at DESC);

ALTER TABLE public.food_for_you ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_food_for_you" ON public.food_for_you;
CREATE POLICY "service_role_all_food_for_you" ON public.food_for_you
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users can view their own food_for_you" ON public.food_for_you;
CREATE POLICY "Users can view their own food_for_you" ON public.food_for_you
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own food_for_you" ON public.food_for_you;
CREATE POLICY "Users can insert their own food_for_you" ON public.food_for_you
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own food_for_you" ON public.food_for_you;
CREATE POLICY "Users can update their own food_for_you" ON public.food_for_you
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own food_for_you" ON public.food_for_you;
CREATE POLICY "Users can delete their own food_for_you" ON public.food_for_you
    FOR DELETE
    USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.food_for_you TO authenticated;
GRANT ALL ON public.food_for_you TO service_role;

CREATE OR REPLACE FUNCTION public.update_food_for_you_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_food_for_you_updated_at ON public.food_for_you;
CREATE TRIGGER trigger_update_food_for_you_updated_at
    BEFORE UPDATE ON public.food_for_you
    FOR EACH ROW
    EXECUTE FUNCTION public.update_food_for_you_updated_at();
