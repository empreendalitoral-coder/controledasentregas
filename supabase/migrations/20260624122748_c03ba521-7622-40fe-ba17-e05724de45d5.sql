
-- =====================================================
-- ENUMS
-- =====================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.plano_premium AS ENUM ('teste', 'mensal', 'anual');
CREATE TYPE public.status_solicitacao AS ENUM ('pendente', 'aprovado', 'recusado');
CREATE TYPE public.tipo_manutencao AS ENUM ('Troca de óleo', 'Pneus', 'Freios', 'Suspensão', 'Lavagem', 'Mecânica', 'Outros');
CREATE TYPE public.status_recebimento AS ENUM ('pendente', 'recebido');
CREATE TYPE public.tipo_chave_pix AS ENUM ('cpf', 'cnpj', 'telefone', 'email', 'aleatoria');
CREATE TYPE public.tipo_fluxo AS ENUM ('entrada', 'saida');

-- =====================================================
-- HELPER: updated_at trigger
-- =====================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- =====================================================
-- USER ROLES
-- =====================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- PROFILES
-- =====================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  foto TEXT,
  telefone TEXT,
  email TEXT,
  transportadora TEXT,
  veiculo TEXT,
  modelo TEXT,
  placa TEXT,
  meta_mensal NUMERIC NOT NULL DEFAULT 5000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- USUARIOS PREMIUM
-- =====================================================
CREATE TABLE public.usuarios_premium (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plano plano_premium NOT NULL DEFAULT 'teste',
  ativo BOOLEAN NOT NULL DEFAULT true,
  data_inicio TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_validade TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.usuarios_premium TO authenticated;
GRANT ALL ON public.usuarios_premium TO service_role;
ALTER TABLE public.usuarios_premium ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own premium select" ON public.usuarios_premium FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin manage premium" ON public.usuarios_premium FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_premium_updated BEFORE UPDATE ON public.usuarios_premium
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.is_premium_ativo(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.usuarios_premium
    WHERE user_id = _user_id AND ativo = true AND data_validade >= now())
$$;

-- =====================================================
-- HANDLE NEW USER TRIGGER
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, telefone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', ''),
    NEW.email,
    NEW.phone
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.usuarios_premium (user_id, plano, ativo, data_inicio, data_validade)
  VALUES (NEW.id, 'teste', true, now(), now() + interval '15 days')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- LANCAMENTOS
-- =====================================================
CREATE TABLE public.lancamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  trabalhou BOOLEAN NOT NULL DEFAULT true,
  hora_inicio TIME,
  hora_fim TIME,
  cidade TEXT,
  romaneio TEXT,
  gaiola TEXT,
  pacotes INTEGER DEFAULT 0,
  insucessos INTEGER DEFAULT 0,
  pnr INTEGER DEFAULT 0,
  valor_pnr NUMERIC DEFAULT 0,
  pacotes_perdidos INTEGER DEFAULT 0,
  valor_perdidos NUMERIC DEFAULT 0,
  observacao TEXT,
  valor_dia NUMERIC DEFAULT 0,
  km_inicial NUMERIC,
  km_final NUMERIC,
  valor_abastecimento NUMERIC DEFAULT 0,
  litros NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_lancamentos_user_data ON public.lancamentos(user_id, data DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lancamentos TO authenticated;
GRANT ALL ON public.lancamentos TO service_role;
ALTER TABLE public.lancamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own lancamentos" ON public.lancamentos FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_lancamentos_updated BEFORE UPDATE ON public.lancamentos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- RECEBIMENTOS
-- =====================================================
CREATE TABLE public.recebimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_periodo TEXT NOT NULL,
  data_inicial DATE NOT NULL,
  data_final DATE NOT NULL,
  data_pagamento DATE NOT NULL,
  valor_recebido NUMERIC,
  data_recebimento DATE,
  status status_recebimento NOT NULL DEFAULT 'pendente',
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_recebimentos_user ON public.recebimentos(user_id, data_pagamento);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recebimentos TO authenticated;
GRANT ALL ON public.recebimentos TO service_role;
ALTER TABLE public.recebimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own recebimentos" ON public.recebimentos FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_recebimentos_updated BEFORE UPDATE ON public.recebimentos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- ABASTECIMENTOS
-- =====================================================
CREATE TABLE public.abastecimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  posto TEXT,
  km NUMERIC,
  litros NUMERIC NOT NULL,
  valor_total NUMERIC NOT NULL,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_abast_user ON public.abastecimentos(user_id, data DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.abastecimentos TO authenticated;
GRANT ALL ON public.abastecimentos TO service_role;
ALTER TABLE public.abastecimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own abast" ON public.abastecimentos FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- =====================================================
-- MANUTENCOES
-- =====================================================
CREATE TABLE public.manutencoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  tipo tipo_manutencao NOT NULL,
  valor NUMERIC NOT NULL,
  km NUMERIC,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_manut_user ON public.manutencoes(user_id, data DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manutencoes TO authenticated;
GRANT ALL ON public.manutencoes TO service_role;
ALTER TABLE public.manutencoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own manut" ON public.manutencoes FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- =====================================================
-- CONTAS FIXAS
-- =====================================================
CREATE TABLE public.contas_fixas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  dia_vencimento INTEGER NOT NULL CHECK (dia_vencimento BETWEEN 1 AND 31),
  categoria TEXT,
  pago BOOLEAN NOT NULL DEFAULT false,
  mes_referencia TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contas_fixas TO authenticated;
GRANT ALL ON public.contas_fixas TO service_role;
ALTER TABLE public.contas_fixas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own contas" ON public.contas_fixas FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_contas_updated BEFORE UPDATE ON public.contas_fixas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- CARTOES CREDITO + LANCAMENTOS
-- =====================================================
CREATE TABLE public.cartoes_credito (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  limite NUMERIC NOT NULL DEFAULT 0,
  dia_fechamento INTEGER NOT NULL DEFAULT 1,
  dia_vencimento INTEGER NOT NULL DEFAULT 10,
  cor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cartoes_credito TO authenticated;
GRANT ALL ON public.cartoes_credito TO service_role;
ALTER TABLE public.cartoes_credito ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cartoes" ON public.cartoes_credito FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.cartao_lancamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cartao_id UUID NOT NULL REFERENCES public.cartoes_credito(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  valor_total NUMERIC NOT NULL,
  parcelas INTEGER NOT NULL DEFAULT 1,
  data_compra DATE NOT NULL DEFAULT CURRENT_DATE,
  categoria TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cartao_lanc ON public.cartao_lancamentos(user_id, cartao_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cartao_lancamentos TO authenticated;
GRANT ALL ON public.cartao_lancamentos TO service_role;
ALTER TABLE public.cartao_lancamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cartao lanc" ON public.cartao_lancamentos FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- =====================================================
-- FLUXO CAIXA
-- =====================================================
CREATE TABLE public.fluxo_caixa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  tipo tipo_fluxo NOT NULL,
  categoria TEXT NOT NULL,
  descricao TEXT,
  valor NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_fluxo_user ON public.fluxo_caixa(user_id, data DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fluxo_caixa TO authenticated;
GRANT ALL ON public.fluxo_caixa TO service_role;
ALTER TABLE public.fluxo_caixa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own fluxo" ON public.fluxo_caixa FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- =====================================================
-- METAS FINANCEIRAS
-- =====================================================
CREATE TABLE public.metas_financeiras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  valor_meta NUMERIC NOT NULL,
  valor_atual NUMERIC NOT NULL DEFAULT 0,
  prazo DATE,
  icone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.metas_financeiras TO authenticated;
GRANT ALL ON public.metas_financeiras TO service_role;
ALTER TABLE public.metas_financeiras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own metas" ON public.metas_financeiras FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_metas_updated BEFORE UPDATE ON public.metas_financeiras
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- PIX RECEBIDOS / ENVIADOS
-- =====================================================
CREATE TABLE public.pix_recebidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  valor NUMERIC NOT NULL,
  pagador TEXT,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pix_recebidos TO authenticated;
GRANT ALL ON public.pix_recebidos TO service_role;
ALTER TABLE public.pix_recebidos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pix rec" ON public.pix_recebidos FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.pix_enviados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  valor NUMERIC NOT NULL,
  destinatario TEXT,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pix_enviados TO authenticated;
GRANT ALL ON public.pix_enviados TO service_role;
ALTER TABLE public.pix_enviados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pix env" ON public.pix_enviados FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- =====================================================
-- SOLICITACOES PREMIUM
-- =====================================================
CREATE TABLE public.solicitacoes_premium (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  plano plano_premium NOT NULL,
  valor NUMERIC NOT NULL,
  comprovante_path TEXT,
  status status_solicitacao NOT NULL DEFAULT 'pendente',
  observacao_admin TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_solic_status ON public.solicitacoes_premium(status, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.solicitacoes_premium TO authenticated;
GRANT ALL ON public.solicitacoes_premium TO service_role;
ALTER TABLE public.solicitacoes_premium ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own solic select" ON public.solicitacoes_premium FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "own solic insert" ON public.solicitacoes_premium FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "admin solic update" ON public.solicitacoes_premium FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_solic_updated BEFORE UPDATE ON public.solicitacoes_premium
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- CONFIGURACOES (singleton)
-- =====================================================
CREATE TABLE public.configuracoes (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  nome_recebedor TEXT NOT NULL DEFAULT '',
  chave_pix TEXT NOT NULL DEFAULT '',
  tipo_chave_pix tipo_chave_pix NOT NULL DEFAULT 'aleatoria',
  valor_mensal NUMERIC NOT NULL DEFAULT 9.90,
  valor_anual NUMERIC NOT NULL DEFAULT 69.90,
  dias_teste_gratis INTEGER NOT NULL DEFAULT 15,
  mensagem_pagamento TEXT NOT NULL DEFAULT 'Após o pagamento, envie o comprovante para liberar seu acesso Premium.',
  whatsapp_suporte TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.configuracoes TO anon, authenticated;
GRANT ALL ON public.configuracoes TO service_role;
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all read config" ON public.configuracoes FOR SELECT
  TO anon, authenticated USING (true);
CREATE POLICY "admin update config" ON public.configuracoes FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin insert config" ON public.configuracoes FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_config_updated BEFORE UPDATE ON public.configuracoes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.configuracoes (id) VALUES (1) ON CONFLICT DO NOTHING;
