# Dependency scanning

## O que roda hoje

- `pnpm audit --audit-level=high` no job `verificar` do CI (report-only)
- Workflow `.github/workflows/security.yml` (PR, push, cron semanal)
- Dependabot em `.github/dependabot.yml` (npm + GitHub Actions, semanal)

## Como tratar um alerta

1. HIGH/CRITICAL: patch ou replace na mesma semana; não acumular.
2. Moderate em dependência transitiva: registrar e acompanhar no Dependabot.
3. Falso positivo: documentar na PR com CVE e motivo.

Gate bloqueante (`continue-on-error: false`) só depois que o backlog HIGH estiver zerado.
