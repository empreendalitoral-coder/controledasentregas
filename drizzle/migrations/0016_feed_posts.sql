CREATE TABLE public.feed_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_name text NOT NULL DEFAULT '',
  author_photo text,
  content text NOT NULL DEFAULT '' CHECK (char_length(content) <= 1000),
  image_path text NOT NULL,
  removed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT feed_post_image_path CHECK (image_path ~ ('^' || author_id::text || '/[0-9a-f-]{36}\.jpg$'))
);
CREATE INDEX feed_posts_created_idx ON public.feed_posts (created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.feed_posts TO authenticated;
GRANT ALL ON public.feed_posts TO service_role;
ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.feed_likes (
  post_id uuid NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.feed_likes TO authenticated;
GRANT ALL ON public.feed_likes TO service_role;
ALTER TABLE public.feed_likes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.feed_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_name text NOT NULL DEFAULT '',
  author_photo text,
  content text NOT NULL CHECK (char_length(btrim(content)) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX feed_comments_post_idx ON public.feed_comments (post_id, created_at);
GRANT SELECT, INSERT, DELETE ON public.feed_comments TO authenticated;
GRANT ALL ON public.feed_comments TO service_role;
ALTER TABLE public.feed_comments ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION private.prepare_feed_item()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record;
BEGIN
  IF NEW.author_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Autor inválido'; END IF;
  IF NEW.content ~* '(https?://|www\.|[a-z0-9-]+\.(com|net|org|br|io|me|ly)(/|\s|$))' THEN
    RAISE EXCEPTION 'Links não são permitidos na Comunidade';
  END IF;
  IF EXISTS (SELECT 1 FROM public.community_members m WHERE m.user_id = NEW.author_id AND m.suspended_until > now()) THEN
    RAISE EXCEPTION 'Sua participação está suspensa';
  END IF;
  IF TG_TABLE_NAME = 'feed_posts' AND NOT (private.is_premium_ativo(NEW.author_id) OR private.is_admin_ativo(NEW.author_id)) THEN
    RAISE EXCEPTION 'Publicar no Feed é exclusivo para assinantes Premium';
  END IF;
  SELECT nome, foto INTO p FROM public.profiles WHERE id = NEW.author_id;
  NEW.author_name := coalesce(nullif(p.nome, ''), 'Motorista');
  NEW.author_photo := p.foto;
  NEW.created_at := now();
  IF TG_TABLE_NAME = 'feed_posts' THEN NEW.removed_at := NULL; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER feed_posts_prepare BEFORE INSERT ON public.feed_posts FOR EACH ROW EXECUTE FUNCTION private.prepare_feed_item();
CREATE TRIGGER feed_comments_prepare BEFORE INSERT ON public.feed_comments FOR EACH ROW EXECUTE FUNCTION private.prepare_feed_item();

CREATE POLICY "Feed ver posts" ON public.feed_posts FOR SELECT TO authenticated
USING (private.is_admin_ativo(auth.uid()) OR author_id = auth.uid() OR (removed_at IS NULL AND private.community_has_access(auth.uid())
  AND NOT EXISTS (SELECT 1 FROM public.community_blocks b WHERE b.blocker_id = auth.uid() AND b.blocked_id = feed_posts.author_id)));
CREATE POLICY "Feed publicar" ON public.feed_posts FOR INSERT TO authenticated
WITH CHECK (author_id = auth.uid() AND private.community_has_access(auth.uid()));
CREATE POLICY "Feed apagar proprio ou admin" ON public.feed_posts FOR DELETE TO authenticated
USING (author_id = auth.uid() OR private.is_admin_ativo(auth.uid()));

CREATE POLICY "Feed ver curtidas" ON public.feed_likes FOR SELECT TO authenticated
USING (private.community_has_access(auth.uid()) OR private.is_admin_ativo(auth.uid()));
CREATE POLICY "Feed curtir" ON public.feed_likes FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND private.community_has_access(auth.uid()));
CREATE POLICY "Feed descurtir" ON public.feed_likes FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Feed ver comentarios" ON public.feed_comments FOR SELECT TO authenticated
USING (private.is_admin_ativo(auth.uid()) OR (private.community_has_access(auth.uid())
  AND NOT EXISTS (SELECT 1 FROM public.community_blocks b WHERE b.blocker_id = auth.uid() AND b.blocked_id = feed_comments.author_id)));
CREATE POLICY "Feed comentar" ON public.feed_comments FOR INSERT TO authenticated
WITH CHECK (author_id = auth.uid() AND private.community_has_access(auth.uid()));
CREATE POLICY "Feed apagar comentario" ON public.feed_comments FOR DELETE TO authenticated
USING (author_id = auth.uid() OR private.is_admin_ativo(auth.uid()));

CREATE POLICY "Feed envia fotos premium" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'feed-photos' AND (storage.foldername(name))[1] = auth.uid()::text AND private.community_has_access(auth.uid())
  AND (private.is_premium_ativo(auth.uid()) OR private.is_admin_ativo(auth.uid())));
CREATE POLICY "Feed ve fotos" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'feed-photos' AND (private.is_admin_ativo(auth.uid()) OR (storage.foldername(name))[1] = auth.uid()::text
  OR (private.community_has_access(auth.uid()) AND EXISTS (SELECT 1 FROM public.feed_posts p WHERE p.image_path = storage.objects.name AND p.removed_at IS NULL))));
CREATE POLICY "Feed apaga fotos" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'feed-photos' AND ((storage.foldername(name))[1] = auth.uid()::text OR private.is_admin_ativo(auth.uid())));