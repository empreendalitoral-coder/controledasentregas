# Novo visual da tela Início

Objetivo: deixar a tela Início mais bonita e organizada, e fazer o Premium chamar a atenção de quem ainda não assina — sem mexer em nenhum cálculo, dado ou regra do app.

## Como a tela vai ficar

Blocos de tamanhos diferentes (um destaque grande com blocos menores ao redor), na seguinte ordem:

1. **Saudação + perfil** — linha enxuta no topo com foto, nome, transportadora e placa.
2. **Bloco destaque "Lucro do mês"** — o número grande da tela, com a barra de meta logo abaixo e a porcentagem em destaque. É o primeiro que o olho bate.
3. **Faixa "Hoje"** — quando o dia ainda não foi lançado, os três atalhos (Lançar hoje, Repetir último dia, Marcar folga) ficam em botões maiores e com mais contraste.
4. **Grade de números** — dias trabalhados, pacotes, horas, KM, combustível, bruto, insucessos, PNR, perdidos, folgas, em blocos compactos com ícone e o número grande.
5. **Últimos 7 dias** — bloco horizontal com os quatro números principais e o lucro da semana.
6. **Próximo recebimento** — mantém o alerta vermelho de atraso e o valor líquido previsto em destaque.
7. **Convite Premium** — bloco novo, só para quem ainda não é Premium.

## O convite ao Premium

Um bloco largo, dourado, com brilho suave e leve animação de entrada, mostrando:
- Título curto ("Desbloqueie a Central Financeira")
- Três ganhos em uma linha cada: fechamento por quinzena, relatórios em PDF, controle de contas e cartões
- Preço em destaque e botão "Começar agora"
- Para quem está no teste, mostra os dias restantes com uma barra fina

Nos blocos que são exclusivos do Premium (relatórios, gráficos avançados) entra uma etiqueta "PRO" dourada, igual à já usada na tela Mais.

## Cores e letras

- Base escura atual mantida; o dourado passa a ser usado **só** no que leva ao Premium e nas ações principais, para ele voltar a ter peso.
- Verde para lucro, vermelho/laranja para atraso e descontos — sem mudança de significado.
- Fontes: títulos em Outfit, textos em Figtree, carregadas no topo do app.

## Detalhes técnicos

- Alterações apenas em `src/routes/_authenticated/index.tsx` (composição/JSX) e `src/styles.css` (tokens, utilitários `ep-bento-*`, `ep-premium-cta`, `ep-metric`).
- Fontes carregadas via `<link>` em `src/routes/__root.tsx` e registradas com `--font-display` / `--font-sans` em `@theme`.
- Nenhuma mudança em `src/lib/calc.ts`, `src/lib/store.ts`, banco de dados, RLS ou lógica de Premium; o bloco de convite usa o `usePremium()` que já existe.
- Grade responsiva pensada para 360px de largura; nada de rolagem lateral.
- Metadados (title/description/canonical) da rota permanecem como estão.

Escopo: somente a tela Início. As demais telas ficam como estão e podem receber o mesmo estilo depois.
