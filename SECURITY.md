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
- Application-level rate limiting is deliberately omitted to prevent excessive Redis/Database overhead on serverless edge functions.
- **Requirement**: Rate Limiting must be enforced at the Infrastructure/CDN layer (e.g., Vercel WAF or Cloudflare Rules) to strictly throttle `/api/auth` and `/login` POST requests.

## 5. Third-Party Dependencies
- All npm dependencies are periodically audited.
- Docker bases use Alpine to minimize CVE surface area.
