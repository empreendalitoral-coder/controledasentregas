# Corrigir a soma duplicada de diárias e quinzenas

## Correção
- No relatório **CNPJ/MEI**, contar a receita das rotas pelas diárias, uma única vez. O recebimento da quinzena não será acrescentado como outra receita.
- Manter **contas e Pix no CPF**, automaticamente e sem classificação manual.
- Preservar os registros de recebimento, datas de pagamento e situação pago/pendente; nenhum dado será apagado.
- Aplicar a mesma regra aos totais mensais e anuais, à lista do relatório e às exportações PDF e CSV.
- Não alterar o cálculo de lucro operacional nem o fechamento por período baseado nas diárias.

## Conferência
- Conferir o período em que apareceu o valor alto antes de comparar os totais corrigidos.
- Testar o exemplo: diárias de R$ 1.000 e quinzena de R$ 1.000 devem resultar em **R$ 1.000 de receita CNPJ**, não R$ 2.000.
- Testar períodos sem recebimento e pagamentos feitos em outro mês, garantindo que a receita das rotas continue na data das diárias.
- Verificar o relatório e downloads com uma conta que tenha acesso Premium, sem alterar assinaturas para testar. Se esse acesso não estiver disponível, informar a limitação.

## Detalhes técnicos
- A leitura confirmou que o agregador inclui entradas de `lancamentos.valor_dia` e de `recebimentos.valor_recebido`, e o relatório fiscal soma ambas. A consulta da conta administrativa em 2026 encontrou valores nas duas fontes; o período exato relatado ainda precisa ser conferido.
- Separar explicitamente a finalidade dos dados: o relatório fiscal solicitado usa diárias como fonte da receita de trabalho; recebimentos continuam sendo acompanhamento do pagamento.
- O Fluxo de Caixa usa o mesmo agregador: conferir esse caminho e evitar que o dinheiro previsto nas diárias seja somado novamente ao pagamento. Para entradas do trabalho nessa tela, usar os recebimentos efetivos, não diárias como dinheiro recebido.
- Criar testes contra dupla contagem e manter intactos os cálculos operacionais e a separação automática CNPJ/CPF.
- Publicação somente após autorização.