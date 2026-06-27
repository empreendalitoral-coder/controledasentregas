-- Restore EXECUTE for authenticated on SECURITY DEFINER helpers used in RLS policies.
-- They were over-revoked during the security hardening, breaking profile reads
-- and the admin check (RLS expressions are evaluated as the calling role).
-- anon and public stay revoked.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_ativo(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_premium_ativo(uuid) TO authenticated;