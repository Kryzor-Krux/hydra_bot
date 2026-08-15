# HYDRA

Ferramenta de testes focada na geração e gerenciamento de ciclos de perfis.

## Como usar

1. Crie o arquivo `.env` (use `.env.example` como base).
2. Instale dependências: `npm install`.
3. Rode em desenvolvimento: `npm run dev`.

## Estrutura

```
src/          código-fonte SvelteKit + SQLite (better-sqlite3)
tests/        unit / integration / e2e (Vitest + Playwright)
docs/         documentação do projeto
data/         banco de dados SQLite local
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
