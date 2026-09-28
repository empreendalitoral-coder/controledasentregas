# Moderação direta de mensagens da Comunidade

## Objetivo
Permitir que o administrador modere qualquer mensagem diretamente na Comunidade, com duas opções distintas: ocultar com histórico ou excluir definitivamente.

## Experiência do administrador
- Mostrar o menu de moderação somente para administradores, em cada mensagem do canal, inclusive mensagens sem denúncia.
- Oferecer **Ocultar pela moderação**: pedir o motivo, exigir confirmação e substituir o conteúdo visível pelo aviso “Mensagem removida pela moderação”.
- Oferecer **Excluir definitivamente** apenas após uma confirmação reforçada, deixando claro que a ação não poderá ser desfeita.
- Disponibilizar as mesmas ações na área **Admin > Comunidade**, inclusive para mensagens que ainda não receberam denúncia.
- Atualizar o chat em tempo real após qualquer ação e mostrar confirmação ou erro claro.

## Segurança e histórico
- Executar as duas ações no banco por uma operação protegida que identifica o administrador pela sessão autenticada; nenhum identificador de administrador enviado pela tela será aceito.
- Manter um registro administrativo com a mensagem original, autor, motivo, tipo de ação e data.
- Na ocultação, retirar o texto original da linha que os participantes conseguem consultar, evitando que ele permaneça acessível fora da interface.
- Na exclusão definitiva, remover a mensagem principal e tratar respostas e denúncias relacionadas sem deixar referências quebradas.
- Preservar as regras atuais de acesso Premium, confirmação de e-mail, bloqueios, denúncias e suspensões.

## Técnica
- Criar uma função administrativa para ocultação e exclusão definitiva, com validação de administrador no banco e execução atômica.
- Criar o histórico de moderação com acesso exclusivo de administradores e da operação protegida.
- Ajustar respostas que guardam uma prévia para que conteúdo removido não continue aparecendo nelas.
- Manter a exclusão comum como padrão recomendado e destacar a exclusão definitiva como ação excepcional.

## Validação
- Confirmar que um administrador consegue ocultar e excluir diretamente pelo chat e pela área de moderação.
- Confirmar que um usuário comum não vê os controles e não consegue chamar as operações diretamente.
- Verificar que o conteúdo ocultado não aparece nas mensagens nem nas prévias de respostas.
- Verificar o registro administrativo das duas ações e o comportamento das denúncias e respostas após exclusão definitiva.
- Testar no celular e no computador, incluindo atualização em tempo real e confirmações.
