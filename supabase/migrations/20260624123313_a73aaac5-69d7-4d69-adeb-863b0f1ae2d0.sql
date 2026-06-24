
CREATE OR REPLACE FUNCTION public.activate_premium_on_approval()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  dias INTEGER;
  base_validade TIMESTAMPTZ;
BEGIN
  IF NEW.status = 'aprovado' AND (OLD.status IS NULL OR OLD.status <> 'aprovado') THEN
    dias := CASE NEW.plano WHEN 'anual' THEN 365 WHEN 'mensal' THEN 30 ELSE 15 END;

    SELECT GREATEST(now(), COALESCE(data_validade, now()))
      INTO base_validade
      FROM public.usuarios_premium WHERE user_id = NEW.user_id;
    IF base_validade IS NULL THEN base_validade := now(); END IF;

    INSERT INTO public.usuarios_premium (user_id, plano, ativo, data_inicio, data_validade)
    VALUES (NEW.user_id, NEW.plano, true, now(), base_validade + (dias || ' days')::interval)
    ON CONFLICT (user_id) DO UPDATE
      SET plano = EXCLUDED.plano,
          ativo = true,
          data_validade = base_validade + (dias || ' days')::interval,
          updated_at = now();
  END IF;
  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.activate_premium_on_approval() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_activate_premium
  AFTER UPDATE ON public.solicitacoes_premium
  FOR EACH ROW EXECUTE FUNCTION public.activate_premium_on_approval();
