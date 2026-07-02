
-- Move SECURITY DEFINER account deletion functions to private schema
CREATE OR REPLACE FUNCTION private.solicitar_exclusao_conta(_motivo text DEFAULT NULL)
RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _purge timestamptz := now() + interval '30 days';
  _email text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  SELECT email INTO _email FROM auth.users WHERE id = _uid;
  INSERT INTO public.contas_excluidas (user_id, email, motivo, purge_em)
  VALUES (_uid, _email, _motivo, _purge)
  ON CONFLICT (user_id) DO UPDATE
    SET motivo = EXCLUDED.motivo, purge_em = _purge, solicitado_em = now(), purgada_em = NULL;
  UPDATE public.profiles SET excluida_em = now() WHERE id = _uid;
  RETURN _purge;
END; $$;

CREATE OR REPLACE FUNCTION private.cancelar_exclusao_conta()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  DELETE FROM public.contas_excluidas WHERE user_id = _uid;
  UPDATE public.profiles SET excluida_em = NULL WHERE id = _uid;
END; $$;

REVOKE ALL ON FUNCTION private.solicitar_exclusao_conta(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.cancelar_exclusao_conta() FROM PUBLIC, anon, authenticated;

-- Replace public wrappers with SECURITY INVOKER
DROP FUNCTION IF EXISTS public.solicitar_exclusao_conta(text);
DROP FUNCTION IF EXISTS public.cancelar_exclusao_conta();

CREATE FUNCTION public.solicitar_exclusao_conta(_motivo text DEFAULT NULL)
RETURNS timestamptz
LANGUAGE sql SECURITY INVOKER SET search_path = public
AS $$ SELECT private.solicitar_exclusao_conta(_motivo); $$;

CREATE FUNCTION public.cancelar_exclusao_conta()
RETURNS void
LANGUAGE sql SECURITY INVOKER SET search_path = public
AS $$ SELECT private.cancelar_exclusao_conta(); $$;

GRANT EXECUTE ON FUNCTION public.solicitar_exclusao_conta(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancelar_exclusao_conta() TO authenticated;
