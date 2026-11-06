CREATE TABLE public.site_visits (
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date,
  visitor_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (day, visitor_id)
);
GRANT ALL ON public.site_visits TO service_role;
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.record_site_visit(_visitor uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.site_visits(visitor_id) VALUES (_visitor) ON CONFLICT DO NOTHING;
$$;
REVOKE ALL ON FUNCTION public.record_site_visit(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_site_visit(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_growth_metrics(_days int DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE d int := LEAST(GREATEST(COALESCE(_days,30),7),365); since date; r jsonb;
BEGIN
  IF NOT (private.is_admin_ativo(auth.uid()) OR private.has_role(auth.uid(),'admin'::public.app_role)) THEN
    RAISE EXCEPTION 'Acesso não autorizado';
  END IF;
  since := (now() AT TIME ZONE 'America/Sao_Paulo')::date - (d - 1);
  SELECT jsonb_build_object(
    'visitas', (SELECT count(*) FROM site_visits WHERE day >= since),
    'visitantes', (SELECT count(DISTINCT visitor_id) FROM site_visits WHERE day >= since),
    'cadastros', (SELECT count(*) FROM profiles WHERE created_at::date >= since),
    'total_contas', (SELECT count(*) FROM profiles WHERE excluida_em IS NULL),
    'ativas_7d', (SELECT count(DISTINCT user_id) FROM lancamentos WHERE updated_at >= now() - interval '7 days'),
    'ativas_periodo', (SELECT count(DISTINCT user_id) FROM lancamentos WHERE updated_at::date >= since),
    'assinantes', (SELECT count(*) FROM usuarios_premium WHERE ativo AND plano IN ('mensal','anual') AND data_validade >= now()),
    'em_teste', (SELECT count(*) FROM usuarios_premium WHERE ativo AND plano = 'teste' AND data_validade >= now()),
    'novas_assinaturas', (SELECT count(*) FROM solicitacoes_premium WHERE status = 'aprovado' AND updated_at::date >= since),
    'dias', (SELECT jsonb_agg(jsonb_build_object(
        'dia', g::date,
        'visitas', (SELECT count(*) FROM site_visits v WHERE v.day = g::date),
        'cadastros', (SELECT count(*) FROM profiles p WHERE p.created_at::date = g::date),
        'ativas', (SELECT count(DISTINCT user_id) FROM lancamentos l WHERE l.updated_at::date = g::date),
        'assinaturas', (SELECT count(*) FROM solicitacoes_premium s WHERE s.status = 'aprovado' AND s.updated_at::date = g::date)
      ) ORDER BY g) FROM generate_series(since, since + (d - 1), interval '1 day') g)
  ) INTO r;
  RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.get_growth_metrics(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_growth_metrics(int) TO authenticated;