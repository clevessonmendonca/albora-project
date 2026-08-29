# Controles de segurança (ops)

Modelo de ameaça e LGPD: [`docs/security.md`](../security.md). Auditoria OWASP desta onda: [`docs/security/OWASP-AUDIT.md`](../security/OWASP-AUDIT.md). Secrets: [`docs/security/SECRETS-CHECKLIST.md`](../security/SECRETS-CHECKLIST.md).

Checklist operacional:

- Headers globais (`GLOBAL_SECURITY_HEADERS`): CSP, HSTS, COOP, `camera=(self)`
- Rate limit por sessão/IP (`RATE_LIMITS`); 429 com `Retry-After`
- Token de convidado opaco, um evento; convidado sem senha
- Chave de storage só no servidor
- Dependabot + `pnpm audit` em CI (report-only no pipeline principal)
- Rotação: `docs/infra/ROTACAO-SECRETS-URGENTE.md` se vazou
