INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'marcelo100surf@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;