CREATE TABLE public.fiscal_classifications (
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 movement_id text NOT NULL CHECK (length(movement_id) BETWEEN 1 AND 120),
 classification text NOT NULL CHECK (classification IN ('cnpj','cpf','transferencia','duplicado')),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (user_id, movement_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fiscal_classifications TO authenticated;
GRANT ALL ON public.fiscal_classifications TO service_role;
ALTER TABLE public.fiscal_classifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner fiscal classifications" ON public.fiscal_classifications FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
COMMENT ON TABLE public.fiscal_classifications IS 'Fiscal annotations only; never changes operational profit calculations. Unannotated movements remain unclassified.';