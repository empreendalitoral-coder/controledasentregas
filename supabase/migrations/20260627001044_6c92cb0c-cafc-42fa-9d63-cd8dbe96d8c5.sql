
-- 1) Restrict configuracoes SELECT to authenticated users only
DROP POLICY IF EXISTS "all read config" ON public.configuracoes;
DROP POLICY IF EXISTS "anon read config" ON public.configuracoes;
CREATE POLICY "Authenticated users can read config"
ON public.configuracoes
FOR SELECT
TO authenticated
USING (true);

-- 2) Add UPDATE policy on comprovantes bucket (owner-scoped by first folder = uid)
DROP POLICY IF EXISTS "Users can update their own comprovantes" ON storage.objects;
CREATE POLICY "Users can update their own comprovantes"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'comprovantes' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'comprovantes' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 3) Revoke EXECUTE on SECURITY DEFINER helper functions from public/anon/authenticated.
-- They are invoked from RLS policies and triggers, which run with definer privileges
-- regardless of caller EXECUTE grants. Trigger-only functions also don't need EXECUTE.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_premium_ativo(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin_ativo(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.activate_premium_on_approval() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
