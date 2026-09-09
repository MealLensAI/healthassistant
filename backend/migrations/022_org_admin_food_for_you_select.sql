-- Allow organization owners and admins to read members' food_for_you rows.
-- Needed so the enterprise dashboard can fetch the same list the member currently sees.
-- Run this in the Supabase SQL Editor.

CREATE OR REPLACE FUNCTION public.can_org_admin_view_user(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.enterprises e
      INNER JOIN public.organization_users ou ON ou.enterprise_id = e.id
      WHERE e.created_by = auth.uid()
        AND ou.user_id = target_user_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.organization_users admin_ou
      INNER JOIN public.organization_users member_ou
        ON admin_ou.enterprise_id = member_ou.enterprise_id
      WHERE admin_ou.user_id = auth.uid()
        AND admin_ou.role = 'admin'
        AND member_ou.user_id = target_user_id
    );
$$;

REVOKE ALL ON FUNCTION public.can_org_admin_view_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_org_admin_view_user(uuid) TO authenticated;

DROP POLICY IF EXISTS "org_admins_can_view_member_food_for_you" ON public.food_for_you;
CREATE POLICY "org_admins_can_view_member_food_for_you"
    ON public.food_for_you
    FOR SELECT
    TO authenticated
    USING (public.can_org_admin_view_user(user_id));
