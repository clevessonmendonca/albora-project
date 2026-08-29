# Onboarding — Albora

Cinco dias para operar o repositório sem furar isolamento, upload ou identidade visual.

## Dia 1 — Setup local

- [ ] Clonar o repo, `pnpm install`, copiar `.env.example` → `.env.local`
- [ ] `pnpm db:up` (ou Neon `dev`) + `pnpm db:semear` + `pnpm dev`
- [ ] Abrir `localhost:3000`, health live ok
- [ ] Ler [`CLAUDE.md`](../CLAUDE.md) (regras não negociáveis)

Detalhe: [`docs/infra/SETUP-LOCAL.md`](./infra/SETUP-LOCAL.md)

## Dia 2 — Arquitetura

- [ ] [`docs/architecture.md`](./architecture.md)
- [ ] [`docs/infra/ARCHITECTURE.md`](./infra/ARCHITECTURE.md)
- [ ] [`docs/adr/0009-app-social-do-convidado.md`](./adr/0009-app-social-do-convidado.md) e [`0004`](./adr/0004-anonymous-guest-session.md)
- [ ] Teste de sanidade: nenhuma string de pack (`noiva`, etc.) no núcleo

## Dia 3 — Primeiro PR

- [ ] Branch `feat/…` a partir de `stable` (ladder: `docs/infra/DEPLOY-PROCESS.md`)
- [ ] `pnpm test` e `pnpm guards` no que você tocou
- [ ] Conventional Commits com escopo (`feat(upload):`)
- [ ] Não mergear a própria MR

## Dia 4 — Operação

- [ ] [`docs/infra/MONITORING.md`](./infra/MONITORING.md), [`LOGGING.md`](./infra/LOGGING.md), [`METRICS.md`](./infra/METRICS.md)
- [ ] Health: `/api/health/live` vs `/ready`
- [ ] [`docs/infra/COST.md`](./infra/COST.md) — o que é grátis e o que estoura

## Dia 5 — Incidente

- [ ] [`docs/infra/INCIDENT-RESPONSE.md`](./infra/INCIDENT-RESPONSE.md)
- [ ] Um runbook: [`docs/runbooks/upload-pipeline-broken.md`](./runbooks/upload-pipeline-broken.md)
- [ ] Rollback: [`docs/infra/ROLLBACK.md`](./infra/ROLLBACK.md)
- [ ] Backup: [`docs/infra/BACKUP-RESTORE.md`](./infra/BACKUP-RESTORE.md)

Convidado não tem login. Servidor não lê bytes de foto. Hex não mora em componente.
