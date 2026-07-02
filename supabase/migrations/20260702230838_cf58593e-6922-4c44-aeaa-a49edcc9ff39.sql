
-- notification_tipos
CREATE TABLE public.notification_tipos (
  codigo TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN ('operacional','financeiro','premium','admin','resumo')),
  padrao_ativo BOOLEAN NOT NULL DEFAULT true,
  apenas_admin BOOLEAN NOT NULL DEFAULT false,
  disponivel BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.notification_tipos TO authenticated;
GRANT ALL ON public.notification_tipos TO service_role;
ALTER TABLE public.notification_tipos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tipos legiveis por autenticados" ON public.notification_tipos FOR SELECT TO authenticated USING (true);

INSERT INTO public.notification_tipos (codigo, titulo, descricao, categoria, padrao_ativo, apenas_admin, disponivel) VALUES
  ('recebimento_proximo','Recebimento próximo','Aviso 1 dia antes da data prevista de um recebimento','financeiro',true,false,true),
  ('meta_atingida','Meta atingida','Quando você atinge 100% de uma meta financeira','financeiro',true,false,true),
  ('premium_vencendo','Premium vencendo','Aviso 7 dias antes do vencimento do seu plano Premium','premium',true,false,true),
  ('pix_aprovado','PIX aprovado','Quando o administrador aprova sua solicitação Premium','premium',true,false,true),
  ('nova_solicitacao_premium','Nova solicitação Premium','Nova solicitação de assinatura recebida','admin',true,true,true),
  ('lembrete_entregas_dia','Lembrete de entregas do dia','Lembrete diário para registrar as entregas','operacional',false,false,true),
  ('lembrete_abastecimento','Lembrete de abastecimento','Lembrete para registrar abastecimentos','operacional',false,false,true),
  ('pagamento_atrasado','Pagamento atrasado','Aviso quando uma conta fixa fica em atraso','financeiro',false,false,true),
  ('resumo_diario','Resumo diário','Resumo dos ganhos e gastos do dia','resumo',false,false,true),
  ('resumo_semanal','Resumo semanal','Resumo consolidado da semana','resumo',false,false,true),
  ('meta_mensal','Meta mensal atingida','Quando você atinge sua meta mensal','financeiro',false,false,true),
  ('app_update','Atualizações do app','Novidades e melhorias importantes','operacional',false,false,true);

-- notification_tokens
CREATE TABLE public.notification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  plataforma TEXT NOT NULL CHECK (plataforma IN ('android','ios','web')),
  ultimo_uso TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.notification_tokens(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_tokens TO authenticated;
GRANT ALL ON public.notification_tokens TO service_role;
ALTER TABLE public.notification_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuario gerencia proprios tokens" ON public.notification_tokens FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- notification_preferencias
CREATE TABLE public.notification_preferencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo_codigo TEXT NOT NULL REFERENCES public.notification_tipos(codigo) ON DELETE CASCADE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, tipo_codigo)
);
CREATE INDEX ON public.notification_preferencias(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferencias TO authenticated;
GRANT ALL ON public.notification_preferencias TO service_role;
ALTER TABLE public.notification_preferencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuario gerencia proprias preferencias" ON public.notification_preferencias FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_notif_pref_updated BEFORE UPDATE ON public.notification_preferencias FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- notification_envios
CREATE TABLE public.notification_envios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo_codigo TEXT NOT NULL,
  chave_dedup TEXT NOT NULL,
  titulo TEXT,
  corpo TEXT,
  enviado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  sucesso BOOLEAN NOT NULL DEFAULT false,
  erro TEXT,
  UNIQUE (user_id, chave_dedup)
);
CREATE INDEX ON public.notification_envios(user_id, enviado_em DESC);
GRANT SELECT ON public.notification_envios TO authenticated;
GRANT ALL ON public.notification_envios TO service_role;
ALTER TABLE public.notification_envios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuario le proprios envios" ON public.notification_envios FOR SELECT TO authenticated USING (auth.uid() = user_id);
