DROP POLICY IF EXISTS "Tipos legiveis por autenticados" ON public.notification_tipos;
CREATE POLICY "Tipos visiveis conforme perfil" ON public.notification_tipos
FOR SELECT TO authenticated
USING (NOT apenas_admin OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role = 'admin'));