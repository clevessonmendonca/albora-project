# RUNBOOK: Aplicação fora do ar

## Sintoma

Health check `/api/health/ready` falha; convidado vê erro genérico; Cloudflare 5xx.

## Diagnóstico

1. `curl -i https://<prod>/api/health/live` — processo
2. `curl -i https://<prod>/api/health/ready` — banco
3. Cloudflare dashboard → Workers → errors
4. Neon console → projeto acordado?

## Resolução imediata

- Live ok, ready falhou → `docs/runbooks/database-unavailable.md`
- Live falhou → último deploy: Actions → Rollback production
- Deploy recente → rollback para SHA anterior

## Prevenção

Não deployar na janela de evento. Smoke após cada deploy.
