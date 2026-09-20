# Remover completamente a análise inteligente

## Objetivo
Retirar do Entrega Pro toda a função que analisa observações, mantendo o campo de observação comum e a tela de diagnóstico do aplicativo.

## Alterações
- Remover do Novo Lançamento o botão **Analisar observação**, o estado de carregamento e o quadro com resumo, categorias, prioridade e recomendações.
- Manter o campo **Observação** funcionando normalmente para digitar, salvar e editar anotações.
- Excluir a função de servidor responsável pela análise e o conector de IA criado exclusivamente para ela.
- Remover os pacotes de IA que deixarem de ser usados no restante do projeto.
- Atualizar o acompanhamento da entrega para registrar que a análise foi removida por decisão do produto.

## Validação
- Confirmar que não restaram textos, botões, chamadas ou arquivos ligados à análise inteligente.
- Verificar que criar e editar um lançamento com observação continua funcionando.
- Verificar no celular que o campo de observação e o restante do formulário continuam organizados.
- Confirmar a compilação sem erros.

## Fora do escopo
- A tela **Diagnóstico do aplicativo** continuará disponível em **Mais > Dados**.
- Nenhum cálculo financeiro, registro existente, banco de dados ou permissão será alterado.
