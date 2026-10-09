# Teste grátis de 3 dias

## Mudança
- Conceder **3 dias de Premium grátis somente aos novos cadastros**.
- Preservar integralmente a validade dos testes e assinaturas das contas existentes.
- Atualizar cadastro, Termos e Suporte para informar 3 dias.
- Manter preços, cálculos, indicações e regras da Comunidade sem alterações.

## Detalhes técnicos
- O cadastro atualmente concede 15 dias diretamente na função `handle_new_user`; a configuração de novos cadastros também está em 15 dias.
- Atualizar a configuração para 3 por operação de dados e ajustar a função de cadastro por migração para usar essa configuração, preservando a criação de perfil, papel e vínculo de indicação.
- Não atualizar registros existentes em `usuarios_premium`.
- Conferir a opção de teste na aprovação administrativa para não anunciar 15 dias quando conceder o novo prazo; planos mensal e anual permanecem iguais.

## Validação
- Verificar que um novo cadastro recebe exatamente 3 dias e mantém o vínculo de indicação quando aplicável.
- Comparar as validades das contas existentes antes e depois para garantir que não mudaram.
- Conferir os textos e executar os testes relacionados.
- A mudança no cadastro entra em vigor ao ser aplicada; os textos atualizados precisam de publicação posterior, mediante autorização.