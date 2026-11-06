CREATE TABLE public.despesas_notas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE DEFAULT auth.uid(),
  data date NOT NULL,
  fornecedor text CHECK (char_length(fornecedor) <= 200),
  cnpj_emitente text CHECK (char_length(cnpj_emitente) <= 30),
  valor numeric(12,2) NOT NULL CHECK (valor >= 0),
  categoria text NOT NULL CHECK (categoria IN ('Combustível','Manutenção','Alimentação','Pedágio','Estacionamento','Telefone e internet','Impostos e MEI','Equipamentos','Outros')),
  descricao text CHECK (char_length(descricao) <= 500),
  tipo_documento text NOT NULL DEFAULT 'recibo' CHECK (tipo_documento IN ('nota_fiscal','recibo','cupom','outro')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.despesas_notas TO authenticated;
GRANT ALL ON public.despesas_notas TO service_role;
ALTER TABLE public.despesas_notas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner despesas notas" ON public.despesas_notas FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX despesas_notas_user_data ON public.despesas_notas(user_id, data DESC);