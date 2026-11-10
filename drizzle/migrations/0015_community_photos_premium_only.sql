DROP POLICY IF EXISTS "Comunidade envia fotos proprias" ON storage.objects;
CREATE POLICY "Comunidade envia fotos proprias" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'community-photos' AND (storage.foldername(name))[1] = auth.uid()::text AND private.community_has_access(auth.uid())
  AND (private.is_premium_ativo(auth.uid()) OR private.is_admin_ativo(auth.uid())));

CREATE OR REPLACE FUNCTION private.community_photo_premium_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.image_path IS NOT NULL AND NOT (private.is_premium_ativo(NEW.author_id) OR private.is_admin_ativo(NEW.author_id)) THEN
    RAISE EXCEPTION 'Envio de fotos é exclusivo para assinantes Premium';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS community_photo_premium_guard ON public.community_messages;
CREATE TRIGGER community_photo_premium_guard BEFORE INSERT OR UPDATE OF image_path ON public.community_messages
FOR EACH ROW EXECUTE FUNCTION private.community_photo_premium_guard();