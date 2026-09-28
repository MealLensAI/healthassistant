-- Harden food_for_you RLS so service_role writes always succeed.
-- Backend uses the service role key; user JWT policies remain for direct client reads.

ALTER TABLE public.food_for_you ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_food_for_you" ON public.food_for_you;
CREATE POLICY "service_role_all_food_for_you" ON public.food_for_you
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their own food_for_you" ON public.food_for_you;
CREATE POLICY "Users can view their own food_for_you" ON public.food_for_you
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own food_for_you" ON public.food_for_you;
CREATE POLICY "Users can insert their own food_for_you" ON public.food_for_you
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own food_for_you" ON public.food_for_you;
CREATE POLICY "Users can update their own food_for_you" ON public.food_for_you
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own food_for_you" ON public.food_for_you;
CREATE POLICY "Users can delete their own food_for_you" ON public.food_for_you
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.food_for_you TO authenticated;
GRANT ALL ON public.food_for_you TO service_role;
