
# Fase 2 — Push Notifications (FCM + Capacitor)

Estrutura modular escalável para push notifications no Android nativo, com preferências por usuário e agendamento via cron.

## O que você faz (Firebase — passo a passo)

Antes de eu implementar qualquer coisa do lado servidor, você precisa criar o projeto no Firebase Console:

1. Acesse https://console.firebase.google.com/ → **Adicionar projeto** → nome: `Entrega Pro`.
2. Desabilite Google Analytics (não precisamos).
3. No projeto criado → **Adicionar app** → ícone Android:
   - Package name: `app.entregapro.mobile` (exatamente esse — vai bater com o Capacitor)
   - Apelido: `Entrega Pro Android`
   - Baixe o **`google-services.json`** e me envie
4. Ainda no projeto → ícone de engrenagem → **Configurações do projeto** → aba **Contas de serviço** → **Gerar nova chave privada** → baixa um `.json`. Me envie esse arquivo (é o **Service Account JSON**, usado pela API HTTP v1).
5. VAPID key **não é necessária** porque não vamos usar Web Push agora — só Android nativo.

Assim que você me mandar o Service Account JSON, eu salvo no secret `FIREBASE_SERVICE_ACCOUNT_JSON`. O `google-services.json` vai no repositório em `android/app/`.

## O que eu faço (implementação)

### 1. Banco de dados (migração)

Tabelas novas em `public`:

- **`notification_tipos`** — catálogo dos tipos de notificação. Colunas: `codigo` (PK, ex: `recebimento_proximo`), `titulo`, `descricao`, `categoria` (`operacional`|`financeiro`|`premium`|`admin`|`resumo`), `padrao_ativo` (bool), `apenas_admin` (bool). Pré-populada com os 12 tipos (5 iniciais + 7 futuros).
- **`notification_tokens`** — device tokens FCM por usuário. Colunas: `user_id`, `token` (unique), `plataforma` (`android`|`ios`|`web`), `ultimo_uso`.
- **`notification_preferencias`** — on/off por usuário e por tipo. Colunas: `user_id`, `tipo_codigo`, `ativo`. Default segue `notification_tipos.padrao_ativo`.
- **`notification_envios`** — log de envios (deduplicação + auditoria). Colunas: `user_id`, `tipo_codigo`, `chave_dedup` (ex: `recebimento:<id>`), `enviado_em`, `sucesso`, `erro`. Unique em (`user_id`, `chave_dedup`) evita reenviar a mesma notificação.

Todas com RLS: usuário lê/edita só o próprio; `notification_tipos` público para leitura autenticada.

### 2. Secret e cliente FCM

- Adiciono o secret `FIREBASE_SERVICE_ACCOUNT_JSON` quando você me enviar o arquivo.
- Crio `src/lib/fcm.server.ts` que: gera OAuth2 access token via JWT assinado (RS256) usando o service account, chama `https://fcm.googleapis.com/v1/projects/{projectId}/messages:send`. Cache do token em memória (validade 1h).

### 3. Registry modular de notificações

`src/lib/notifications/registry.server.ts` — cada tipo é um módulo com:

```ts
{
  codigo: 'recebimento_proximo',
  titulo: (ctx) => `Recebimento amanhã: R$ ${ctx.valor}`,
  corpo: (ctx) => `${ctx.origem} vence em 1 dia`,
  dedupKey: (ctx) => `recebimento:${ctx.id}`,
  scan: async (supabaseAdmin) => [...eventos] // opcional: só para tipos agendados
}
```

Adicionar um tipo novo = criar 1 arquivo e registrar. Zero mudança na arquitetura.

Tipos implementados agora:
- `recebimento_proximo` (scan diário, D-1)
- `meta_atingida` (disparado por trigger DB quando `progresso >= 100%`)
- `premium_vencendo` (scan diário, D-7)
- `pix_aprovado` (disparado quando admin aprova solicitação)
- `nova_solicitacao_premium` (disparado no INSERT, envia só para admins)

Tipos catalogados (padrão desativado) para uso futuro:
- `lembrete_entregas_dia`, `lembrete_abastecimento`, `pagamento_atrasado`, `resumo_diario`, `resumo_semanal`, `meta_mensal`, `app_update`.

### 4. Server function `enviarNotificacao`

`src/lib/notifications/send.functions.ts`:
- Recebe `{ userId, tipoCodigo, contexto, dedupKey }`
- Verifica preferência do usuário (respeita opt-out)
- Verifica dedup em `notification_envios`
- Busca tokens do usuário
- Renderiza título/corpo pelo registry
- Envia via FCM HTTP v1 (paralelo por token; remove tokens inválidos)
- Grava resultado em `notification_envios`

### 5. Endpoint de cron diário

`src/routes/api/public/hooks/notificacoes-diarias.ts` (protegido por `apikey`):
- Percorre todos os tipos do registry que têm `scan()`
- Para cada evento retornado, chama `enviarNotificacao`
- Job `pg_cron` roda todo dia 08:00 BRT

### 6. Triggers realtime (DB)

- Trigger `AFTER UPDATE ON solicitacoes_premium` — quando `status='aprovado'`, chama endpoint que envia `pix_aprovado` ao dono.
- Trigger `AFTER INSERT ON solicitacoes_premium` — envia `nova_solicitacao_premium` para todos os admins.
- Trigger `AFTER UPDATE ON metas_financeiras` — quando progresso cruza 100%, envia `meta_atingida`.

Alternativa mais simples e sem `pg_net` extra: essas notificações "instantâneas" chamadas do próprio código do app (aprovar solicitação já é um server fn → chama `enviarNotificacao` inline). Vou por essa via — mais confiável e menos superfície de erro.

### 7. Capacitor Android

- Instalo: `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/push-notifications`.
- Crio `capacitor.config.ts` com `appId: app.entregapro.mobile`, `webDir: dist`.
- Adiciono `android/` (build inicial). Você depois roda `bunx cap sync android` e abre no Android Studio para gerar o `.aab`.
- `src/lib/push.client.ts`: pede permissão, obtém token FCM, registra em `notification_tokens` (via server fn), listener `pushNotificationReceived`.
- Guardado com `Capacitor.isNativePlatform()` — no navegador não roda.

### 8. UI de preferências

Nova rota `_authenticated/perfil/notificacoes.tsx`:
- Lista tipos agrupados por categoria com Switch por tipo
- Card "Dispositivos conectados" (lista tokens registrados, permite remover)
- Grava preferências em `notification_preferencias`

Link na página `/perfil` existente.

## Arquivos criados/alterados

**Novos:**
- `supabase/migrations/*_notifications.sql`
- `src/lib/fcm.server.ts`
- `src/lib/notifications/registry.server.ts`
- `src/lib/notifications/tipos/*.ts` (um por tipo)
- `src/lib/notifications/send.functions.ts`
- `src/lib/notifications/preferences.functions.ts`
- `src/lib/push.client.ts`
- `src/routes/api/public/hooks/notificacoes-diarias.ts`
- `src/routes/_authenticated/perfil/notificacoes.tsx`
- `capacitor.config.ts`, `android/*` (via `bunx cap add android`)

**Alterados:**
- `src/routes/__root.tsx` — registra push no mount (só Capacitor nativo)
- `src/routes/_authenticated/admin/solicitacoes.tsx` — chama `enviarNotificacao` ao aprovar
- `src/routes/_authenticated/perfil.tsx` — link para notificações

## Ordem de execução

1. **Agora (sem depender de você):** migração de tabelas + registry + server fn `enviarNotificacao` + UI de preferências + endpoint cron + Capacitor scaffold. O envio real fica no-op enquanto o secret não existir (log "FCM não configurado").
2. **Quando você me mandar o Service Account JSON:** salvo o secret e o envio passa a funcionar. Sem novo turno de código.
3. **Quando você me mandar o `google-services.json`:** coloco em `android/app/` e o build Android fica pronto para você gerar o `.aab`.

## Fora do escopo desta fase

- Publicação na Play Store (Store listing, screenshots, política) — Fase 3.
- iOS/APNs — não solicitado.
- Web Push — descartado conforme sua escolha.

Confirma que posso começar pelo passo 1?
