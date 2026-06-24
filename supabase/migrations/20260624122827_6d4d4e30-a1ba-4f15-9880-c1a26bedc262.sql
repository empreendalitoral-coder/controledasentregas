
-- Fix search_path on set_updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Storage policies for comprovantes bucket
CREATE POLICY "users upload own comprovantes" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'comprovantes' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "users read own comprovantes" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'comprovantes' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "users delete own comprovantes" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'comprovantes' AND (storage.foldername(name))[1] = auth.uid()::text);
