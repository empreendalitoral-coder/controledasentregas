CREATE OR REPLACE FUNCTION public.record_referral_payment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE ref uuid; first_id uuid; wallet_user uuid; lock_user uuid;
BEGIN
SELECT user_id INTO ref FROM public.referral_commissions WHERE payment_id=NEW.id;
IF ref IS NULL THEN SELECT referrer_id INTO ref FROM public.referral_attributions WHERE buyer_id=NEW.user_id; END IF;
SELECT user_id INTO wallet_user FROM public.referral_redemptions WHERE payment_id=NEW.id AND status='approved';
FOR lock_user IN SELECT DISTINCT x FROM unnest(ARRAY[ref,wallet_user]) x WHERE x IS NOT NULL ORDER BY x LOOP
PERFORM pg_advisory_xact_lock(hashtextextended(lock_user::text,0));
END LOOP;
IF NEW.payment_refunded OR NEW.status='recusado' THEN
UPDATE public.referral_commissions SET cancelled=true WHERE payment_id=NEW.id;
UPDATE public.referral_redemptions SET status='rejected',reason=CASE WHEN NEW.payment_refunded THEN 'Pagamento reembolsado; saldo devolvido' ELSE 'Solicitação Premium recusada; saldo devolvido' END,decided_at=now() WHERE payment_id=NEW.id AND status='approved';
RETURN NEW;
END IF;
IF NEW.status='aprovado' AND OLD.status<>'aprovado' AND NEW.plano IN ('mensal','anual') AND NEW.valor>0 THEN
INSERT INTO public.referral_first_payments(buyer_id,payment_id) VALUES(NEW.user_id,NEW.id) ON CONFLICT DO NOTHING RETURNING payment_id INTO first_id;
IF first_id IS NOT NULL AND ref IS NOT NULL THEN
INSERT INTO public.referral_commissions(user_id,payment_id,amount) VALUES(ref,NEW.id,round(NEW.valor*0.05,2));
END IF;
END IF;
RETURN NEW;
END $$;