# Melhorias do Entrega Pro

A liberação do Premium continua manual, feita por você. O foco é deixar essa aprovação mais rápida e melhorar o uso do dia a dia.

## 1. Aprovar Premium em segundos

Hoje a lista de solicitações mostra os pedidos e os botões de aprovar/recusar. Vou acrescentar:

- Aviso no topo do painel e um número ao lado de "Solicitações" quando houver pedidos pendentes, para você não precisar entrar na tela para saber.
- Visualização do comprovante direto no card (foto abre em tela cheia), sem baixar arquivo.
- Botão "Aprovar" com confirmação rápida e escolha de duração (15 dias, mensal, anual) caso queira dar um período diferente do pedido.
- Botão para liberar Premium manualmente para um usuário pelo e-mail, mesmo sem solicitação (útil quando alguém te paga direto).
- Botão para copiar o WhatsApp/e-mail do usuário e avisar que foi liberado.

## 2. Uso diário mais rápido

- **Repetir o último dia**: botão no Início que abre um novo lançamento já preenchido com cidade, valor da diária e dados do dia anterior — só ajustar pacotes e KM.
- **Lançamento de hoje em destaque**: se o dia ainda não foi lançado, o Início mostra um aviso "Você ainda não lançou hoje" com atalho direto.
- **Folga em um toque**: marcar o dia como folga sem abrir o formulário inteiro.
- **Resumo da semana** no Início: quanto trabalhou, gastou e o lucro dos últimos 7 dias.
- **Lembrete diário** (para quem tem o app no celular com notificações ligadas): aviso no fim do dia para registrar o lançamento.
- Ajustes de velocidade: as telas de Início, Histórico e Recebimentos passam a reaproveitar os dados já carregados, evitando recarregar tudo a cada troca de tela.

## 3. Fora do escopo agora

Cobrança automática por cartão/assinatura fica para depois, já que a liberação continua manual.

## Detalhes técnicos

- Painel admin: contador de pendentes via consulta a `solicitacoes_premium` (status `pendente`); visualização do comprovante com URL assinada do bucket `comprovantes`; liberação manual grava/atualiza `usuarios_premium` respeitando a mesma regra de validade do gatilho `activate_premium_on_approval`, feita por função de servidor autenticada que confirma o papel de admin antes de usar acesso privilegiado.
- Início: novos cálculos derivados de `lancamentos` reusando `src/lib/calc.ts`; nenhuma alteração nas fórmulas existentes.
- "Repetir último dia": pré-preenchimento do formulário via parâmetros de rota, sem alterar o esquema do banco.
- Lembrete diário: novo tipo no registro de notificações, incluído na varredura do cron já existente, com preferência ligável em `/perfil/notificacoes`.
- Cache: uso de `queryClient` com chaves por usuário e `staleTime` curto nas telas citadas.
