
-- Private schema
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
CREATE OR REPLACE FUNCTION private.is_admin_ativo(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.administradores WHERE user_id = _user_id AND ativo = true)
$$;
CREATE OR REPLACE FUNCTION private.is_premium_ativo(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.usuarios_premium
    WHERE user_id = _user_id AND ativo = true AND data_validade >= now())
$$;
CREATE OR REPLACE FUNCTION private.registrar_acesso_nao_autorizado(_detalhes jsonb DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  INSERT INTO public.logs_admin (user_id, acao, detalhes)
  VALUES (auth.uid(), 'acesso_nao_autorizado', _detalhes);
END;
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_admin_ativo(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_premium_ativo(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.registrar_acesso_nao_autorizado(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_admin_ativo(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_premium_ativo(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.registrar_acesso_nao_autorizado(jsonb) TO authenticated, service_role;

-- administradores
DROP POLICY IF EXISTS "Admins ativos podem atualizar administradores" ON public.administradores;
DROP POLICY IF EXISTS "Admins ativos podem inserir administradores" ON public.administradores;
DROP POLICY IF EXISTS "Admins ativos podem remover administradores" ON public.administradores;
DROP POLICY IF EXISTS "Admins ativos podem ver administradores" ON public.administradores;
CREATE POLICY "Admins ativos podem ver administradores" ON public.administradores FOR SELECT TO authenticated USING (private.is_admin_ativo(auth.uid()));
CREATE POLICY "Admins ativos podem inserir administradores" ON public.administradores FOR INSERT TO authenticated WITH CHECK (private.is_admin_ativo(auth.uid()));
CREATE POLICY "Admins ativos podem atualizar administradores" ON public.administradores FOR UPDATE TO authenticated USING (private.is_admin_ativo(auth.uid())) WITH CHECK (private.is_admin_ativo(auth.uid()));
CREATE POLICY "Admins ativos podem remover administradores" ON public.administradores FOR DELETE TO authenticated USING (private.is_admin_ativo(auth.uid()));

-- logs_admin
DROP POLICY IF EXISTS "Qualquer usuário autenticado pode registrar log" ON public.logs_admin;
DROP POLICY IF EXISTS "Admins can insert logs" ON public.logs_admin;
DROP POLICY IF EXISTS "Admins ativos leem logs" ON public.logs_admin;
CREATE POLICY "Admins ativos leem logs" ON public.logs_admin FOR SELECT TO authenticated USING (private.is_admin_ativo(auth.uid()));
CREATE POLICY "Admins can insert logs" ON public.logs_admin FOR INSERT TO authenticated WITH CHECK (private.is_admin_ativo(auth.uid()));

-- profiles
DROP POLICY IF EXISTS "own profile select" ON public.profiles;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role));

-- solicitacoes_premium
DROP POLICY IF EXISTS "admin solic update" ON public.solicitacoes_premium;
DROP POLICY IF EXISTS "own solic select" ON public.solicitacoes_premium;
CREATE POLICY "admin solic update" ON public.solicitacoes_premium FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "own solic select" ON public.solicitacoes_premium FOR SELECT TO authenticated USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role));

-- user_roles
DROP POLICY IF EXISTS "admins manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "users read own roles" ON public.user_roles;
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role));

-- usuarios_premium
DROP POLICY IF EXISTS "admin manage premium" ON public.usuarios_premium;
DROP POLICY IF EXISTS "own premium select" ON public.usuarios_premium;
CREATE POLICY "admin manage premium" ON public.usuarios_premium FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "own premium select" ON public.usuarios_premium FOR SELECT TO authenticated USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role));

-- configuracoes
DROP POLICY IF EXISTS "Authenticated users can read config" ON public.configuracoes;
DROP POLICY IF EXISTS "admin insert config" ON public.configuracoes;
DROP POLICY IF EXISTS "admin update config" ON public.configuracoes;
CREATE POLICY "admin select config" ON public.configuracoes FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "admin insert config" ON public.configuracoes FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "admin update config" ON public.configuracoes FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

-- storage.objects: replace policy that referenced public.has_role
DROP POLICY IF EXISTS "users read own comprovantes" ON storage.objects;
CREATE POLICY "users read own comprovantes" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'comprovantes' AND ((storage.foldername(name))[1] = (auth.uid())::text OR private.has_role(auth.uid(), 'admin'::public.app_role)));

-- Drop public versions
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.is_admin_ativo(uuid);
DROP FUNCTION IF EXISTS public.is_premium_ativo(uuid);
DROP FUNCTION IF EXISTS public.registrar_acesso_nao_autorizado(jsonb);

-- Public INVOKER wrapper for client RPC
CREATE OR REPLACE FUNCTION public.registrar_acesso_nao_autorizado(_detalhes jsonb DEFAULT NULL)
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$
  SELECT private.registrar_acesso_nao_autorizado(_detalhes);
$$;
REVOKE ALL ON FUNCTION public.registrar_acesso_nao_autorizado(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_acesso_nao_autorizado(jsonb) TO authenticated;

-- Payment info RPC: non-admins read only payment-related columns via SECURITY DEFINER private fn + INVOKER wrapper
CREATE OR REPLACE FUNCTION private.get_payment_info()
RETURNS TABLE (nome_recebedor text, chave_pix text, tipo_chave_pix text, valor_mensal numeric, valor_anual numeric, dias_teste_gratis integer, mensagem_pagamento text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.nome_recebedor, c.chave_pix, c.tipo_chave_pix::text, c.valor_mensal, c.valor_anual, c.dias_teste_gratis, c.mensagem_pagamento
  FROM public.configuracoes c WHERE c.id = 1;
$$;
REVOKE ALL ON FUNCTION private.get_payment_info() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.get_payment_info() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_payment_info()
RETURNS TABLE (nome_recebedor text, chave_pix text, tipo_chave_pix text, valor_mensal numeric, valor_anual numeric, dias_teste_gratis integer, mensagem_pagamento text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT * FROM private.get_payment_info();
$$;
REVOKE ALL ON FUNCTION public.get_payment_info() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_payment_info() TO authenticated;

-- Trigger-only DEFINER functions: revoke EXECUTE from regular roles
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.activate_premium_on_approval() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
