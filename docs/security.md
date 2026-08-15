# Segurança do projeto

Ver checklist completo em [`SECURITY.md`](../SECURITY.md) na raiz.

## Camadas automatizadas

| Camada                 | Ferramenta             | Onde                                                         |
| ---------------------- | ---------------------- | ------------------------------------------------------------ |
| Secrets                | Gitleaks               | pre-commit local + `.github/workflows/gitleaks.yml`          |
| SAST                   | Semgrep                | pre-commit local + `.github/workflows/semgrep.yml`           |
| SAST                   | CodeQL                 | `.github/workflows/codeql.yml` (grátis em repo público)      |
| SCA                    | Dependabot ou Renovate | `.github/dependabot.yml` / `renovate.json`                   |
| SCA extra              | OSV-Scanner            | `.github/workflows/dependency-review.yml`                    |
| Container / IaC        | Trivy                  | `.github/workflows/trivy.yml`                                |
| DAST                   | OWASP ZAP baseline     | `.github/workflows/zap-baseline.yml` (opcional, só apps web) |
| Secret push protection | nativo GitHub          | Settings → Code security                                     |

## Configuração recomendada no GitHub (fora de arquivo)

1. Settings → Code security → habilitar **Secret scanning** e **Push protection**.
2. Settings → Branches → proteger `main`: exigir PR, exigir status checks (CI, CodeQL,
   Semgrep, Gitleaks) passando, sem push direto.
3. Settings → Code security → habilitar **Dependabot alerts**.

## Checklist OWASP Top 10

Ver `SECURITY.md`.
