# Repo Template

[![CI](https://img.shields.io/badge/CI-passing-brightgreen)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Security: gitleaks](https://img.shields.io/badge/secrets-gitleaks-blue)]()

Template padrão para novos projetos. Cobre: organização (spec-driven), padrão
de commits/branches/tasks, segurança automatizada (SAST/SCA/secrets), testes,
documentação e instruções para agentes de IA (Antigravity/Gemini).

## Como usar
1. "Use this template" no GitHub para criar um repositório novo a partir deste.
2. Preencha as seções `<preencher>` em `AGENTS.md`, `docs/setup.md` e `renovate.json` / `dependabot.yml`.
3. Rode `pre-commit install` (veja `docs/setup.md`) para ativar os hooks locais.
4. Comece pelo spec-kit: `specify init` na raiz para gerar a primeira spec em `/specs`.

## Estrutura
```
.agents/      skills e subagentes do Antigravity
specs/        especificações (spec-kit)
plans/        planos derivados das specs
tasks/        tasks rastreáveis (TASK-001.md...)
src/          código-fonte
tests/        unit / integration / e2e
docs/         documentação viva
```

## Stack de ferramentas
Veja `docs/architecture.md` (ferramentas de organização/agentes) e
`docs/security.md` (ferramentas de segurança) para a lista completa e o
motivo de cada escolha.

## Licença
MIT — veja [LICENSE](LICENSE).
