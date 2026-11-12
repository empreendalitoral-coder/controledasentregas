ALTER TABLE public.community_messages ADD COLUMN room text NOT NULL DEFAULT 'BR';
ALTER TABLE public.community_messages ADD CONSTRAINT community_message_room CHECK (room IN ('BR','AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'));
CREATE INDEX community_messages_room_idx ON public.community_messages(room, created_at DESC);

CREATE OR REPLACE FUNCTION public.community_reply_same_room()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.reply_to IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.community_messages WHERE id = NEW.reply_to AND room = NEW.room) THEN
    RAISE EXCEPTION 'A resposta precisa estar na mesma sala';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER community_reply_same_room BEFORE INSERT ON public.community_messages FOR EACH ROW EXECUTE FUNCTION public.community_reply_same_room();

CREATE OR REPLACE FUNCTION public.get_community_messages(_room text)
RETURNS TABLE (
  id uuid, author_name text, author_photo text, content text, reply_to uuid,
  reply_author_name text, reply_preview text, removed_at timestamptz, created_at timestamptz,
  is_own boolean, is_anonymous boolean, image_path text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT private.community_has_access(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso à Comunidade não autorizado';
  END IF;
  RETURN QUERY
  SELECT * FROM (
    SELECT m.id, m.author_name, m.author_photo, m.content, m.reply_to, m.reply_author_name,
      m.reply_preview, m.removed_at, m.created_at, m.author_id = auth.uid(), m.is_anonymous,
      CASE WHEN m.removed_at IS NULL THEN m.image_path ELSE NULL END
    FROM public.community_messages m
    WHERE m.room = coalesce(_room, 'BR')
      AND NOT EXISTS (SELECT 1 FROM public.community_blocks b WHERE b.blocker_id = auth.uid() AND b.blocked_id = m.author_id)
    ORDER BY m.created_at DESC
    LIMIT 200
  ) t ORDER BY t.created_at ASC;
END;
$$;
REVOKE ALL ON FUNCTION public.get_community_messages(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_community_messages(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_community_messages(text) TO authenticated, service_role;