ALTER TABLE public.community_members
  ADD COLUMN anonymous_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.community_messages
  ADD COLUMN is_anonymous boolean NOT NULL DEFAULT false;

CREATE TABLE public.community_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_events_type_check CHECK (event_type IN ('insert', 'update', 'delete'))
);
GRANT SELECT ON public.community_events TO authenticated;
GRANT ALL ON public.community_events TO service_role;
ALTER TABLE public.community_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participantes recebem eventos da comunidade"
ON public.community_events
FOR SELECT
TO authenticated
USING (private.community_has_access(auth.uid()));

CREATE OR REPLACE FUNCTION public.notify_community_message_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.community_events (event_type)
  VALUES (lower(TG_OP));
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_notify_community_message_change
AFTER INSERT OR UPDATE OR DELETE ON public.community_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_community_message_change();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'community_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_events;
  END IF;
END;
$$;

DROP POLICY IF EXISTS "Confirmados leem mensagens permitidas" ON public.community_messages;
CREATE POLICY "Administradores leem mensagens completas"
ON public.community_messages
FOR SELECT
TO authenticated
USING (
  private.is_admin_ativo(auth.uid())
  OR private.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE OR REPLACE FUNCTION public.get_community_messages()
RETURNS TABLE (
  id uuid,
  author_name text,
  author_photo text,
  content text,
  reply_to uuid,
  reply_author_name text,
  reply_preview text,
  removed_at timestamptz,
  created_at timestamptz,
  is_own boolean,
  is_anonymous boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT private.community_has_access(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso à Comunidade não autorizado';
  END IF;

  RETURN QUERY
  SELECT
    m.id,
    m.author_name,
    m.author_photo,
    m.content,
    m.reply_to,
    m.reply_author_name,
    m.reply_preview,
    m.removed_at,
    m.created_at,
    m.author_id = auth.uid(),
    m.is_anonymous
  FROM public.community_messages m
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.community_blocks b
    WHERE b.blocker_id = auth.uid()
      AND b.blocked_id = m.author_id
  )
  ORDER BY m.created_at ASC
  LIMIT 200;
END;
$$;
REVOKE ALL ON FUNCTION public.get_community_messages() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_community_messages() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_community_messages() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.set_community_anonymous(_enabled boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _premium_valid boolean;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.usuarios_premium up
    WHERE up.user_id = _user_id
      AND up.ativo = true
      AND up.data_validade >= now()
  ) INTO _premium_valid;

  IF _enabled AND NOT _premium_valid THEN
    RAISE EXCEPTION 'O modo anônimo é exclusivo do Premium';
  END IF;

  UPDATE public.community_members
  SET anonymous_enabled = _enabled,
      updated_at = now()
  WHERE user_id = _user_id
    AND rules_accepted_at IS NOT NULL;

  IF NOT FOUND THEN RAISE EXCEPTION 'Aceite as regras da Comunidade antes de alterar esta opção'; END IF;
  RETURN _enabled;
END;
$$;
REVOKE ALL ON FUNCTION public.set_community_anonymous(boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_community_anonymous(boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_community_anonymous(boolean) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.block_community_message(_message_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _author_id uuid;
BEGIN
  IF _user_id IS NULL OR NOT private.community_has_access(_user_id) THEN
    RAISE EXCEPTION 'Acesso à Comunidade não autorizado';
  END IF;

  SELECT author_id INTO _author_id
  FROM public.community_messages
  WHERE id = _message_id;

  IF _author_id IS NULL THEN RAISE EXCEPTION 'Mensagem não encontrada'; END IF;
  IF _author_id = _user_id THEN RAISE EXCEPTION 'Você não pode bloquear a si mesmo'; END IF;

  INSERT INTO public.community_blocks (blocker_id, blocked_id)
  VALUES (_user_id, _author_id)
  ON CONFLICT DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION public.block_community_message(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.block_community_message(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.block_community_message(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.prepare_community_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _profile public.profiles%ROWTYPE;
  _member public.community_members%ROWTYPE;
  _reply public.community_messages%ROWTYPE;
  _normalized text;
  _premium_valid boolean;
BEGIN
  IF auth.uid() IS NULL OR NEW.author_id <> auth.uid() THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF NOT private.community_email_confirmed(auth.uid()) THEN RAISE EXCEPTION 'Confirme seu e-mail antes de participar da Comunidade'; END IF;
  IF NOT private.community_has_access(auth.uid()) THEN RAISE EXCEPTION 'A Comunidade agora faz parte do Premium'; END IF;

  SELECT * INTO _member FROM public.community_members WHERE user_id = auth.uid();
  IF _member.rules_accepted_at IS NULL THEN RAISE EXCEPTION 'Aceite as regras da Comunidade antes de participar'; END IF;
  IF _member.suspended_until IS NOT NULL AND _member.suspended_until > now() THEN RAISE EXCEPTION 'Sua participação na Comunidade está suspensa temporariamente'; END IF;

  NEW.content := btrim(regexp_replace(NEW.content, '[[:space:]]+', ' ', 'g'));
  IF char_length(NEW.content) < 1 OR char_length(NEW.content) > 500 THEN RAISE EXCEPTION 'A mensagem deve ter entre 1 e 500 caracteres'; END IF;
  _normalized := lower(translate(NEW.content, 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'));
  IF _normalized ~ '(https?\s*:\s*/\s*/|www\s*\.|[a-z0-9][a-z0-9-]{1,62}\s*(\.|\[\.\]| ponto )\s*(com|net|org|io|app|dev|gg|me|link|ly|br)(\y|/)|wa\s*\.\s*me|t\s*\.\s*me|chat\s*\.\s*whatsapp)' THEN
    RAISE EXCEPTION 'Links não são permitidos na Comunidade';
  END IF;
  IF EXISTS (SELECT 1 FROM public.community_messages WHERE author_id = auth.uid() AND created_at > now() - interval '8 seconds') THEN
    RAISE EXCEPTION 'Aguarde alguns segundos antes de enviar outra mensagem';
  END IF;
  IF (SELECT count(*) FROM public.community_messages WHERE author_id = auth.uid() AND created_at > now() - interval '1 hour') >= 30 THEN
    RAISE EXCEPTION 'Você atingiu o limite de mensagens desta hora';
  END IF;

  SELECT * INTO _profile FROM public.profiles WHERE id = auth.uid() AND excluida_em IS NULL;
  IF _profile.id IS NULL THEN RAISE EXCEPTION 'Complete seu perfil antes de participar'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.usuarios_premium up
    WHERE up.user_id = auth.uid()
      AND up.ativo = true
      AND up.data_validade >= now()
  ) INTO _premium_valid;

  NEW.is_anonymous := _member.anonymous_enabled AND _premium_valid;
  IF NEW.is_anonymous THEN
    NEW.author_name := 'Anônimo';
    NEW.author_photo := NULL;
  ELSE
    NEW.author_name := left(COALESCE(NULLIF(btrim(_profile.nome), ''), 'Motorista'), 60);
    NEW.author_photo := _profile.foto;
  END IF;
  NEW.removed_at := NULL;
  NEW.removed_by := NULL;
  NEW.removal_reason := NULL;

  IF NEW.reply_to IS NOT NULL THEN
    SELECT * INTO _reply FROM public.community_messages WHERE id = NEW.reply_to AND removed_at IS NULL;
    IF _reply.id IS NULL THEN RAISE EXCEPTION 'A mensagem respondida não está mais disponível'; END IF;
    NEW.reply_author_name := CASE WHEN _reply.is_anonymous THEN 'Anônimo' ELSE _reply.author_name END;
    NEW.reply_preview := left(_reply.content, 100);
  ELSE
    NEW.reply_author_name := NULL;
    NEW.reply_preview := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.moderate_community_message(_message_id uuid, _action text, _reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _message public.community_messages%ROWTYPE;
  _moderator uuid := auth.uid();
  _reason_clean text := btrim(COALESCE(_reason, ''));
  _real_author_name text;
BEGIN
  IF _moderator IS NULL OR NOT (
    private.is_admin_ativo(_moderator)
    OR private.has_role(_moderator, 'admin'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Acesso restrito aos administradores';
  END IF;

  IF _action NOT IN ('hide', 'delete') THEN RAISE EXCEPTION 'Ação de moderação inválida'; END IF;
  IF char_length(_reason_clean) < 3 OR char_length(_reason_clean) > 300 THEN
    RAISE EXCEPTION 'Informe um motivo entre 3 e 300 caracteres';
  END IF;

  SELECT * INTO _message FROM public.community_messages WHERE id = _message_id FOR UPDATE;
  IF _message.id IS NULL THEN RAISE EXCEPTION 'Mensagem não encontrada'; END IF;

  SELECT COALESCE(NULLIF(btrim(p.nome), ''), _message.author_name)
  INTO _real_author_name
  FROM public.profiles p
  WHERE p.id = _message.author_id;

  INSERT INTO public.community_moderation_logs (
    message_id, author_id, author_name, original_content, action, reason, moderated_by
  ) VALUES (
    _message.id, _message.author_id, COALESCE(_real_author_name, _message.author_name),
    _message.content, _action, _reason_clean, _moderator
  );

  UPDATE public.community_messages
  SET reply_author_name = NULL, reply_preview = NULL
  WHERE reply_to = _message.id;

  IF _action = 'hide' THEN
    UPDATE public.community_messages
    SET content = 'Conteúdo removido pela moderação.', removed_at = now(),
        removed_by = _moderator, removal_reason = _reason_clean
    WHERE id = _message.id;
  ELSE
    DELETE FROM public.community_messages WHERE id = _message.id;
  END IF;
END;
$$;