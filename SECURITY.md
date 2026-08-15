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

- [ ] Nenhuma injeção (SQL/NoSQL/Comando) possível — todas as queries parametrizadas
- [ ] Autenticação/sessão seguem boas práticas (nada de senha em texto puro, tokens com expiração)
- [ ] Dados sensíveis criptografados em trânsito e em repouso
- [ ] Controle de acesso testado (sem "broken access control")
- [ ] Configurações padrão seguras (sem debug mode em produção)
- [ ] Dependências sem CVE crítico/alto em aberto
- [ ] Logs não expõem dados sensíveis
- [ ] Rate limiting ativo em endpoints públicos
