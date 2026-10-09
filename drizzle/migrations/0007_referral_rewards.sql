CREATE TABLE public.referral_codes (user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE, code uuid NOT NULL UNIQUE DEFAULT gen_random_uuid());
GRANT SELECT ON public.referral_codes TO authenticated; GRANT ALL ON public.referral_codes TO service_role;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_code ON public.referral_codes FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE TABLE public.referral_attributions (buyer_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE, referrer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), CHECK(buyer_id<>referrer_id));
GRANT SELECT ON public.referral_attributions TO authenticated; GRANT ALL ON public.referral_attributions TO service_role;
ALTER TABLE public.referral_attributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_attributions ON public.referral_attributions FOR SELECT TO authenticated USING(private.has_role(auth.uid(),'admin'));
CREATE TABLE public.referral_first_payments (buyer_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE, payment_id uuid UNIQUE NOT NULL REFERENCES public.solicitacoes_premium(id), confirmed_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.referral_first_payments TO authenticated; GRANT ALL ON public.referral_first_payments TO service_role;
ALTER TABLE public.referral_first_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_first_payments ON public.referral_first_payments FOR SELECT TO authenticated USING(private.has_role(auth.uid(),'admin'));
CREATE TABLE public.referral_commissions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, payment_id uuid NOT NULL UNIQUE REFERENCES public.solicitacoes_premium(id), amount numeric(12,2) NOT NULL CHECK(amount>0), available_at timestamptz NOT NULL DEFAULT(now()+interval '7 days'), cancelled boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.referral_commissions TO authenticated; GRANT ALL ON public.referral_commissions TO service_role;
ALTER TABLE public.referral_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_commissions ON public.referral_commissions FOR SELECT TO authenticated USING(user_id=auth.uid() OR private.has_role(auth.uid(),'admin'));
CREATE TABLE public.referral_redemptions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, kind text NOT NULL CHECK(kind IN ('pix','discount')), amount numeric(12,2) NOT NULL CHECK(amount>0), pix_key text, plan public.plano_premium, status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')), reason text, decided_by uuid, decided_at timestamptz, payment_id uuid REFERENCES public.solicitacoes_premium(id), created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.referral_redemptions TO authenticated; GRANT ALL ON public.referral_redemptions TO service_role;
ALTER TABLE public.referral_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_redemptions ON public.referral_redemptions FOR SELECT TO authenticated USING(user_id=auth.uid() OR private.has_role(auth.uid(),'admin'));
CREATE INDEX referral_commissions_wallet ON public.referral_commissions(user_id,available_at);
CREATE INDEX referral_redemptions_wallet ON public.referral_redemptions(user_id,status);
ALTER TABLE public.solicitacoes_premium ADD COLUMN referral_discount numeric(12,2) NOT NULL DEFAULT 0, ADD COLUMN payment_refunded boolean NOT NULL DEFAULT false;
INSERT INTO public.referral_first_payments(buyer_id,payment_id,confirmed_at) SELECT DISTINCT ON(user_id) user_id,id,updated_at FROM public.solicitacoes_premium WHERE status='aprovado' AND plano IN ('mensal','anual') AND valor>0 ORDER BY user_id,updated_at,id ON CONFLICT DO NOTHING;
CREATE OR REPLACE FUNCTION public.get_referral_wallet() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u uuid:=auth.uid(); c uuid; earned numeric; spent numeric; reserved numeric; pending numeric;
BEGIN
IF u IS NULL THEN RAISE EXCEPTION 'Entre na sua conta'; END IF;
INSERT INTO public.referral_codes(user_id) VALUES(u) ON CONFLICT DO NOTHING;
SELECT code INTO c FROM public.referral_codes WHERE user_id=u;
SELECT coalesce(sum(amount) FILTER(WHERE available_at<=now() AND NOT cancelled),0),coalesce(sum(amount) FILTER(WHERE available_at>now() AND NOT cancelled),0) INTO earned,pending FROM public.referral_commissions WHERE user_id=u;
SELECT coalesce(sum(amount) FILTER(WHERE status='approved'),0),coalesce(sum(amount) FILTER(WHERE status='pending'),0) INTO spent,reserved FROM public.referral_redemptions WHERE user_id=u;
RETURN jsonb_build_object('code',c,'available',earned-spent-reserved,'pending',pending,'reserved',reserved,'redeemed',spent);
END $$;
CREATE OR REPLACE FUNCTION public.request_referral_redemption(_kind text,_amount numeric DEFAULT NULL,_pix_key text DEFAULT NULL,_plan public.plano_premium DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u uuid:=auth.uid(); balance numeric; price numeric; amount_to_use numeric; rid uuid;
BEGIN
IF u IS NULL THEN RAISE EXCEPTION 'Entre na sua conta'; END IF;
PERFORM pg_advisory_xact_lock(hashtextextended(u::text,0));
balance:=(public.get_referral_wallet()->>'available')::numeric;
IF balance<10 THEN RAISE EXCEPTION 'É necessário ter R$ 10 de saldo disponível'; END IF;
IF _kind='pix' THEN
IF char_length(btrim(coalesce(_pix_key,'')))<3 OR char_length(_pix_key)>150 THEN RAISE EXCEPTION 'Informe uma chave Pix válida'; END IF;
IF _amount IS NULL OR _amount<>round(_amount,2) OR _amount<10 OR _amount>balance THEN RAISE EXCEPTION 'Valor de saque inválido'; END IF;
amount_to_use:=_amount;
ELSIF _kind='discount' THEN
IF _plan IS NULL OR _plan NOT IN ('mensal','anual') THEN RAISE EXCEPTION 'Escolha o plano'; END IF;
SELECT CASE _plan WHEN 'mensal' THEN valor_mensal ELSE valor_anual END INTO price FROM public.configuracoes WHERE id=1;
IF price IS NULL OR price<=0 THEN RAISE EXCEPTION 'Plano indisponível'; END IF;
amount_to_use:=least(balance,price);
ELSE RAISE EXCEPTION 'Solicitação inválida'; END IF;
INSERT INTO public.referral_redemptions(user_id,kind,amount,pix_key,plan) VALUES(u,_kind,amount_to_use,CASE WHEN _kind='pix' THEN btrim(_pix_key) END,CASE WHEN _kind='discount' THEN _plan END) RETURNING id INTO rid;
RETURN rid;
END $$;
CREATE OR REPLACE FUNCTION public.decide_referral_redemption(_id uuid,_approve boolean,_reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.referral_redemptions; p public.profiles; price numeric; sid uuid; balance numeric;
BEGIN
IF auth.uid() IS NULL OR NOT private.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Acesso restrito aos administradores'; END IF;
IF _approve IS NULL OR char_length(btrim(coalesce(_reason,'')))<3 OR char_length(_reason)>300 THEN RAISE EXCEPTION 'Informe um motivo ou referência entre 3 e 300 caracteres'; END IF;
SELECT * INTO r FROM public.referral_redemptions WHERE id=_id;
IF r.id IS NULL THEN RAISE EXCEPTION 'Solicitação não encontrada'; END IF;
PERFORM pg_advisory_xact_lock(hashtextextended(r.user_id::text,0));
SELECT * INTO r FROM public.referral_redemptions WHERE id=_id FOR UPDATE;
IF r.status<>'pending' THEN RAISE EXCEPTION 'Esta solicitação já foi decidida'; END IF;
SELECT coalesce(sum(amount),0) INTO balance FROM public.referral_commissions WHERE user_id=r.user_id AND NOT cancelled AND available_at<=now();
SELECT balance-coalesce(sum(amount),0) INTO balance FROM public.referral_redemptions WHERE user_id=r.user_id AND status IN ('pending','approved');
IF _approve AND balance<0 THEN RAISE EXCEPTION 'Saldo insuficiente após estorno; recuse a solicitação'; END IF;
IF _approve AND r.kind='discount' THEN
SELECT CASE r.plan WHEN 'mensal' THEN valor_mensal ELSE valor_anual END INTO price FROM public.configuracoes WHERE id=1;
IF price IS NULL OR r.amount>price THEN RAISE EXCEPTION 'Preço alterado; recuse e solicite novamente'; END IF;
SELECT * INTO p FROM public.profiles WHERE id=r.user_id;
INSERT INTO public.solicitacoes_premium(user_id,nome,email,telefone,plano,valor,referral_discount,status,observacao_admin) VALUES(r.user_id,p.nome,p.email,p.telefone,r.plan,price-r.amount,r.amount,'pendente','Desconto por indicação aprovado') RETURNING id INTO sid;
IF price=r.amount THEN UPDATE public.solicitacoes_premium SET status='aprovado' WHERE id=sid; END IF;
END IF;
UPDATE public.referral_redemptions SET status=CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,reason=btrim(_reason),decided_by=auth.uid(),decided_at=now(),payment_id=sid WHERE id=r.id;
INSERT INTO public.logs_admin(user_id,acao,detalhes) VALUES(auth.uid(),'resgate_indicacao',jsonb_build_object('id',r.id,'approved',_approve,'amount',r.amount,'reason',btrim(_reason)));
END $$;
CREATE OR REPLACE FUNCTION public.guard_referral_payment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
IF TG_OP='INSERT' THEN
IF NOT coalesce(private.has_role(auth.uid(),'admin'),false) AND (NEW.status<>'pendente' OR NEW.referral_discount<>0 OR NEW.payment_refunded) THEN RAISE EXCEPTION 'Pagamento inválido'; END IF;
ELSE
IF (NEW.status IS DISTINCT FROM OLD.status OR NEW.referral_discount IS DISTINCT FROM OLD.referral_discount OR NEW.payment_refunded IS DISTINCT FROM OLD.payment_refunded) AND NOT coalesce(private.has_role(auth.uid(),'admin'),false) THEN RAISE EXCEPTION 'Apenas administradores podem confirmar pagamentos'; END IF;
IF OLD.status='aprovado' AND (NEW.status<>OLD.status OR NEW.valor<>OLD.valor OR NEW.plano<>OLD.plano OR NEW.user_id<>OLD.user_id OR NEW.referral_discount<>OLD.referral_discount) THEN RAISE EXCEPTION 'Pagamento confirmado não pode ser reaprovado ou alterado; use o estorno'; END IF;
IF OLD.payment_refunded AND NOT NEW.payment_refunded THEN RAISE EXCEPTION 'Estorno não pode ser desfeito'; END IF;
END IF;
IF NEW.valor<0 OR NEW.referral_discount<0 THEN RAISE EXCEPTION 'Valor inválido'; END IF;
RETURN NEW;
END $$;
CREATE TRIGGER trg_guard_referral_payment BEFORE INSERT OR UPDATE ON public.solicitacoes_premium FOR EACH ROW EXECUTE FUNCTION public.guard_referral_payment();
CREATE OR REPLACE FUNCTION public.record_referral_payment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE ref uuid; first_id uuid;
BEGIN
IF NEW.payment_refunded THEN
UPDATE public.referral_commissions SET cancelled=true WHERE payment_id=NEW.id;
IF EXISTS(SELECT 1 FROM public.referral_redemptions WHERE payment_id=NEW.id AND status='approved') THEN UPDATE public.referral_redemptions SET status='rejected',reason='Pagamento reembolsado; saldo devolvido',decided_at=now() WHERE payment_id=NEW.id; END IF;
RETURN NEW;
END IF;
IF NEW.status='aprovado' AND OLD.status<>'aprovado' AND NEW.plano IN ('mensal','anual') AND NEW.valor>0 THEN
INSERT INTO public.referral_first_payments(buyer_id,payment_id) VALUES(NEW.user_id,NEW.id) ON CONFLICT DO NOTHING RETURNING payment_id INTO first_id;
IF first_id IS NOT NULL THEN
SELECT referrer_id INTO ref FROM public.referral_attributions WHERE buyer_id=NEW.user_id;
IF ref IS NOT NULL THEN INSERT INTO public.referral_commissions(user_id,payment_id,amount) VALUES(ref,NEW.id,round(NEW.valor*0.05,2)); END IF;
END IF;
END IF;
RETURN NEW;
END $$;
CREATE TRIGGER trg_record_referral_payment AFTER UPDATE ON public.solicitacoes_premium FOR EACH ROW EXECUTE FUNCTION public.record_referral_payment();
CREATE OR REPLACE FUNCTION public.refund_referral_payment(_id uuid,_reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
IF auth.uid() IS NULL OR NOT private.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Acesso restrito aos administradores'; END IF;
IF char_length(btrim(coalesce(_reason,'')))<3 OR char_length(_reason)>300 THEN RAISE EXCEPTION 'Informe o motivo do reembolso'; END IF;
UPDATE public.solicitacoes_premium SET payment_refunded=true WHERE id=_id AND status='aprovado' AND NOT payment_refunded;
IF NOT FOUND THEN RAISE EXCEPTION 'Pagamento não encontrado ou já estornado'; END IF;
INSERT INTO public.logs_admin(user_id,acao,detalhes) VALUES(auth.uid(),'estorno_indicacao',jsonb_build_object('payment_id',_id,'reason',btrim(_reason)));
END $$;
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE ref uuid;
BEGIN
INSERT INTO public.profiles(id,nome,email,telefone) VALUES(NEW.id,coalesce(NEW.raw_user_meta_data->>'nome',''),NEW.email,NEW.phone) ON CONFLICT DO NOTHING;
INSERT INTO public.user_roles(user_id,role) VALUES(NEW.id,'user') ON CONFLICT DO NOTHING;
INSERT INTO public.usuarios_premium(user_id,plano,ativo,data_inicio,data_validade) VALUES(NEW.id,'teste',true,now(),now()+interval '15 days') ON CONFLICT DO NOTHING;
SELECT user_id INTO ref FROM public.referral_codes WHERE code::text=lower(NEW.raw_user_meta_data->>'referral_code');
IF ref IS NOT NULL AND ref<>NEW.id THEN INSERT INTO public.referral_attributions(buyer_id,referrer_id) VALUES(NEW.id,ref) ON CONFLICT DO NOTHING; END IF;
RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.get_referral_wallet(), public.request_referral_redemption(text,numeric,text,public.plano_premium), public.decide_referral_redemption(uuid,boolean,text), public.refund_referral_payment(uuid,text), public.guard_referral_payment(), public.record_referral_payment() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_referral_wallet(), public.request_referral_redemption(text,numeric,text,public.plano_premium), public.decide_referral_redemption(uuid,boolean,text), public.refund_referral_payment(uuid,text) TO authenticated;