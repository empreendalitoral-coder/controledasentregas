
# Entrega Pro — Roteiro para Play Store

Você escolheu começar por **Conteúdo Legal Play Store**, empacotar via **PWA Builder**, **soft delete 30 dias** e **push real (FCM)**. Vou dividir em fases pequenas para não quebrar o que já funciona. Cada fase é um turno separado — você aprova a Fase 1 agora e seguimos.

---

## Fase 1 — Conteúdo legal + Exclusão de conta + PWA de qualidade (AGORA)

Meta: cumprir requisitos da Play Store sem tocar em bugs de cálculo.

**Páginas públicas novas** (fora de `_authenticated`, indexáveis, com `head()` próprio):
- `/privacidade` — Política de Privacidade completa (LGPD): dados coletados, finalidade, armazenamento (Lovable Cloud), segurança, direitos do titular, exclusão, contato.
- `/termos` — Termos de Uso: responsabilidades, Premium (R$ 3,90/mês, R$ 24,90/ano), assinatura, cancelamento, limitação.
- `/sobre` — versão do app, changelog curto, tecnologias, contato/suporte, licenças open-source.
- `/suporte` — e-mail de contato + WhatsApp opcional + FAQ curto.

**Exclusão de conta (soft delete + purge 30 dias)**:
- Nova tabela `contas_excluidas (user_id, solicitado_em, purge_em, motivo)` com RLS.
- Coluna `excluida_em` em `profiles`.
- Server function `solicitarExclusaoConta`: marca `profiles.excluida_em = now()`, insere em `contas_excluidas` com `purge_em = now() + 30d`, faz `supabase.auth.signOut()`.
- Server function `cancelarExclusaoConta`: se dentro dos 30d, remove marcação.
- Gate no `_authenticated/route.tsx`: se `profiles.excluida_em` estiver setado, redireciona para tela "Conta em exclusão — cancelar?".
- Cron `pg_cron` diário chamando rota pública `/api/public/hooks/purge-contas`: apaga dados do usuário (todas as tabelas dele) + `auth.admin.deleteUser` via `supabaseAdmin`. Autenticado por `apikey` header (padrão Lovable).
- Nova tela em `/perfil` → "Zona de perigo" → botão "Excluir minha conta" com confirmação por texto ("EXCLUIR").

**PWA pronto para PWA Builder**:
- Revisar `public/manifest.webmanifest`: `name`, `short_name`, `description`, `id`, `start_url`, `scope`, `display: standalone`, `theme_color`, `background_color`, `categories`, `screenshots` (2 mobile), `icons` (192, 512, + maskable 512).
- Gerar screenshots reais do dashboard e histórico via Playwright, salvar em `public/screenshots/`.
- Gerar ícone maskable 512 se faltar.
- Adicionar service worker via `vite-plugin-pwa` com registro guardado (só em produção, fora de iframe/preview) — conforme a skill PWA. Excluir `/~oauth` e `/api/public/*` do cache. `NetworkFirst` para navegações.

**Links de rodapé**: adicionar `Privacidade · Termos · Sobre · Suporte` no `AppShell` (rodapé discreto) e no `/auth` (obrigatório para Play Store).

**Head metadata**: `og:title`/`og:description`/`twitter:card` por rota pública, para as páginas legais terem preview decente.

Entregável Fase 1: você já pode subir a URL publicada no pwabuilder.com e gerar o `.aab` funcional, com todas as páginas exigidas pela Play Store.

---

## Fase 2 — Push notifications (FCM) [próximo turno]

Não cabe junto com Fase 1 sem risco. O que envolve:
- Você cria projeto no Firebase Console e me dá 5 valores (`apiKey`, `authDomain`, `projectId`, `messagingSenderId`, `appId`, `vapidKey`) — vou pedir com o fluxo `add_secret` na hora certa.
- Você me passa o arquivo `service-account.json` do FCM para eu salvar como secret `FCM_SERVICE_ACCOUNT`.
- Implemento:
  - `public/firebase-messaging-sw.js` (worker separado, não conflita com o SW do PWA).
  - Init do Firebase Messaging em client, pedido de permissão em `/perfil`.
  - Tabela `push_tokens (user_id, token, plataforma, ativo)` com RLS.
  - Server function `registrarPushToken`.
  - Rota `/api/public/hooks/enviar-notificacoes` chamada por `pg_cron` (diário 8h e 20h): varre `recebimentos` próximos (3 dias), metas atingidas, premium vencendo em 3 dias, e envia via FCM HTTP v1.
  - Preferências por tipo em `profiles` (opt-in por categoria).

---

## Fase 3 — Bugs de sincronização em tempo real [depois]

Não misturo com Fase 1. Aqui trato:
- Store unificar via React Query com invalidação após create/update/delete em: lançamentos, combustível, manutenção, recebimentos, PIX, cartões, contas fixas.
- Dashboard, Gráficos, Histórico, Resumo, MEI e Fluxo passam a consumir os mesmos `queryKey`s.
- Realtime opcional (Supabase channel) em `lancamentos` e `recebimentos` para atualizar entre abas/dispositivos.

## Fase 4 — Perfil completo + PDF pro + Backup validado

- Perfil: foto (bucket `avatars` público), telefone, transportadora, modelo, placa, cidade, estado, meta mensal. Salvamento auto (debounce).
- Relatório PDF via `@react-pdf/renderer` ou `pdf-lib`: cabeçalho com logo + nome + placa + mês, blocos de bruto/líquido/lucro real, tabela de dias, totais.
- Backup: exportar JSON versionado (`schema_version`), importar com validação zod, dry-run mostrando diffs.

## Fase 5 — QA final + hardening + publicação

- Testes E2E via Playwright: 20 lançamentos, editar, excluir, importar, exportar, contas, combustível, manutenção, recebimentos, conferência dos totais.
- Rodar `security--run_security_scan` e `supabase--linter`, corrigir tudo.
- `preview_ui--publish`.
- Guia passo a passo para PWA Builder → Play Console (data safety, categorização, screenshots, ícone 512, política de privacidade URL).

---

## Detalhes técnicos (Fase 1)

- Rotas legais: `src/routes/privacidade.tsx`, `termos.tsx`, `sobre.tsx`, `suporte.tsx` — todas com `head()` completo (title, description, og:*).
- Migration cria `contas_excluidas` com GRANTs para `authenticated`/`service_role`, RLS `user_id = auth.uid()`, e coluna `profiles.excluida_em`.
- Cron via `standard_connectors` não é necessário; uso `pg_cron` + `pg_net` chamando `/api/public/hooks/purge-contas` com header `apikey`.
- PWA: `vite-plugin-pwa` com `registerType: "autoUpdate"`, `injectRegister: null`, wrapper de registro guardando iframe/preview/`?sw=off`, kill-switch já contemplado pela skill.
- Screenshots reais gerados com Playwright em viewport 360x780, salvos como `public/screenshots/dashboard.png` e `historico.png` e referenciados no manifest com `form_factor: "narrow"`.

## O que NÃO faço na Fase 1

- Não mexo em cálculos de dashboard/gráficos (fica para Fase 3).
- Não instalo Firebase ainda (Fase 2).
- Não regenero o PDF de relatório (Fase 4).
- Não publico automaticamente — publico só quando você pedir.

---

Confirma a Fase 1 assim? Se sim, executo já: migration da exclusão de conta + 4 páginas legais + PWA pronto para o PWA Builder + rodapé com links + tela "Excluir minha conta".
