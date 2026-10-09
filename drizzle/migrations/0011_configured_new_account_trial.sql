CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE ref uuid; trial_days integer;
BEGIN
SELECT GREATEST(0, COALESCE(dias_teste_gratis,3)) INTO trial_days FROM public.configuracoes WHERE id=1;
trial_days := COALESCE(trial_days,3);
INSERT INTO public.profiles(id,nome,email,telefone) VALUES(NEW.id,coalesce(NEW.raw_user_meta_data->>'nome',''),NEW.email,NEW.phone) ON CONFLICT DO NOTHING;
INSERT INTO public.user_roles(user_id,role) VALUES(NEW.id,'user') ON CONFLICT DO NOTHING;
INSERT INTO public.usuarios_premium(user_id,plano,ativo,data_inicio,data_validade) VALUES(NEW.id,'teste',true,now(),now()+make_interval(days => trial_days)) ON CONFLICT DO NOTHING;
SELECT user_id INTO ref FROM public.referral_codes WHERE code::text=lower(NEW.raw_user_meta_data->>'referral_code');
IF ref IS NOT NULL AND ref<>NEW.id THEN INSERT INTO public.referral_attributions(buyer_id,referrer_id) VALUES(NEW.id,ref) ON CONFLICT DO NOTHING; END IF;
RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.activate_premium_on_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE dias INTEGER; base_validade TIMESTAMPTZ;
BEGIN
IF NEW.status='aprovado' AND (OLD.status IS NULL OR OLD.status<>'aprovado') THEN
IF NEW.plano='anual' THEN dias:=365;
ELSIF NEW.plano='mensal' THEN dias:=30;
ELSE SELECT GREATEST(0,COALESCE(dias_teste_gratis,3)) INTO dias FROM public.configuracoes WHERE id=1; dias:=COALESCE(dias,3);
END IF;
SELECT GREATEST(now(),COALESCE(data_validade,now())) INTO base_validade FROM public.usuarios_premium WHERE user_id=NEW.user_id;
IF base_validade IS NULL THEN base_validade:=now(); END IF;
INSERT INTO public.usuarios_premium(user_id,plano,ativo,data_inicio,data_validade)
VALUES(NEW.user_id,NEW.plano,true,now(),base_validade+make_interval(days => dias))
ON CONFLICT(user_id) DO UPDATE SET plano=EXCLUDED.plano,ativo=true,data_validade=base_validade+make_interval(days => dias),updated_at=now();
END IF;
RETURN NEW;
END; $function$;