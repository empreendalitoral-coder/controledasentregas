CREATE OR REPLACE FUNCTION public.has_financial_premium_access()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT auth.uid() IS NOT NULL AND private.is_premium_ativo(auth.uid()) $$;
REVOKE ALL ON FUNCTION public.has_financial_premium_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_financial_premium_access() TO authenticated, service_role;
COMMENT ON FUNCTION public.has_financial_premium_access() IS 'Enforces the existing Premium-only financial workspace using the authenticated caller, including valid trials.';
CREATE POLICY "Premium required for financial workspace" ON public.contas_fixas AS RESTRICTIVE FOR ALL TO authenticated USING (public.has_financial_premium_access()) WITH CHECK (public.has_financial_premium_access());
CREATE POLICY "Premium required for financial workspace" ON public.cartoes_credito AS RESTRICTIVE FOR ALL TO authenticated USING (public.has_financial_premium_access()) WITH CHECK (public.has_financial_premium_access());
CREATE POLICY "Premium required for financial workspace" ON public.cartao_lancamentos AS RESTRICTIVE FOR ALL TO authenticated USING (public.has_financial_premium_access()) WITH CHECK (public.has_financial_premium_access());
CREATE POLICY "Premium required for financial workspace" ON public.metas_financeiras AS RESTRICTIVE FOR ALL TO authenticated USING (public.has_financial_premium_access()) WITH CHECK (public.has_financial_premium_access());
CREATE POLICY "Premium required for financial workspace" ON public.fluxo_caixa AS RESTRICTIVE FOR ALL TO authenticated USING (public.has_financial_premium_access()) WITH CHECK (public.has_financial_premium_access());
CREATE POLICY "Premium required for financial workspace" ON public.pix_enviados AS RESTRICTIVE FOR ALL TO authenticated USING (public.has_financial_premium_access()) WITH CHECK (public.has_financial_premium_access());
CREATE POLICY "Premium required for financial workspace" ON public.pix_recebidos AS RESTRICTIVE FOR ALL TO authenticated USING (public.has_financial_premium_access()) WITH CHECK (public.has_financial_premium_access());