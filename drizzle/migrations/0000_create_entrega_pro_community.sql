CREATE TABLE public.community_members (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  rules_accepted_at timestamptz,
  suspended_until timestamptz,
  suspended_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.community_members TO authenticated;
GRANT ALL ON public.community_members TO service_role;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Membros veem proprio cadastro" ON public.community_members FOR SELECT TO authenticated USING (user_id = auth.uid() OR private.is_admin_ativo(auth.uid()));
CREATE POLICY "Membros aceitam regras" ON public.community_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND rules_accepted_at IS NOT NULL AND suspended_until IS NULL AND suspended_reason IS NULL);
CREATE POLICY "Membros atualizam aceite" ON public.community_members FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND rules_accepted_at IS NOT NULL AND suspended_until IS NULL AND suspended_reason IS NULL);
CREATE POLICY "Admins moderam membros" ON public.community_members FOR ALL TO authenticated USING (private.is_admin_ativo(auth.uid())) WITH CHECK (private.is_admin_ativo(auth.uid()));
CREATE TRIGGER trg_community_members_updated BEFORE UPDATE ON public.community_members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.community_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  author_photo text,
  content text NOT NULL,
  reply_to uuid REFERENCES public.community_messages(id) ON DELETE SET NULL,
  reply_author_name text,
  reply_preview text,
  removed_at timestamptz,
  removed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  removal_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_message_length CHECK (char_length(content) BETWEEN 1 AND 500)
);
GRANT SELECT, INSERT, UPDATE ON public.community_messages TO authenticated;
GRANT ALL ON public.community_messages TO service_role;
ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX community_messages_created_idx ON public.community_messages(created_at DESC);
CREATE INDEX community_messages_author_idx ON public.community_messages(author_id, created_at DESC);

CREATE TABLE public.community_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.community_messages(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (reason IN ('spam', 'ofensa', 'golpe', 'dados_pessoais', 'outro')),
  details text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, reporter_id)
);
GRANT SELECT, INSERT, UPDATE ON public.community_reports TO authenticated;
GRANT ALL ON public.community_reports TO service_role;
ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;
CREATE INDEX community_reports_status_idx ON public.community_reports(status, created_at DESC);
CREATE POLICY "Usuarios criam denuncias" ON public.community_reports FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "Usuarios veem proprias denuncias" ON public.community_reports FOR SELECT TO authenticated USING (reporter_id = auth.uid() OR private.is_admin_ativo(auth.uid()));
CREATE POLICY "Admins atualizam denuncias" ON public.community_reports FOR UPDATE TO authenticated USING (private.is_admin_ativo(auth.uid())) WITH CHECK (private.is_admin_ativo(auth.uid()));

CREATE TABLE public.community_blocks (
  blocker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT community_no_self_block CHECK (blocker_id <> blocked_id)
);
GRANT SELECT, INSERT, DELETE ON public.community_blocks TO authenticated;
GRANT ALL ON public.community_blocks TO service_role;
ALTER TABLE public.community_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios gerenciam bloqueios" ON public.community_blocks FOR ALL TO authenticated USING (blocker_id = auth.uid()) WITH CHECK (blocker_id = auth.uid());

CREATE OR REPLACE FUNCTION private.community_email_confirmed(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT EXISTS (SELECT 1 FROM auth.users WHERE id = _user_id AND email_confirmed_at IS NOT NULL);
$$;
REVOKE ALL ON FUNCTION private.community_email_confirmed(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.community_email_confirmed(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.community_can_read(_viewer uuid, _author uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT private.community_email_confirmed(_viewer)
    AND NOT EXISTS (
      SELECT 1 FROM public.community_blocks
      WHERE blocker_id = _viewer AND blocked_id = _author
    );
$$;
REVOKE ALL ON FUNCTION private.community_can_read(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.community_can_read(uuid, uuid) TO authenticated, service_role;

CREATE POLICY "Confirmados leem mensagens permitidas" ON public.community_messages FOR SELECT TO authenticated USING (private.community_can_read(auth.uid(), author_id));
CREATE POLICY "Confirmados enviam mensagens" ON public.community_messages FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid() AND private.community_email_confirmed(auth.uid()));
CREATE POLICY "Admins moderam mensagens" ON public.community_messages FOR UPDATE TO authenticated USING (private.is_admin_ativo(auth.uid())) WITH CHECK (private.is_admin_ativo(auth.uid()));

CREATE OR REPLACE FUNCTION public.prepare_community_message()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _profile public.profiles%ROWTYPE;
  _member public.community_members%ROWTYPE;
  _reply public.community_messages%ROWTYPE;
  _normalized text;
BEGIN
  IF auth.uid() IS NULL OR NEW.author_id <> auth.uid() THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF NOT private.community_email_confirmed(auth.uid()) THEN RAISE EXCEPTION 'Confirme seu e-mail antes de participar da Comunidade'; END IF;

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
REVOKE ALL ON FUNCTION public.prepare_community_message() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_community_message() TO service_role;
CREATE TRIGGER trg_prepare_community_message BEFORE INSERT ON public.community_messages FOR EACH ROW EXECUTE FUNCTION public.prepare_community_message();

CREATE OR REPLACE FUNCTION public.prepare_community_report()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NEW.reporter_id <> auth.uid() THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF NOT private.community_email_confirmed(auth.uid()) THEN RAISE EXCEPTION 'Confirme seu e-mail'; END IF;
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
REVOKE ALL ON FUNCTION public.prepare_community_report() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_community_report() TO service_role;
CREATE TRIGGER trg_prepare_community_report BEFORE INSERT ON public.community_reports FOR EACH ROW EXECUTE FUNCTION public.prepare_community_report();

ALTER PUBLICATION supabase_realtime ADD TABLE public.community_messages;