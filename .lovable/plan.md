## Plano de execução — Entrega Pro v2

### Etapa 1 — Backend (Lovable Cloud)
1. Habilitar Lovable Cloud.
2. Migration única com todas as tabelas:
   - `profiles` (perfil do motorista: nome, foto, telefone, transportadora, veículo, placa, meta mensal)
   - `user_roles` + enum `app_role` (`admin`, `user`) + função `has_role`
   - `lancamentos`, `recebimentos`, `abastecimentos`, `manutencoes` (operacional)
   - `contas_fixas`, `cartoes_credito`, `cartao_lancamentos`, `fluxo_caixa`, `metas_financeiras`, `pix_recebidos`, `pix_enviados` (premium financeiro)
   - `usuarios_premium`, `solicitacoes_premium` (assinaturas)
   - `configuracoes` (singleton: chave PIX, valores dos planos, mensagem)
3. RLS em todas: `user_id = auth.uid()`; `configuracoes` SELECT público + UPDATE só admin; `solicitacoes_premium` admin lê tudo.
4. Trigger `handle_new_user` cria profile + concede 15 dias de teste em `usuarios_premium`.
5. Bucket Storage `comprovantes` (privado, leitura do dono + admin).
6. Função SQL `is_premium_ativo(uid)` (válido se `data_validade >= now()` OU teste vigente).

### Etapa 2 — Auth
- Tela `/auth` com login/cadastro por email-senha **e** telefone (OTP SMS — requer provider configurado pelo usuário depois) + reset de senha.
- Layout `_authenticated/route.tsx` protege tudo do app.
- Sign-in com Google opcional via broker (pulo se não pedir).

### Etapa 3 — Migração do localStorage
- Ao primeiro login, detectar `entrega-pro:v1` no localStorage e oferecer botão "Importar meus dados antigos" → server fn faz bulk insert nas tabelas do usuário, marca como importado.

### Etapa 4 — App gratuito (rotas existentes refatoradas para Supabase)
- `/` Dashboard, `/lancamento/$id`, `/historico`, `/recebimentos`, `/abastecimentos`, `/manutencao`, `/resumo`, `/graficos`, `/perfil`, `/mais`.
- Todos os hooks de `lib/store.ts` viram queries TanStack Query contra Supabase via server fns autenticadas.
- Exportar PDF/Excel/JSON mantidos client-side a partir dos dados carregados.

### Etapa 5 — Premium
- `/premium` mostra estado (teste/ativo/expirado), valores e chave PIX vindos de `configuracoes`, botão copiar PIX, upload de comprovante para Storage → cria linha em `solicitacoes_premium` (pendente).
- Gate `requirePremium` nas rotas: `/financeiro/contas`, `/financeiro/cartoes`, `/financeiro/fluxo`, `/financeiro/metas`, `/financeiro/pix`, `/financeiro/mei`.
- Cada tela = CRUD simples + resumo.
- Relatório MEI = agregação mensal/anual de fluxo_caixa.

### Etapa 6 — Admin (`/admin`)
- Gate por `has_role('admin')`.
- Sub-rotas: usuários, assinantes premium, solicitações PIX (aprovar/recusar → atualiza `usuarios_premium`), configurações (editar chave PIX, valores, mensagem), estatísticas.

### Etapa 7 — Design
- Material-ish tema escuro já existente; ajustar tokens em `styles.css`: preto/azul-escuro base, amarelo destaque (CTA premium), verde ganhos, vermelho descontos. Sem refazer tudo — só reforçar paleta.

### Detalhes técnicos
- Stack: TanStack Start + Supabase (já é o padrão do template).
- Server fns em `src/lib/*.functions.ts` com `requireSupabaseAuth`; admin fns checam `has_role` no handler.
- Server fns admin que escrevem em outros usuários carregam `supabaseAdmin` dentro do handler (`await import('@/integrations/supabase/client.server')`).
- Como serão MUITOS arquivos (estimativa: ~40 arquivos novos/editados, ~3-5 mil linhas), vou trabalhar em ondas e te avisar quando parar para você revisar antes de seguir.

### Pendências que dependem de você
- **SMS por telefone**: Supabase precisa de um provider SMS (Twilio, MessageBird etc.) que cobra à parte. Posso deixar email/senha funcionando 100% e a UI de telefone pronta, mas o OTP só vai disparar depois que você plugar o provider no painel do Supabase.
- **Chave PIX e valores**: deixo defaults em branco; você edita pelo `/admin` depois de virar admin (vou te explicar como rodar o SQL pra se promover).

Confirma que posso seguir nessa ordem?
