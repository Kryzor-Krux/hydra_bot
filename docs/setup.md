# Setup

## Requisitos
- `<preencher: runtime da stack, ex. Node 22 / Python 3.12>`
- `pre-commit` (`pip install pre-commit`)
- `git`

## Passo a passo
```bash
git clone <preencher: url-do-repo>
cd <preencher: nome-do-projeto>

# instalar dependências
<preencher>

# ativar hooks locais de segurança e commit
pre-commit install
pre-commit install --hook-type commit-msg

# rodar em desenvolvimento
<preencher>
```

## Escolha entre Dependabot e Renovate
O repo vem com os dois configurados (`.github/dependabot.yml` e `renovate.json`).
Escolha um e remova o outro para evitar PRs duplicados.

## Documentação navegável (opcional)
```bash
pip install mkdocs-material
mkdocs serve
```

## Playwright (testes e2e)
```bash
npm install -D @playwright/test
npx playwright install
npx playwright test
```
