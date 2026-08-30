# RUNBOOK: Erro 500 elevado

## Sintoma

`http.errors` sobe; convidado vê "Não foi possível concluir"; Cloudflare 1101/5xx.

## Severidade

SEV1 se health ready falha ou upload confirm 5xx em massa. SEV2 se só admin.

## Diagnóstico

1. `curl -i https://<prod>/api/health/live` e `/api/health/ready`
2. Logs do Worker: `erro.inesperado` — **sem** colar PII
3. 500 logo após deploy → `docs/runbooks/deploy-quebrado.md`
4. 500 só em confirm → objeto R2 / mime (`docs/runbooks/upload-pipeline-broken.md`)

## Resolução imediata

- Ready falhou → banco
- Live falhou → rollback
- Isolado a uma rota → rollback se deploy recente; senão mitigar a rota

## Prevenção

Smoke pós-deploy. Rate limit já cobre abuso; 500 não se resolve com mais limite.
