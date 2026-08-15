# Setup

## Requisitos
- Node LTS (ex. Node 22)
- `pre-commit` (`pip install pre-commit`)
- `git`

## Passo a passo
```bash
git clone <url-do-repo>
cd hydra_bot

# instalar dependências
npm install

# ativar hooks locais de segurança e commit
pre-commit install
pre-commit install --hook-type commit-msg

# rodar em desenvolvimento
npm run dev
```

## Banco de Dados
O projeto utiliza um banco de dados SQLite local.
Copie `.env.example` para `.env` e ajuste se necessário (o padrão `DATABASE_PATH=./data/ciclos.db` é suficiente).
Ao rodar `npm run dev` as tabelas serão criadas automaticamente.

## Escolha entre Dependabot e Renovate
O repo vem com os dois configurados (`.github/dependabot.yml` e `renovate.json`).
Escolha um e remova o outro para evitar PRs duplicados.

## Playwright (testes e2e)
```bash
npm run test:e2e
```
