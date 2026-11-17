# Diagnóstico do aplicativo

## Melhorias para atrair motoristas (plano aprovado)
- [x] Resumo mensal em imagem com entregas, taxa e lucro opcional (oculto inicialmente), compartilhamento e link de indicação; download e abertura do WhatsApp conferidos com dados reais, celular/desktop sem erros, 75 testes aprovados. Compartilhamento nativo no WhatsApp depende de aparelho compatível e não foi exercitado; não publicado.
- [ ] Lembrete diário com horário escolhido e sequência de dias lançados.
- [ ] Fortalecer página pública e destacar calculadora gratuita; depoimentos dependem de frases reais do usuário.
- [x] Selos pessoais de 100, 500 e 1.000 entregas no Feed, derivados dos dias trabalhados e entregas bem-sucedidas; limites conferidos em cinco testes, mais oito testes de cálculo. Conta autenticada mostrou 14.313 entregas e três selos após recarregar; celular/computador sem erros ou transbordamento. Publicado em 17/11/2026 com 80 testes aprovados.
- [ ] Destacar lucro do mês/comparação e confirmação de salvamento no Início.

## Feed com duração de 24 horas
- [x] Substituir limpeza que falha por exclusão autenticada de fotos e posts; tarefa SQL antiga pausada.
- [x] Informar a duração no Feed e testar: limpeza autenticada excluiu 2 posts vencidos e fotos, chamada sem credencial retornou 401; telas desktop/celular verificadas.
- [x] Configurar limpeza autenticada por hora com agendamento gerenciado; entrará em funcionamento no site após publicação.
- [x] Publicação solicitada com autorização do usuário em 15/11/2026 para meuentregapro.app; conclusão da implantação e primeira execução agendada ainda não verificadas.

## Correções da verificação completa de segurança
- [x] Corrigir execução de HTML no relatório e registro de dispositivos com o cliente do proprietário; testes incluídos nos 68 aprovados.
- [x] Invalidar a credencial antiga dos agendamentos sem executar envios ou exclusões; ambas as tarefas rejeitaram pedidos inválidos com 401.
- [x] Aplicar no banco as restrições Premium já existentes nas telas financeiras e na restauração; sete políticas restritivas conferidas.
- [x] Substituir links temporários de fotos por downloads autenticados; Feed conferido com fotos locais, telas autenticadas sem erros e sem transbordamento no celular.
- [x] Remover somente a conta fixa fictícia da revisão anterior e executar os 68 testes de regressão; prévia compilada com sucesso.
- [ ] Testar bloqueio com conta real sem Premium — aguarda escolha/autorização da conta pelo usuário; não alterar assinaturas existentes.
- [x] Concluir nova revisão aprofundada — resultado de 16/11 conferido em 17/11/2026: resta o alerta da credencial antiga, invalidada no banco de produção (comparação retornou false); quatro testes de autenticação aprovados. Catálogo de notificações mantém aviso leve por ser compartilhado.
- [x] Publicar correções — publicação confirmada na conversa anterior; nenhuma nova alteração no aplicativo nesta revisão.

# Varredura de erros

- [x] Revisar notificações e tarefas automáticas sem envios ou exclusões reais
- [x] Corrigir falhas confirmadas: campos de metas, propagação de erros, avisos parciais, proteção contra exclusão parcial; testes com respostas simuladas
- [x] Conferir preferências autenticadas e corrigir atalhos do perfil; salvamento validado, sem avisos reais nem publicação.

- [x] Revisar carregamento, salvamentos e falhas de conexão
- [x] Corrigir edição vazia após carregamento, falhas silenciosas financeiras e confirmações; acrescentar 3 testes de regressão
- [x] Conferir navegação, criar/editar/excluir lançamento, preservar campos após falha de conexão, confirmar/excluir recebimento e pagar/excluir conta com a conta autenticada
- [x] Conferir segurança: sem achados críticos, apenas leitura autenticada do catálogo de tipos de notificação; sem publicação. Notificações externas e tarefas agendadas não exercitadas nesta revisão

# Teste grátis reduzido

- [x] Aplicar 3 dias em novos cadastros sem alterar validades existentes
- [x] Atualizar cadastro, Termos, Suporte e opção administrativa de teste
- [x] Conferir configuração de 3 dias, textos e preservação das 13 validades existentes; 24 testes passaram; não publicado

# Programa de indicações

- [x] Criar atribuição no cadastro e comissão única com liberação após 7 dias
- [x] Criar saldo, reserva e solicitações de Pix ou desconto a partir de R$ 10
- [x] Integrar aprovação administrativa, desconto e estorno por reembolso
- [x] Testar regras, segurança e telas sem publicar; remover registros temporários; 24 testes passaram

- [x] Criar diagnóstico seguro de cálculos, dados locais e backups
- [x] Adicionar acesso ao diagnóstico na tela Mais
- [x] Remover completamente a análise inteligente das observações
- [x] Validar compilação e visual no celular após a remoção

# Comunidade em tempo real

- [x] Exigir confirmação por link no e-mail antes do primeiro acesso
- [x] Criar comunidade gratuita para usuários cadastrados e confirmados
- [x] Bloquear links e limitar spam nas mensagens
- [x] Adicionar regras, respostas, denúncias e bloqueio de participantes
- [x] Adicionar moderação administrativa
- [x] Validar funcionamento no celular e no computador

# Comunidade Premium com ativação futura

- [x] Adicionar ativação manual sem reiniciar o prazo de transição
- [x] Aplicar acesso gratuito, Premium, administrador e transição de 30 dias no banco
- [x] Adicionar controle administrativo com confirmação
- [x] Mostrar transição, bloqueio e acesso aos planos na Comunidade
- [x] Exibir a etiqueta PRO na tela Mais somente após a ativação
- [x] Validar os estados de acesso no banco, celular e computador

# Moderação direta da Comunidade

- [x] Criar ocultação com motivo e histórico administrativo
- [x] Criar exclusão definitiva com confirmação reforçada
- [x] Adicionar ações diretas no chat e na área administrativa
- [x] Validar permissões, histórico, celular e computador

# Anonimato Premium na Comunidade

- [x] Proteger a identidade pública e preservar a identificação administrativa
- [x] Adicionar a preferência fixa de anonimato para assinantes Premium
- [x] Adaptar respostas, bloqueios e atualizações ao vivo para mensagens anônimas
- [x] Validar no celular e computador e publicar

# Preços do Premium

- [x] Corrigir o valor mensal para R$ 9,90 na tela inicial e nos Termos
- [x] Corrigir o valor anual para R$ 69,90 na tela inicial e nos Termos
- [x] Validar e publicar os valores corrigidos

# Reforço de confiabilidade

- [x] Corrigir notificações de recebimento com os campos reais
- [x] Aguardar confirmação antes de mostrar sucesso em lançamentos, perfil e exclusões financeiras
- [x] Avisar quando a conexão cair e quando voltar
- [x] Validar backups e restaurar todos os registros em uma única operação
- [x] Remover o token de notificações deste aparelho antes de sair
- [x] Criar e executar os testes essenciais
- [x] Validar os fluxos principais no celular e computador

# Multas e chat moderno

- [x] Criar multas com acesso individual e restauração atômica
- [x] Integrar multas aos registros, menus e backups
- [x] Renovar conversa e destacar Chat na navegação
- [x] Testar multas e backup de ponta a ponta; envio, links e moderação; telas no celular e computador

# Separação CNPJ e CPF

- [x] Corrigir dupla contagem: diárias no fiscal, recebimentos no caixa; 12 testes passaram e total fiscal conferido com diárias reais da conta disponível

- [x] Substituir classificação manual por separação automática: trabalho no CNPJ/MEI, contas e Pix no CPF
- [x] Separar totais mensais/anuais e exportação por CNPJ e CPF no Relatório MEI
- [x] Remover seletores manuais e pendências de classificação
- [x] Validar separação automática com registros reais de rota, Pix e conta; limpar os testes
- [x] Validar tela e downloads de relatórios com conta autenticada autorizada: PDF e CSV baixados; sem alterar validade Premium

## Próximos
- [x] Tela de métricas de crescimento (admin)
- [x] Envio de notas/recibos com leitura por IA, revisão antes de salvar, edição/exclusão e tabela exportável CSV; recibo fictício lido e fluxo autenticado validado. Somente dados extraídos são guardados, sem documento original e sem integrar ao lucro ou relatório fiscal. Não publicado.

- [x] Salas do bate-papo por estado (Brasil + UFs, escolha livre) — implementadas, testadas e publicadas conforme solicitação posterior.
