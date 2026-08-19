# Setup

## Requisitos

- Node LTS (ex. Node 22)
- pre-commit (pip install pre-commit)
- git

## Passo a passo

```bash
git clone <url-do-repo>
cd hydra_bot
npm install
pre-commit install
pre-commit install --hook-type commit-msg
npm run dev
```

## Banco de Dados

O projeto usa Supabase apenas como provedor de PostgreSQL. O acesso é feito exclusivamente pelo servidor SvelteKit com Drizzle ORM e postgres.js. Não há Supabase Auth nem consultas do navegador.

Configure no arquivo .env:

- DATABASE_URL: Supabase Transaction Pooler, porta 6543, usado pelo runtime/Vercel.
- MIGRATION_DATABASE_URL: conexão Direct ou Session Pooler, porta 5432, usada pelo Drizzle Kit.
- TEST_DATABASE_URL: banco Supabase separado, usado somente pelos testes E2E destrutivos.
- BETTER_AUTH_SECRET: segredo forte e exclusivo do Better Auth.
- ADMIN_BOOTSTRAP_USERNAME e ADMIN_BOOTSTRAP_PASSWORD: credenciais opcionais do primeiro admin.
- RATE_LIMIT_TEST_MODE: use true apenas nos testes automatizados.

Gere as migrações com MIGRATION_DATABASE_URL configurada:

```bash
npx drizzle-kit generate --name=supabase_initial
```

Revise o SQL em supabase/migrations/ e aplique-o manualmente no Supabase SQL Editor.

## Escolha entre Dependabot e Renovate

O repo vem com os dois configurados (.github/dependabot.yml e renovate.json). Escolha um e remova o outro para evitar PRs duplicados.

## Playwright (testes e2e)

Os testes E2E exigem TEST_DATABASE_URL e recusam execução se ela for igual a DATABASE_URL. O banco de testes é resetado de forma determinística; o banco de runtime nunca é apagado ou truncado.

```bash
npm run test:e2e
```
