CREATE TABLE public.feedbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  mensagem text NOT NULL CHECK (char_length(btrim(mensagem)) BETWEEN 3 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.feedbacks TO authenticated;
GRANT ALL ON public.feedbacks TO service_role;
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Motorista envia feedback" ON public.feedbacks FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins leem feedback" ON public.feedbacks FOR SELECT TO authenticated USING (private.is_admin_ativo(auth.uid()));