# Comunidade Entrega Pro

## Objetivo
Criar uma comunidade gratuita e em tempo real para usuários cadastrados, liberada somente após a confirmação do e-mail, com proteção contra links, spam e abuso.

## O que será entregue
- Ajustar o cadastro para aguardar a confirmação por link, mostrar uma tela clara de “verifique seu e-mail” e permitir reenvio.
- Criar a tela **Comunidade** com canal geral, mensagens em tempo real, respostas e identificação pública pelo nome do perfil.
- Mostrar as regras antes da primeira participação e manter um acesso permanente às regras.
- Bloquear links, convites, domínios e tentativas comuns de disfarce antes da publicação e também no servidor.
- Aplicar limite de frequência e tamanho das mensagens para reduzir spam.
- Permitir denunciar mensagens e bloquear participantes; usuários bloqueados deixam de aparecer para quem os bloqueou.
- Criar uma área administrativa para revisar denúncias, remover mensagens e suspender participantes da Comunidade.
- Adicionar acesso à Comunidade na tela Mais e indicar mensagens recentes.

## Regras da primeira versão
- Acesso gratuito para contas com e-mail confirmado.
- Um único canal geral; sem mensagens privadas, arquivos, áudio ou vídeo.
- E-mail, telefone e demais dados pessoais não serão exibidos.
- Nenhum link será permitido.
- Mensagens removidas pela moderação deixam um aviso no lugar do conteúdo.

## Segurança e dados
- As permissões serão aplicadas no banco, não somente na tela.
- O autor será sempre obtido da conta autenticada; não será aceito um identificador enviado pelo navegador.
- A comunidade terá registros separados para mensagens, denúncias, bloqueios, suspensões e aceite das regras.
- A atualização em tempo real respeitará as mesmas permissões de leitura.

## Validação
- Testar cadastro sem confirmação, confirmação e entrada posterior.
- Testar publicação, resposta, bloqueio de links, limite de spam, denúncia e moderação.
- Verificar a experiência em celular e computador, além da compilação e dos erros da tela.
