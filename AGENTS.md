# AGENTS.md

Instruções para qualquer agente de IA (Antigravity/Gemini, e qualquer outro que
venha a ler este arquivo) trabalhando neste repositório. Mantenha este arquivo
abaixo de 150 linhas — ele é carregado inteiro no contexto do agente a cada tarefa.

## Visão geral do projeto
O projeto HYDRA é uma ferramenta focada na geração e gerenciamento de ciclos de perfis de teste.

## Comandos
- Instalar deps: `npm install`
- Rodar em dev: `npm run dev`
- Build: `npm run build`
- Lint: `npm run check && npm run lint`
- Testes unitários/integração: `npm run test:unit`
- Testes e2e: `npm run test:e2e`

## Arquitetura
- `/specs`  -> especificações geradas via spec-kit (fonte da verdade do que construir)
- `/plans`  -> planos derivados das specs
- `/tasks`  -> tasks (TASK-001.md, TASK-002.md...), cada uma referenciada em commits/branches
- `/src`    -> código-fonte
- `/tests`  -> unit / integration / e2e
- `/docs`   -> documentação viva do projeto

## Git — commits, branches e tasks
- Branch: `type/TASK-ID-descricao-curta` (ex: `feat/TASK-012-scanner-ct-logs`)
- Commit: Conventional Commits + rodapé referenciando a task
  ```
  feat(scanner): adiciona monitor de CT logs em tempo real

  Refs: TASK-012
  ```
- Tipos válidos: `feat fix docs chore refactor test ci security`
- Merge: sempre squash. Nunca commitar direto na `main`.

## Segurança — obrigatório em todo código gerado
- Nunca commitar `.env`, chaves, tokens ou credenciais. Usar `.env.example` como referência.
- Toda entrada de usuário deve ser validada e sanitizada — nunca confiar em input.
- Queries de banco sempre parametrizadas. Nunca concatenar string em SQL.
- Nenhuma dependência nova sem antes rodar o scanner de vulnerabilidade (Trivy/OSV-Scanner).
- Em qualquer app web: headers de segurança obrigatórios (CSP, X-Content-Type-Options,
  Strict-Transport-Security, X-Frame-Options) e rate limiting em endpoints públicos.
- Nunca logar dados sensíveis (senha, token, PII) em texto puro.
- Usar o checklist OWASP Top 10 como revisão mínima antes de abrir PR.

## Limites — o que o agente nunca deve tocar
- Não modificar arquivos em `/generated/` (se existir).
- Não editar `.github/workflows/*` sem aprovação explícita.
- Não fazer `git push --force` na `main`.

## Permissões
**Sem perguntar:** ler arquivos, listar diretórios, lint, testes pontuais.
**Perguntar antes:** instalar pacote novo, `git push`, deletar arquivo, editar CI.

## Padrão de documentação
Toda feature nova precisa de uma entrada correspondente em `/docs`. Não deixar
`docs/` desatualizado — é a primeira coisa que o agente deve checar/atualizar
ao final de uma task.
