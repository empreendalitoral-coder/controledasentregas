# Multas e Comunidade mais visível

## 1. Lançamento de multas
- Criar a tela **Multas**, acessível em **Mais**, disponível para usuários cadastrados sem uma nova cobrança.
- Registrar data, valor, descrição/local opcional e situação **Pendente** ou **Paga**.
- Permitir adicionar, editar, marcar como paga e excluir com confirmação dentro do app.
- Mostrar lista por data, filtros Todas/Pendentes/Pagas e totais separados por situação.
- Confirmar salvamentos somente após sucesso; manter os campos preenchidos caso haja falha.
- Não incluir pontos na CNH, vencimentos, lembretes ou alterações no lucro e nos relatórios financeiros nesta etapa.

## 2. Atalho fixo para o chat
- Dar à Comunidade um ícone de conversa e o nome curto **Chat** na barra inferior.
- Manter cinco atalhos para evitar botões apertados: **Início, Histórico, Receb., Chat e Mais**.
- Mover o acesso direto a **Gráficos** para Mais, mantendo Gráficos e Resumo disponíveis.
- Destacar Chat somente quando a Comunidade estiver aberta, sem marcar Mais ao mesmo tempo.
- Manter o atalho visível mesmo quando o acesso estiver condicionado ao Premium; ao abrir, exibir a situação real de acesso.

## 3. Visual de mensageiro moderno
- Renovar somente a tela da Comunidade, preservando a identidade do Entrega Pro e seu tema escuro.
- Diferenciar claramente mensagens próprias e recebidas com balões de alto contraste, nomes legíveis, avatares redondos e horários discretos.
- Separar conversas por dia e melhorar a apresentação das respostas citadas.
- Dar prioridade à conversa: deixar regras e opção de anonimato em controles compactos e acessíveis, sem eliminar suas informações.
- Ajustar o campo de mensagem e o botão de enviar para permanecerem acessíveis acima da navegação, inclusive com o teclado aberto.
- Não acrescentar mensagens privadas, IA, anexos, contagem fictícia de participantes nem indicadores de leitura/online.

## 4. Preservação e testes
- Preservar bloqueio de links, regras, denúncias, bloqueios, moderação e anonimato exclusivo do Premium.
- Incluir multas na exportação e restauração de backups; aceitar backups antigos que não contêm multas.
- Testar criar, editar, pagar e excluir uma multa, além de restaurar seu backup sem deixar registros de teste.
- Conferir o chat com mensagens próprias, recebidas e anônimas; verificar envio, resposta e menus sem mudar as regras.
- Validar telas e navegação no celular e computador, incluindo teclado e textos longos.
- Publicação somente após aprovação específica.

## Detalhes técnicos
- Criar a rota autenticada `/multas` com metadados próprios e persistência na Lovable Cloud.
- Criar tabela de multas com validação de valores, proprietário autenticado, permissões explícitas e políticas que isolem os registros de cada usuário.
- Integrar multas ao estado existente, limpeza dos dados e mecanismos de backup; ampliar a restauração autenticada `restore_entrega_pro_backup` mantendo a transação única.
- Usar os componentes e tokens semânticos existentes para os controles e estilos. O chat é entre participantes, não um assistente de IA; não adicionar integração de modelos nem substituir o transporte atual.
- Manter a leitura sanitizada por `get_community_messages`, acesso por `get_community_access_status` e moderação por `moderate_community_message`.
