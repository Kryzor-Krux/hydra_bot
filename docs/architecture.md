# Arquitetura e ferramentas

## Organização / agentes

| Ferramenta            | Função                                                  |
| --------------------- | ------------------------------------------------------- |
| Antigravity (Gemini)  | execução do código, motor principal                     |
| AGENTS.md + GEMINI.md | fonte única de instruções para o agente                 |
| spec-kit              | gera `/specs`, `/plans`, `/tasks`                       |
| coderlm               | indexação de código para contexto direcionado do agente |
| `.agents/`            | skills e subagentes específicos do Antigravity          |

## Git / processo

| Ferramenta              | Função                                                     |
| ----------------------- | ---------------------------------------------------------- |
| Conventional Commits    | padrão de mensagem de commit                               |
| conventional-pre-commit | valida o formato da mensagem antes do commit               |
| pre-commit (framework)  | orquestra os hooks locais                                  |
| release-please          | changelog e versionamento automáticos a partir dos commits |

## Segurança

Ver `docs/security.md` para a lista completa e o motivo de cada escolha.

## Documentação

| Ferramenta              | Função                                                             |
| ----------------------- | ------------------------------------------------------------------ |
| MkDocs Material         | site navegável a partir de `/docs`                                 |
| openwiki (langchain-ai) | opcional — geração/manutenção automática de docs lidas por agentes |

## Testes

| Camada             | Ferramenta                                     |
| ------------------ | ---------------------------------------------- |
| Unit / Integration | framework nativo da stack (pytest, jest, etc.) |
| E2E                | Playwright                                     |

## Extras opcionais (adicionar conforme necessidade)

- **OSV-Scanner** — scanner de CVE adicional ao Trivy
- **OWASP ZAP** — DAST, só se o projeto expõe app web/API
- **Renovate** — alternativa ao Dependabot (ver `renovate.json`); escolha um dos dois
- **shields.io** — badges de status no README
