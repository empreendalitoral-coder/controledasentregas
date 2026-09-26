ALTER TABLE public.configuracoes
  ADD COLUMN IF NOT EXISTS comunidade_premium_ativa boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS comunidade_premium_ativada_em timestamptz;

CREATE OR REPLACE FUNCTION public.preserve_community_premium_activation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.comunidade_premium_ativada_em IS NOT NULL THEN
    NEW.comunidade_premium_ativada_em := OLD.comunidade_premium_ativada_em;
  ELSIF NEW.comunidade_premium_ativa AND NOT OLD.comunidade_premium_ativa THEN
    NEW.comunidade_premium_ativada_em := now();
  ELSE
    NEW.comunidade_premium_ativada_em := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_preserve_community_premium_activation
BEFORE UPDATE ON public.configuracoes
FOR EACH ROW
EXECUTE FUNCTION public.preserve_community_premium_activation();

CREATE OR REPLACE FUNCTION private.community_has_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT private.community_email_confirmed(_user_id)
    AND (
      NOT COALESCE((SELECT comunidade_premium_ativa FROM public.configuracoes WHERE id = 1), false)
      OR private.is_admin_ativo(_user_id)
      OR private.has_role(_user_id, 'admin'::public.app_role)
      OR EXISTS (
        SELECT 1
        FROM public.usuarios_premium up
        WHERE up.user_id = _user_id
          AND up.ativo = true
          AND up.data_validade >= now()
      )
      OR EXISTS (
        SELECT 1
        FROM public.community_members cm
        CROSS JOIN public.configuracoes c
        WHERE c.id = 1
          AND cm.user_id = _user_id
          AND c.comunidade_premium_ativada_em IS NOT NULL
          AND cm.rules_accepted_at < c.comunidade_premium_ativada_em
          AND now() < c.comunidade_premium_ativada_em + interval '30 days'
      )
    );
$$;

REVOKE ALL ON FUNCTION private.community_has_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.community_has_access(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.community_can_read(_viewer uuid, _author uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT private.community_has_access(_viewer)
    AND (
      private.is_admin_ativo(_viewer)
      OR private.has_role(_viewer, 'admin'::public.app_role)
      OR NOT EXISTS (
        SELECT 1 FROM public.community_blocks
        WHERE blocker_id = _viewer AND blocked_id = _author
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.get_community_access_status()
RETURNS TABLE(
  premium_required boolean,
  activated_at timestamptz,
  has_access boolean,
  is_admin boolean,
  premium_valid boolean,
  transition_ends_at timestamptz,
  transition_days_remaining integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH cfg AS (
    SELECT comunidade_premium_ativa, comunidade_premium_ativada_em
    FROM public.configuracoes
    WHERE id = 1
  ), status AS (
    SELECT
      COALESCE((SELECT comunidade_premium_ativa FROM cfg), false) AS required,
      (SELECT comunidade_premium_ativada_em FROM cfg) AS activation,
      private.is_admin_ativo(auth.uid()) OR private.has_role(auth.uid(), 'admin'::public.app_role) AS admin_user,
      EXISTS (
        SELECT 1 FROM public.usuarios_premium up
        WHERE up.user_id = auth.uid() AND up.ativo = true AND up.data_validade >= now()
      ) AS valid_premium,
      (SELECT cm.rules_accepted_at FROM public.community_members cm WHERE cm.user_id = auth.uid()) AS accepted_at
  )
  SELECT
    required,
    activation,
    private.community_has_access(auth.uid()),
    admin_user,
    valid_premium,
    CASE WHEN required AND activation IS NOT NULL AND accepted_at < activation
      THEN activation + interval '30 days' ELSE NULL END,
    CASE WHEN required AND activation IS NOT NULL AND accepted_at < activation AND now() < activation + interval '30 days'
      THEN GREATEST(1, CEIL(EXTRACT(EPOCH FROM ((activation + interval '30 days') - now())) / 86400.0)::integer)
      ELSE 0 END
  FROM status;
$$;

REVOKE ALL ON FUNCTION public.get_community_access_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_community_access_status() TO authenticated, service_role;

ALTER POLICY "Membros aceitam regras" ON public.community_members
  WITH CHECK (
    user_id = auth.uid()
    AND rules_accepted_at IS NOT NULL
    AND suspended_until IS NULL
    AND suspended_reason IS NULL
    AND private.community_has_access(auth.uid())
  );

ALTER POLICY "Membros atualizam aceite" ON public.community_members
  USING (user_id = auth.uid() AND private.community_has_access(auth.uid()))
  WITH CHECK (
    user_id = auth.uid()
    AND rules_accepted_at IS NOT NULL
    AND suspended_until IS NULL
    AND suspended_reason IS NULL
    AND private.community_has_access(auth.uid())
  );

ALTER POLICY "Confirmados enviam mensagens" ON public.community_messages
  WITH CHECK (author_id = auth.uid() AND private.community_has_access(auth.uid()));

ALTER POLICY "Usuarios criam denuncias" ON public.community_reports
  WITH CHECK (reporter_id = auth.uid() AND private.community_has_access(auth.uid()));

ALTER POLICY "Usuarios veem proprias denuncias" ON public.community_reports
  USING (
    private.is_admin_ativo(auth.uid())
    OR private.has_role(auth.uid(), 'admin'::public.app_role)
    OR (reporter_id = auth.uid() AND private.community_has_access(auth.uid()))
  );

ALTER POLICY "Usuarios gerenciam bloqueios" ON public.community_blocks
  USING (blocker_id = auth.uid() AND private.community_has_access(auth.uid()))
  WITH CHECK (blocker_id = auth.uid() AND private.community_has_access(auth.uid()));

CREATE OR REPLACE FUNCTION public.prepare_community_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _profile public.profiles%ROWTYPE;
  _member public.community_members%ROWTYPE;
  _reply public.community_messages%ROWTYPE;
  _normalized text;
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
  NEW.author_name := left(COALESCE(NULLIF(btrim(_profile.nome), ''), 'Motorista'), 60);
  NEW.author_photo := _profile.foto;
  NEW.removed_at := NULL;
  NEW.removed_by := NULL;
  NEW.removal_reason := NULL;

  IF NEW.reply_to IS NOT NULL THEN
    SELECT * INTO _reply FROM public.community_messages WHERE id = NEW.reply_to AND removed_at IS NULL;
    IF _reply.id IS NULL THEN RAISE EXCEPTION 'A mensagem respondida não está mais disponível'; END IF;
    NEW.reply_author_name := _reply.author_name;
    NEW.reply_preview := left(_reply.content, 100);
  ELSE
    NEW.reply_author_name := NULL;
    NEW.reply_preview := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prepare_community_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR NEW.reporter_id <> auth.uid() THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF NOT private.community_email_confirmed(auth.uid()) THEN RAISE EXCEPTION 'Confirme seu e-mail'; END IF;
  IF NOT private.community_has_access(auth.uid()) THEN RAISE EXCEPTION 'A Comunidade agora faz parte do Premium'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.community_messages WHERE id = NEW.message_id AND author_id <> auth.uid()) THEN
    RAISE EXCEPTION 'Não é possível denunciar esta mensagem';
  END IF;
  NEW.details := NULLIF(left(btrim(COALESCE(NEW.details, '')), 300), '');
  NEW.status := 'pending';
  NEW.reviewed_by := NULL;
  NEW.reviewed_at := NULL;
  RETURN NEW;
END;
$$;