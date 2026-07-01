
-- 1. Coluna em profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS excluida_em TIMESTAMPTZ;

-- 2. Tabela contas_excluidas
CREATE TABLE IF NOT EXISTS public.contas_excluidas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  motivo TEXT,
  solicitado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  purge_em TIMESTAMPTZ NOT NULL,
  purgada_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contas_excluidas TO authenticated;
GRANT ALL ON public.contas_excluidas TO service_role;

ALTER TABLE public.contas_excluidas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuário vê própria solicitação"
  ON public.contas_excluidas FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR private.is_admin_ativo(auth.uid()));

CREATE POLICY "usuário insere própria solicitação"
  ON public.contas_excluidas FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "usuário cancela própria solicitação"
  ON public.contas_excluidas FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 3. RPC: solicitar exclusão
CREATE OR REPLACE FUNCTION public.solicitar_exclusao_conta(_motivo TEXT DEFAULT NULL)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _purge TIMESTAMPTZ := now() + interval '30 days';
  _email TEXT;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT email INTO _email FROM auth.users WHERE id = _uid;

  INSERT INTO public.contas_excluidas (user_id, email, motivo, purge_em)
  VALUES (_uid, _email, _motivo, _purge)
  ON CONFLICT (user_id) DO UPDATE
    SET motivo = EXCLUDED.motivo,
        purge_em = _purge,
        solicitado_em = now(),
        purgada_em = NULL;

  UPDATE public.profiles SET excluida_em = now() WHERE id = _uid;

  RETURN _purge;
END; $$;

REVOKE EXECUTE ON FUNCTION public.solicitar_exclusao_conta(TEXT) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.solicitar_exclusao_conta(TEXT) TO authenticated;

-- 4. RPC: cancelar exclusão
CREATE OR REPLACE FUNCTION public.cancelar_exclusao_conta()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  DELETE FROM public.contas_excluidas WHERE user_id = _uid;
  UPDATE public.profiles SET excluida_em = NULL WHERE id = _uid;
END; $$;

REVOKE EXECUTE ON FUNCTION public.cancelar_exclusao_conta() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.cancelar_exclusao_conta() TO authenticated;

-- 5. Purge (SECURITY DEFINER, sem acesso via API)
CREATE OR REPLACE FUNCTION private.purge_contas_expiradas()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  n INTEGER := 0;
BEGIN
  FOR r IN
    SELECT user_id FROM public.contas_excluidas
    WHERE purge_em <= now() AND purgada_em IS NULL
    LIMIT 100
  LOOP
    -- Apaga dados vinculados (todas as tabelas com user_id)
    DELETE FROM public.lancamentos WHERE user_id = r.user_id;
    DELETE FROM public.recebimentos WHERE user_id = r.user_id;
    DELETE FROM public.abastecimentos WHERE user_id = r.user_id;
    DELETE FROM public.manutencoes WHERE user_id = r.user_id;
    DELETE FROM public.contas_fixas WHERE user_id = r.user_id;
    DELETE FROM public.cartoes_credito WHERE user_id = r.user_id;
    DELETE FROM public.cartao_lancamentos WHERE user_id = r.user_id;
    DELETE FROM public.fluxo_caixa WHERE user_id = r.user_id;
    DELETE FROM public.metas_financeiras WHERE user_id = r.user_id;
    DELETE FROM public.pix_recebidos WHERE user_id = r.user_id;
    DELETE FROM public.pix_enviados WHERE user_id = r.user_id;
    DELETE FROM public.solicitacoes_premium WHERE user_id = r.user_id;
    DELETE FROM public.usuarios_premium WHERE user_id = r.user_id;
    DELETE FROM public.user_roles WHERE user_id = r.user_id;
    DELETE FROM public.profiles WHERE id = r.user_id;

    -- Marca como purgada antes de apagar o auth (que apaga em cascata)
    UPDATE public.contas_excluidas SET purgada_em = now() WHERE user_id = r.user_id;

    -- Remove o login
    DELETE FROM auth.users WHERE id = r.user_id;
    n := n + 1;
  END LOOP;
  RETURN n;
END; $$;

REVOKE EXECUTE ON FUNCTION private.purge_contas_expiradas() FROM public, anon, authenticated;
