INSERT INTO public.notification_tipos (codigo, titulo, descricao, categoria, padrao_ativo, apenas_admin, disponivel)
VALUES ('aviso_admin', 'Avisos do administrador', 'Comunicados e novidades enviados pela equipe do Entrega Pro.', 'resumo', true, false, true)
ON CONFLICT (codigo) DO UPDATE SET titulo = EXCLUDED.titulo, descricao = EXCLUDED.descricao, disponivel = true;