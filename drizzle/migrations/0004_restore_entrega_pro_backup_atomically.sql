CREATE OR REPLACE FUNCTION public.restore_entrega_pro_backup(_backup jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _motorista jsonb := COALESCE(_backup->'motorista', '{}'::jsonb);
  _lancamentos jsonb := COALESCE(_backup->'lancamentos', '[]'::jsonb);
  _recebimentos jsonb := COALESCE(_backup->'recebimentos', '[]'::jsonb);
  _abastecimentos jsonb := COALESCE(_backup->'abastecimentos', '[]'::jsonb);
  _manutencoes jsonb := COALESCE(_backup->'manutencoes', '[]'::jsonb);
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  IF jsonb_typeof(_backup) <> 'object'
    OR jsonb_typeof(_motorista) <> 'object'
    OR jsonb_typeof(_lancamentos) <> 'array'
    OR jsonb_typeof(_recebimentos) <> 'array'
    OR jsonb_typeof(_abastecimentos) <> 'array'
    OR jsonb_typeof(_manutencoes) <> 'array' THEN
    RAISE EXCEPTION 'Estrutura de backup inválida';
  END IF;

  IF jsonb_array_length(_lancamentos) > 20000
    OR jsonb_array_length(_recebimentos) > 5000
    OR jsonb_array_length(_abastecimentos) > 10000
    OR jsonb_array_length(_manutencoes) > 10000 THEN
    RAISE EXCEPTION 'Backup excede o limite de registros';
  END IF;

  IF _backup ? 'motorista' THEN
    UPDATE public.profiles
    SET nome = LEFT(COALESCE(NULLIF(_motorista->>'nome', ''), nome), 80),
        foto = NULLIF(_motorista->>'foto', ''),
        telefone = NULLIF(_motorista->>'telefone', ''),
        transportadora = NULLIF(_motorista->>'transportadora', ''),
        veiculo = NULLIF(_motorista->>'veiculo', ''),
        modelo = NULLIF(_motorista->>'modelo', ''),
        placa = NULLIF(_motorista->>'placa', ''),
        meta_mensal = CASE WHEN _backup ? 'meta_mensal' THEN (_backup->>'meta_mensal')::numeric ELSE meta_mensal END
    WHERE id = _uid;
  END IF;

  INSERT INTO public.lancamentos (
    user_id, data, trabalhou, hora_inicio, hora_fim, cidade, romaneio, gaiola,
    pacotes, insucessos, pnr, valor_pnr, pacotes_perdidos, valor_perdidos,
    observacao, valor_dia, km_inicial, km_final, valor_abastecimento, litros
  )
  SELECT _uid, x.data, COALESCE(x.trabalhou, true), x.hora_inicio, x.hora_fim,
    LEFT(x.cidade, 60), LEFT(x.romaneio, 30), LEFT(x.gaiola, 20), x.pacotes,
    x.insucessos, x.pnr, x.valor_pnr, x.pacotes_perdidos, x.valor_perdidos,
    LEFT(x.observacao, 500), x.valor_dia, x.km_inicial, x.km_final,
    x.valor_abastecimento, x.litros
  FROM jsonb_to_recordset(_lancamentos) AS x(
    data date, trabalhou boolean, hora_inicio time, hora_fim time, cidade text,
    romaneio text, gaiola text, pacotes integer, insucessos integer, pnr integer,
    valor_pnr numeric, pacotes_perdidos integer, valor_perdidos numeric,
    observacao text, valor_dia numeric, km_inicial numeric, km_final numeric,
    valor_abastecimento numeric, litros numeric
  );

  INSERT INTO public.recebimentos (
    user_id, nome_periodo, data_inicial, data_final, data_pagamento,
    valor_recebido, data_recebimento, status, observacao
  )
  SELECT _uid, LEFT(x.nome_periodo, 120), x.data_inicial, x.data_final,
    x.data_pagamento, x.valor_recebido, x.data_recebimento,
    COALESCE(x.status, 'pendente'::public.status_recebimento), LEFT(x.observacao, 500)
  FROM jsonb_to_recordset(_recebimentos) AS x(
    nome_periodo text, data_inicial date, data_final date, data_pagamento date,
    valor_recebido numeric, data_recebimento date,
    status public.status_recebimento, observacao text
  );

  INSERT INTO public.abastecimentos (user_id, data, posto, km, litros, valor_total, observacao)
  SELECT _uid, x.data, LEFT(x.posto, 120), x.km, x.litros, x.valor_total, LEFT(x.observacao, 500)
  FROM jsonb_to_recordset(_abastecimentos) AS x(
    data date, posto text, km numeric, litros numeric, valor_total numeric, observacao text
  );

  INSERT INTO public.manutencoes (user_id, data, tipo, valor, km, observacao)
  SELECT _uid, x.data, x.tipo, x.valor, x.km, LEFT(x.observacao, 500)
  FROM jsonb_to_recordset(_manutencoes) AS x(
    data date, tipo public.tipo_manutencao, valor numeric, km numeric, observacao text
  );

  RETURN jsonb_build_object(
    'lancamentos', jsonb_array_length(_lancamentos),
    'recebimentos', jsonb_array_length(_recebimentos),
    'abastecimentos', jsonb_array_length(_abastecimentos),
    'manutencoes', jsonb_array_length(_manutencoes),
    'total', jsonb_array_length(_lancamentos) + jsonb_array_length(_recebimentos)
      + jsonb_array_length(_abastecimentos) + jsonb_array_length(_manutencoes)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.restore_entrega_pro_backup(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.restore_entrega_pro_backup(jsonb) TO authenticated;