# HYDRA - Ciclos Module Walkthrough

The HYDRA generic template was successfully bootstrapped into a SvelteKit application and the first production module, **CICLOS**, was completely implemented.

## 1. Architecture & Bootstrap
- **Framework**: SvelteKit with `@sveltejs/adapter-node`.
- **Database**: Local SQLite using `better-sqlite3` configured in WAL mode with foreign keys.
- **Styling**: Vanilla CSS implemented in Svelte components without any large UI kits or Tailwind, emphasizing a fast, dark theme with an emerald green accent.
- **Directory Structure**: 
  - `src/lib/modules/ciclos/domain/` for generation and validation.
  - `src/lib/modules/ciclos/server/` for repository and db interactions.
  - `src/routes/ciclos/` for the web UI.

## 2. Main Files Created / Changed
- `src/routes/ciclos/+page.svelte`: Main UI component, featuring the MÃE and FILHA profile cards. Includes inline CSS and logic to copy data upon clicking cards.
- `src/routes/ciclos/+page.server.ts`: Server-side actions for cycle generation and profile field updates.
- `src/lib/server/db.ts`: Sets up the SQLite database (`data/ciclos.db`) with migrations and table schemas (`cycles` and `cycle_profiles`).
- `src/lib/modules/ciclos/domain/generator.ts`: Implements securely-random generators for names, passwords, and mathematically valid CPFs, without relying on external APIs.
- `AGENTS.md`, `README.md`, `docs/setup.md`, `.env.example`, `.gitignore`: Updated with the application's actual setup instructions, dependencies, and rules.

## 3. Database Schema
Created two tables:
- `cycles`: Stores the primary cycle ID and timestamps.
- `cycle_profiles`: Stores profile records with a foreign key to `cycles`, ensuring `role IN ('mae', 'filha')` and a composite unique constraint on `(cycle_id, role)`. Ensures valid mapping with required default values.

## 4. Tests Executed
- **Unit Tests**: `generator.test.ts` verified that names don't contain accents, passwords meet complexity, and CPFs are mathematically valid and exactly 11 digits.
- **Integration Tests**: `db.test.ts` verified the `repository.ts` works directly against an in-memory DB configuration, guaranteeing reliable data saving and retrieval of the latest cycle.
- **E2E Tests**: `ciclos.e2e.ts` verified the complete flow from navigating to the module, generating data, inputting manual fields, persisting, and generating a subsequent cycle.

## 5. Technical Decisions
- **Svelte 5 Runes**: Adopted `$props()`, `$state()`, and `$derived()` following SvelteKit's current default template setup.
- **In-Memory Test DB**: Handled the test environment for Vitest by dynamically switching `dbPath` to `:memory:` to run clean tests without creating file artifacts during unit/integration runs.
- **Updates**: A debounce pattern was implemented on manual fields to persist data as the user types, rather than requiring an explicit "Salvar" button.
