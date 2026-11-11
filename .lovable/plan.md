# Salas do bate-papo por estado (para o futuro)

Plano guardado para fazer depois. Nada muda no app agora.

## Como vai funcionar
- O bate-papo ganha uma lista de salas: **Brasil (geral)** e uma sala para cada estado (SP, RJ, MG...).
- O motorista escolhe livremente qualquer sala e pode trocar quando quiser. O app lembra a última sala aberta.
- Cada sala mostra só as mensagens dela. As mensagens que já existem ficam na sala Brasil.
- Regras atuais continuam iguais em todas as salas: sem links, fotos só para Premium, anonimato Premium, denúncias, bloqueios e moderação do Admin.
- Acesso Premium da Comunidade continua com a mesma regra de hoje.
- No Admin, a moderação mostra de qual sala veio cada mensagem.

## Sugestão para quando fazer
Com poucos usuários, salas por estado podem ficar vazias. Sugiro ativar quando houver uns 50 motoristas usando o chat, ou começar só com os estados que tiverem mais gente.

## Detalhes técnicos
- Nova coluna `room` (texto, padrão `'BR'`) em `community_messages`; mensagens antigas ficam `'BR'`. Validar no trigger `prepare_community_message` que a sala é `BR` ou uma UF válida.
- `get_community_messages(_room text default 'BR')` filtra por sala, mantendo a sanitização atual.
- Realtime: filtrar eventos pela sala aberta no cliente.
- Seletor de sala no topo de `/comunidade`, última sala salva localmente.
- Índice `(room, created_at)`. Testes de filtro por sala.
