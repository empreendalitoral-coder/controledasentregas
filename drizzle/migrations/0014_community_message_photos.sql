ALTER TABLE public.community_messages ADD COLUMN image_path text;
ALTER TABLE public.community_messages ADD CONSTRAINT community_message_image_path CHECK (image_path IS NULL OR image_path ~ ('^' || author_id::text || '/[0-9a-f-]{36}\.jpg$'));

DROP FUNCTION public.get_community_messages();
CREATE FUNCTION public.get_community_messages()
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
  SELECT m.id, m.author_name, m.author_photo, m.content, m.reply_to, m.reply_author_name,
    m.reply_preview, m.removed_at, m.created_at, m.author_id = auth.uid(), m.is_anonymous,
    CASE WHEN m.removed_at IS NULL THEN m.image_path ELSE NULL END
  FROM public.community_messages m
  WHERE NOT EXISTS (SELECT 1 FROM public.community_blocks b WHERE b.blocker_id = auth.uid() AND b.blocked_id = m.author_id)
  ORDER BY m.created_at ASC
  LIMIT 200;
END;
$$;
REVOKE ALL ON FUNCTION public.get_community_messages() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_community_messages() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_community_messages() TO authenticated, service_role;

CREATE POLICY "Comunidade envia fotos proprias" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'community-photos' AND (storage.foldername(name))[1] = auth.uid()::text AND private.community_has_access(auth.uid()));
CREATE POLICY "Comunidade ve fotos visiveis" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'community-photos' AND (
  private.is_admin_ativo(auth.uid()) OR (storage.foldername(name))[1] = auth.uid()::text OR (
    private.community_has_access(auth.uid()) AND EXISTS (
      SELECT 1 FROM public.community_messages m
      WHERE m.image_path = storage.objects.name AND m.removed_at IS NULL
        AND NOT EXISTS (SELECT 1 FROM public.community_blocks b WHERE b.blocker_id = auth.uid() AND b.blocked_id = m.author_id)
    )
  )
));
CREATE POLICY "Comunidade apaga fotos proprias ou admin" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'community-photos' AND ((storage.foldername(name))[1] = auth.uid()::text OR private.is_admin_ativo(auth.uid())));