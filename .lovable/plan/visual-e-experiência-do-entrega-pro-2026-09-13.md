# Visual e experiência do Entrega Pro

## Objetivo

Deixar as telas restantes com o mesmo acabamento premium da nova tela Início, melhorar a navegação no celular e substituir interações antigas por experiências claras e seguras. Não haverá mudança em cálculos financeiros, planos, permissões ou estrutura do banco.

## 1. Padronizar a estrutura do aplicativo

- Refinar cabeçalhos, espaçamento, hierarquia visual e navegação inferior para manter consistência entre as telas.
- Remover o botão de menu sem ação do cabeçalho e transformar o sino em um acesso real às notificações.
- Manter Outfit nos títulos, Figtree nos textos, base escura e dourado reservado para Premium e ações principais.
- Garantir textos completos, áreas de toque confortáveis e ausência de rolagem lateral em celulares pequenos.

## 2. Modernizar as telas restantes

- Atualizar **Mais** com grupos claros para Conta, Trabalho, Financeiro, Dados e Suporte, preservando todos os atalhos existentes.
- Modernizar **Admin — Usuários, Solicitações e Configurações** com busca, indicadores, estados de carregamento/vazio/erro, cartões mais fáceis de ler e ações organizadas.
- Aplicar o mesmo padrão visual nas telas operacionais ainda antigas: **Abastecimentos, Manutenção, Recebimentos e Resumo**.
- Preservar a tela Início e a tela Gráficos já modernizadas, fazendo apenas ajustes de consistência quando necessário.

## 3. Melhorar confirmações e ações

- Substituir caixas antigas do navegador por diálogos internos para excluir registros, remover dispositivos, apagar histórico, desativar Premium e enviar avisos.
- Usar confirmação reforçada para “Apagar todos os dados”, mantendo as duas etapas de segurança.
- Substituir o campo improvisado de validade Premium por um seletor de data dentro do aplicativo.
- Mostrar progresso durante ações e mensagens claras de sucesso ou falha, evitando toques repetidos.

## 4. Revisão final no celular

- Verificar as principais telas no tamanho atual de 360 × 651 e também em desktop.
- Testar navegação, diálogos, formulários, busca e ações administrativas sem alterar suas regras atuais.
- Corrigir cortes, sobreposições, botões sem resposta e diferenças visuais encontradas na revisão.

## Detalhes técnicos

- Reutilizar os tokens e utilitários visuais existentes em `src/styles.css`, sem cores soltas nas páginas.
- Criar componentes pequenos e reutilizáveis para cabeçalhos de seção, estados vazios, carregamento e confirmação.
- Usar os controles existentes do projeto para botões e ações; nenhum novo pacote visual é necessário.
- Escopo estritamente de apresentação e interação: sem migração, sem alteração de RLS, sem mudança nas fórmulas e sem trabalho de Play Store.
