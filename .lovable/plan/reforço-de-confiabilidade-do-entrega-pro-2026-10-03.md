# Reforço de confiabilidade do Entrega Pro

## Objetivo
Evitar que o motorista perca registros ou receba uma confirmação falsa quando a internet estiver instável, além de corrigir falhas confirmadas nas notificações e no encerramento da sessão.

## Implementação

### 1. Corrigir notificações de recebimento
- Atualizar o aviso “Recebimento próximo” para usar os campos reais: período, data de pagamento e valor recebido quando disponível.
- Manter o aviso útil mesmo quando o valor ainda não tiver sido informado.
- Registrar falhas do processamento de forma clara para o administrador identificar problemas.

### 2. Tornar salvamentos críticos seguros
- Nos lançamentos e no perfil, aguardar a confirmação real do salvamento antes de mostrar sucesso ou mudar de tela.
- Bloquear envios repetidos enquanto a operação estiver em andamento.
- Em falha de conexão, manter os dados preenchidos na tela e oferecer “Tentar novamente”, sem fingir que foram salvos.
- Aplicar o mesmo padrão às exclusões e alterações financeiras que hoje ignoram erros retornados.

### 3. Avisar sobre conexão instável
- Mostrar um aviso discreto quando o aparelho estiver sem internet e informar quando a conexão voltar.
- Não prometer salvamento offline nesta etapa: ações que precisam da internet permanecerão preenchidas até o usuário tentar novamente.
- Preparar uma etapa futura separada para fila offline e sincronização, pois isso exige regras de conflito para não duplicar valores financeiros.

### 4. Proteger backup e restauração
- Validar completamente formato, tamanho, tipos e limites do arquivo antes de iniciar a restauração.
- Executar a restauração como uma única operação: ou todos os registros entram, ou nenhum entra.
- Só remover dados antigos do aparelho depois da confirmação integral da migração.
- Informar claramente quantos registros foram restaurados e impedir importações parciais ou duplicadas por toque repetido.

### 5. Limpar notificações ao sair
- Remover com segurança o token deste aparelho antes de encerrar a sessão.
- Se a limpeza falhar por falta de internet, encerrar a sessão sem expor dados e marcar o token para limpeza posterior.

### 6. Criar testes essenciais
- Cobrir cálculos de lucro, horas, quilômetros, períodos e totais financeiros.
- Cobrir validação e restauração de backup.
- Cobrir a notificação de recebimento e os principais estados de falha de salvamento.

## Validação
- Testar sucesso, internet indisponível, resposta lenta e erro do banco nos principais salvamentos.
- Confirmar que nenhuma tela navega ou mostra sucesso antes da gravação.
- Validar backup íntegro, arquivo inválido e falha simulada no meio da restauração.
- Conferir saída da conta e notificações em celular e computador.

## Limites desta etapa
- Não alterar cálculos, preços, permissões Premium, regras da Comunidade ou visual geral.
- Não implementar sincronização offline completa nesta etapa; ela será planejada separadamente para evitar duplicações e conflitos de dados.
