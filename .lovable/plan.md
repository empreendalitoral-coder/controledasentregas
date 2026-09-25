# Comunidade Premium com ativação futura

## Objetivo
Manter a Comunidade gratuita enquanto ela cresce e deixar pronta uma mudança manual para o Premium. Quando a cobrança for ativada, quem já participava terá 30 dias gratuitos de transição.

## Comportamento
- A Comunidade continuará gratuita e funcionando como hoje até o administrador ativar a cobrança.
- Adicionar em **Admin > Configurações** um controle claro de “Comunidade no Premium”, mostrando o estado atual.
- A ativação exigirá confirmação e registrará automaticamente a data de início.
- Participantes que já tiverem aceitado as regras antes da ativação continuarão acessando por 30 dias.
- Novos participantes após a ativação precisarão de Premium desde o primeiro acesso.
- Administradores continuarão com acesso para moderação.
- Durante a transição, mostrar quantos dias gratuitos restam e um acesso aos planos.
- Depois do prazo, mostrar uma tela de bloqueio explicando que a Comunidade faz parte do Premium, sem apagar mensagens, denúncias ou bloqueios.
- Identificar a Comunidade com a etiqueta **PRO** na tela Mais somente depois que a cobrança estiver ativa.

## Segurança e regras
- Aplicar a liberação no banco, não apenas na tela: leitura, envio, respostas e denúncias obedecerão à mesma regra de acesso.
- Preservar confirmação de e-mail, aceite das regras, bloqueio de links, limites contra spam, suspensões e moderação existentes.
- A primeira ativação define o início da transição; desligar e ligar novamente não reinicia os 30 dias.
- O status Premium continuará usando o plano atual do Entrega Pro, sem criar uma cobrança separada nesta etapa.

## Técnica
- Acrescentar às configurações globais o estado da cobrança e a data da primeira ativação, com padrão gratuito.
- Atualizar as funções e políticas da Comunidade para autorizar: modo gratuito, administrador, Premium válido ou participante antigo dentro dos 30 dias.
- Fazer a alteração administrativa registrar a data no banco e proteger a operação pelas permissões administrativas existentes.
- Exibir no aplicativo os estados gratuito, transição, Premium ativo e bloqueado.

## Validação
- Confirmar que nada muda enquanto a cobrança estiver desativada.
- Testar participante antigo dentro e depois dos 30 dias, novo participante, assinante Premium e administrador.
- Testar leitura, envio, resposta e denúncia em cada estado.
- Verificar a tela Mais, a página da Comunidade e a configuração administrativa no celular e no computador.
