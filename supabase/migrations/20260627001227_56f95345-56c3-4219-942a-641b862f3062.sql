
-- 1) Restrict logs_admin INSERT to admins only
DROP POLICY IF EXISTS "Authenticated can insert their own logs" ON public.logs_admin;
DROP POLICY IF EXISTS "users insert own logs" ON public.logs_admin;
DROP POLICY IF EXISTS "auth insert logs" ON public.logs_admin;

CREATE POLICY "Admins can insert logs"
ON public.logs_admin
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_ativo(auth.uid()));

-- 2) Allow any authenticated user to record only "acesso_nao_autorizado" via a SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.registrar_acesso_nao_autorizado(_detalhes jsonb DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  INSERT INTO public.logs_admin (user_id, acao, detalhes)
  VALUES (auth.uid(), 'acesso_nao_autorizado', _detalhes);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.registrar_acesso_nao_autorizado(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_acesso_nao_autorizado(jsonb) TO authenticated;

-- 3) Ensure no anon EXECUTE remains on internal SECURITY DEFINER helpers
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_premium_ativo(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin_ativo(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.activate_premium_on_approval() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
