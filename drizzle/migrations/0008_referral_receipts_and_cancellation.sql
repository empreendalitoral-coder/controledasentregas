CREATE OR REPLACE FUNCTION public.attach_referral_receipt(_id uuid,_path text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Entre na sua conta'; END IF;
IF _path IS NULL OR split_part(_path,'/',1)<>auth.uid()::text OR char_length(_path)>300 OR _path LIKE '%..%' THEN RAISE EXCEPTION 'Comprovante inválido'; END IF;
IF NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='comprovantes' AND name=_path) THEN RAISE EXCEPTION 'Comprovante não encontrado'; END IF;
UPDATE public.solicitacoes_premium SET comprovante_path=_path WHERE id=_id AND user_id=auth.uid() AND status='pendente' AND referral_discount>0 AND NOT payment_refunded;
IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação não disponível'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.attach_referral_receipt(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.attach_referral_receipt(uuid,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.record_referral_payment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE ref uuid; first_id uuid; wallet_user uuid;
BEGIN
SELECT user_id INTO wallet_user FROM public.referral_commissions WHERE payment_id=NEW.id;
IF wallet_user IS NOT NULL THEN PERFORM pg_advisory_xact_lock(hashtextextended(wallet_user::text,0)); END IF;
IF NEW.payment_refunded OR NEW.status='recusado' THEN
UPDATE public.referral_commissions SET cancelled=true WHERE payment_id=NEW.id;
SELECT user_id INTO wallet_user FROM public.referral_redemptions WHERE payment_id=NEW.id AND status='approved';
IF wallet_user IS NOT NULL THEN
PERFORM pg_advisory_xact_lock(hashtextextended(wallet_user::text,0));
UPDATE public.referral_redemptions SET status='rejected',reason=CASE WHEN NEW.payment_refunded THEN 'Pagamento reembolsado; saldo devolvido' ELSE 'Solicitação Premium recusada; saldo devolvido' END,decided_at=now() WHERE payment_id=NEW.id AND status='approved';
END IF;
RETURN NEW;
END IF;
IF NEW.status='aprovado' AND OLD.status<>'aprovado' AND NEW.plano IN ('mensal','anual') AND NEW.valor>0 THEN
INSERT INTO public.referral_first_payments(buyer_id,payment_id) VALUES(NEW.user_id,NEW.id) ON CONFLICT DO NOTHING RETURNING payment_id INTO first_id;
IF first_id IS NOT NULL THEN
SELECT referrer_id INTO ref FROM public.referral_attributions WHERE buyer_id=NEW.user_id;
IF ref IS NOT NULL THEN
PERFORM pg_advisory_xact_lock(hashtextextended(ref::text,0));
INSERT INTO public.referral_commissions(user_id,payment_id,amount) VALUES(ref,NEW.id,round(NEW.valor*0.05,2));
END IF;
END IF;
END IF;
RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.check_referral_payment_values() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
IF NEW.valor::text IN ('NaN','Infinity','-Infinity') OR NEW.referral_discount::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Valor inválido'; END IF;
IF NEW.payment_refunded AND NEW.status<>'aprovado' THEN RAISE EXCEPTION 'Somente pagamentos confirmados podem ser reembolsados'; END IF;
IF TG_OP='UPDATE' AND OLD.referral_discount>0 AND NEW.plano<>OLD.plano THEN RAISE EXCEPTION 'O plano do desconto não pode ser alterado'; END IF;
RETURN NEW;
END $$;
CREATE TRIGGER trg_check_referral_payment_values BEFORE INSERT OR UPDATE ON public.solicitacoes_premium FOR EACH ROW EXECUTE FUNCTION public.check_referral_payment_values();
REVOKE ALL ON FUNCTION public.check_referral_payment_values() FROM PUBLIC,anon;
ALTER TABLE public.referral_redemptions ADD CONSTRAINT finite_redemption CHECK(amount::text NOT IN ('NaN','Infinity','-Infinity'));
ALTER TABLE public.referral_commissions ADD CONSTRAINT finite_commission CHECK(amount::text NOT IN ('NaN','Infinity','-Infinity'));