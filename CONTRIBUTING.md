# Contribuindo

## Fluxo

1. Toda mudança começa numa task em `/tasks/TASK-ID.md` (derivada de uma spec em `/specs`, quando aplicável).
2. Crie a branch: `type/TASK-ID-descricao-curta`.
3. Commits no padrão [Conventional Commits](https://www.conventionalcommits.org/), sempre referenciando a task:
   ```
   feat(escopo): descrição curta no imperativo

   Refs: TASK-ID
   ```
4. Antes de abrir PR, rode local: lint, testes e os hooks de segurança (`pre-commit run --all-files`).
5. Abra o PR usando o template — checklist precisa estar 100% marcado.
6. Merge por squash apenas, após CI verde e ao menos 1 review.

## Tipos de commit válidos

`feat` `fix` `docs` `chore` `refactor` `test` `ci` `security`

## Testes

- `tests/unit` — funções isoladas, rodam rápido, sempre antes de commitar.
- `tests/integration` — módulos interagindo (DB, API interna).
- `tests/e2e` — fluxo completo via Playwright.

## Documentação

Toda feature nova exige atualização em `/docs`. PR sem doc correspondente não é aprovado.
