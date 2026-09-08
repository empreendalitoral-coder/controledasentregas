CREATE TABLE public.avisos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  mensagem text not null,
  criado_por uuid references auth.users(id),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.avisos TO authenticated;
GRANT ALL ON public.avisos TO service_role;
ALTER TABLE public.avisos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios leem avisos ativos" ON public.avisos FOR SELECT TO authenticated USING (ativo);
CREATE POLICY "Admins criam avisos" ON public.avisos FOR INSERT TO authenticated WITH CHECK (private.is_admin_ativo(auth.uid()));
CREATE POLICY "Admins atualizam avisos" ON public.avisos FOR UPDATE TO authenticated USING (private.is_admin_ativo(auth.uid())) WITH CHECK (private.is_admin_ativo(auth.uid()));
CREATE POLICY "Admins removem avisos" ON public.avisos FOR DELETE TO authenticated USING (private.is_admin_ativo(auth.uid()));

CREATE TABLE public.avisos_lidos (
  aviso_id uuid not null references public.avisos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  lido_em timestamptz not null default now(),
  primary key (aviso_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.avisos_lidos TO authenticated;
GRANT ALL ON public.avisos_lidos TO service_role;
ALTER TABLE public.avisos_lidos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuario gerencia suas leituras" ON public.avisos_lidos FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);