
-- 1. Tabela administradores
CREATE TABLE public.administradores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  telefone text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.administradores TO authenticated;
GRANT ALL ON public.administradores TO service_role;
ALTER TABLE public.administradores ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin_ativo(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.administradores WHERE user_id = _user_id AND ativo = true)
$$;

CREATE POLICY "Admins ativos podem ver administradores"
  ON public.administradores FOR SELECT TO authenticated
  USING (public.is_admin_ativo(auth.uid()));
CREATE POLICY "Admins ativos podem inserir administradores"
  ON public.administradores FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_ativo(auth.uid()));
CREATE POLICY "Admins ativos podem atualizar administradores"
  ON public.administradores FOR UPDATE TO authenticated
  USING (public.is_admin_ativo(auth.uid()))
  WITH CHECK (public.is_admin_ativo(auth.uid()));
CREATE POLICY "Admins ativos podem remover administradores"
  ON public.administradores FOR DELETE TO authenticated
  USING (public.is_admin_ativo(auth.uid()));

CREATE TRIGGER trg_administradores_updated_at
  BEFORE UPDATE ON public.administradores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Tabela logs_admin
CREATE TABLE public.logs_admin (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  acao text NOT NULL,
  detalhes jsonb,
  data_hora timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.logs_admin TO authenticated;
GRANT ALL ON public.logs_admin TO service_role;
ALTER TABLE public.logs_admin ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode inserir log (necessário para registrar tentativas não autorizadas)
CREATE POLICY "Qualquer usuário autenticado pode registrar log"
  ON public.logs_admin FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
-- Somente admins ativos podem ler os logs
CREATE POLICY "Admins ativos leem logs"
  ON public.logs_admin FOR SELECT TO authenticated
  USING (public.is_admin_ativo(auth.uid()));

-- 3. Seed: marcelo100surf@gmail.com como administrador
INSERT INTO public.administradores (user_id, nome, telefone, ativo)
SELECT u.id,
       COALESCE(p.nome, 'Marcelo'),
       COALESCE(p.telefone, u.phone),
       true
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'marcelo100surf@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET ativo = true;
