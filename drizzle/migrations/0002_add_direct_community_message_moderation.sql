CREATE TABLE public.community_moderation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid,
  author_id uuid NOT NULL,
  author_name text NOT NULL,
  original_content text NOT NULL,
  action text NOT NULL CHECK (action IN ('hide', 'delete')),
  reason text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 3 AND 300),
  moderated_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.community_moderation_logs TO authenticated;
GRANT ALL ON public.community_moderation_logs TO service_role;

ALTER TABLE public.community_moderation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins consultam historico de moderacao"
ON public.community_moderation_logs
FOR SELECT
TO authenticated
USING (private.is_admin_ativo(auth.uid()) OR private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.moderate_community_message(
  _message_id uuid,
  _action text,
  _reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _message public.community_messages%ROWTYPE;
  _moderator uuid := auth.uid();
  _reason_clean text := btrim(COALESCE(_reason, ''));
BEGIN
  IF _moderator IS NULL OR NOT (
    private.is_admin_ativo(_moderator)
    OR private.has_role(_moderator, 'admin'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Acesso restrito aos administradores';
  END IF;

  IF _action NOT IN ('hide', 'delete') THEN
    RAISE EXCEPTION 'Ação de moderação inválida';
  END IF;

  IF char_length(_reason_clean) < 3 OR char_length(_reason_clean) > 300 THEN
    RAISE EXCEPTION 'Informe um motivo entre 3 e 300 caracteres';
  END IF;

  SELECT * INTO _message
  FROM public.community_messages
  WHERE id = _message_id
  FOR UPDATE;

  IF _message.id IS NULL THEN
    RAISE EXCEPTION 'Mensagem não encontrada';
  END IF;

  INSERT INTO public.community_moderation_logs (
    message_id, author_id, author_name, original_content, action, reason, moderated_by
  ) VALUES (
    _message.id, _message.author_id, _message.author_name, _message.content, _action, _reason_clean, _moderator
  );

  UPDATE public.community_messages
  SET reply_author_name = NULL,
      reply_preview = NULL
  WHERE reply_to = _message.id;

  IF _action = 'hide' THEN
    UPDATE public.community_messages
    SET content = 'Conteúdo removido pela moderação.',
        removed_at = now(),
        removed_by = _moderator,
        removal_reason = _reason_clean
    WHERE id = _message.id;
  ELSE
    DELETE FROM public.community_messages WHERE id = _message.id;
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.moderate_community_message(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.moderate_community_message(uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.moderate_community_message(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.moderate_community_message(uuid, text, text) TO service_role;