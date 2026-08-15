# Política de Segurança

## Reportando uma vulnerabilidade

Não abra uma issue pública para vulnerabilidades. Envie um e-mail para
`<preencher: seu-email-de-seguranca@dominio.com>` com:

- Descrição da vulnerabilidade e impacto potencial
- Passos para reproduzir
- Versão/commit afetado

Você receberá uma confirmação em até 48h e um retorno sobre o plano de correção
em até 7 dias.

## O que este repositório já verifica automaticamente

| Camada                            | Ferramenta               | Onde roda             |
| --------------------------------- | ------------------------ | --------------------- |
| Secrets                           | Gitleaks                 | pre-commit local + CI |
| SAST                              | Semgrep + CodeQL         | CI                    |
| Dependências (SCA)                | Dependabot + OSV-Scanner | CI + PR automático    |
| Container/IaC                     | Trivy                    | CI                    |
| DAST (apps web)                   | OWASP ZAP baseline       | CI (branch principal) |
| Push protection / secret scanning | nativo GitHub            | em todo push          |

## Checklist mínimo (OWASP Top 10) antes de qualquer release

## 3. Database & Injection Prevention

- Drizzle ORM safely parameterizes all SQL queries via `postgres.js`
- User ownership is strictly enforced at the query level. Any data retrieval or mutation performs a conditional `userId` check to prevent BOLA (Broken Object Level Authorization) or IDOR attacks.

## 4. Rate Limiting & DoS Protection

### IMPLEMENTED IN APPLICATION

- No local-memory rate limiting is used, as it fails in serverless environments without an external Redis store.
- Authentication paths (`/login`, `/api/auth/sign-up`, `/admin?/createUser`) are structured to be explicitly protectable by edge infrastructure.

### REQUIRED VERCEL DASHBOARD CONFIGURATION

To secure this application in production on Vercel, you **MUST** configure Vercel Web Application Firewall (WAF) rate limiting via the Vercel Dashboard (Settings > Security > Firewall).

**Rule 1: Login Protection**

- **Action**: Rate Limit (Block)
- **If**: `Path` `starts with` `/login` OR `Path` `starts with` `/api/auth`
- **Rate Limit**: 5 requests per 15 minutes
- **By**: `IP Address`

**Rule 2: Admin Creation Protection**

- **Action**: Rate Limit (Block)
- **If**: `Path` `starts with` `/admin`
- **Rate Limit**: 10 requests per 1 hour
- **By**: `IP Address`

## 5. Third-Party Dependencies

- All npm dependencies are periodically audited.
- Docker bases use Alpine to minimize CVE surface area.
