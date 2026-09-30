# Anonimato Premium na Comunidade

## Objetivo
Adicionar uma configuração fixa para que assinantes Premium publiquem novas mensagens como **“Anônimo”**, sem nome nem foto. Mensagens antigas não serão alteradas. A equipe administrativa continuará conseguindo identificar a conta responsável para moderar abusos.

## Experiência do motorista
- Adicionar na própria tela da Comunidade uma opção **“Falar como anônimo”**, com etiqueta PRO e explicação curta.
- A preferência permanece ativa até o motorista desligá-la.
- Quando ativa e o Premium estiver válido, novas mensagens mostram “Anônimo” e um avatar neutro.
- Respostas a mensagens anônimas também mostram “Anônimo” na referência, sem revelar o nome original.
- Quem não tem Premium vê a opção bloqueada e pode abrir a tela de planos.
- Se o Premium vencer, novas mensagens voltam automaticamente ao perfil normal; a preferência não concede acesso indevido.

## Privacidade e segurança
- Aplicar a regra no banco, não apenas na tela: somente Premium válido pode publicar anonimamente.
- Guardar internamente a conta real para denúncias, bloqueios, suspensões e moderação.
- Entregar aos participantes uma versão protegida das mensagens, sem o identificador real do autor quando a mensagem for anônima.
- Ajustar atualização em tempo real para apenas avisar sobre mudanças e recarregar a versão protegida, evitando que o evento exponha dados internos.
- Criar ações seguras por mensagem para denunciar e bloquear; o banco identifica o autor real sem enviá-lo aos demais participantes.
- Administradores continuam vendo a identidade real na área de moderação, inclusive no histórico administrativo.
- Manter bloqueio de links, limites contra spam, regras, suspensões e acesso Premium já existentes.

## Dados e comportamento
- Salvar a preferência fixa no cadastro da Comunidade.
- Registrar em cada nova mensagem se ela foi enviada anonimamente, preservando o estado daquele momento.
- Não modificar mensagens já publicadas ao ligar ou desligar a opção.
- Mensagens normais continuam exibindo o nome e a foto existentes.
- Bloqueios continuam valendo contra a conta real, mesmo quando ela publica anonimamente.

## Validação
- Testar Premium ligando e desligando o modo anônimo e confirmar que apenas novas mensagens mudam.
- Testar conta sem Premium e Premium vencido para garantir que não publiquem anonimamente.
- Confirmar que outro participante não recebe nome, foto ou identificador real em consultas e atualizações ao vivo.
- Confirmar que respostas, denúncias, bloqueios e moderação funcionam com mensagens anônimas.
- Validar no celular e no computador, além de conferir compilação, permissões e histórico administrativo.

## Detalhes técnicos
- Migração para preferência em `community_members`, marca de anonimato em `community_messages` e funções de leitura/ações com dados sanitizados.
- O gatilho de envio consulta o Premium no momento da publicação e grava os campos públicos como “Anônimo”/sem foto quando permitido.
- A leitura comum deixa de depender de acesso direto aos dados internos da mensagem; a leitura administrativa mantém acesso controlado por função/política de administrador.
- Atualizar os tipos gerados e registrar a decisão de arquitetura do anonimato seguro.
