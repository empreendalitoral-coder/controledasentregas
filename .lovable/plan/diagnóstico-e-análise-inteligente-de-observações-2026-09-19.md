# Diagnóstico e análise inteligente de observações

## Objetivo
Adicionar duas melhorias sem alterar os cálculos financeiros existentes nem gravar dados durante os testes de diagnóstico.

## Entregas
- Criar uma tela de **Diagnóstico do aplicativo**, acessível em **Mais > Dados**, com verificações de:
  - integridade dos cálculos usando cenários conhecidos;
  - carregamento e consistência dos dados da conta;
  - criação e leitura segura do arquivo de backup;
  - compatibilidade do backup com a importação, sem restaurar ou duplicar registros;
  - resumo final com falhas destacadas e opção de executar novamente.
- Aproveitar o campo de observação livre já existente no lançamento e adicionar a ação **Analisar observação**.
- Exibir o resultado organizado em **problemas identificados, categorias e ações recomendadas**.
- Manter a análise sob ação do motorista para evitar uso e cobrança automática enquanto ele digita.
- Mostrar mensagens reais de configuração, créditos, bloqueio ou indisponibilidade da análise, preservando o texto digitado.

## Detalhes técnicos
- O diagnóstico será somente leitura: não chamará restauração, exclusão ou gravação no banco.
- A análise usará Lovable AI no servidor, com o modelo `openai/gpt-6-astra`, resposta estruturada e streaming interno.
- A função será protegida pela sessão da conta; a chave do serviço permanecerá apenas no servidor.
- O resultado ficará visível no formulário atual e poderá ser gerado novamente quando a observação mudar; não será criada nova tabela nesta etapa.
- Serão adicionados os pacotes oficiais da AI SDK necessários para a chamada.
- A validação final incluirá compilação, teste real da análise e revisão visual no celular.
