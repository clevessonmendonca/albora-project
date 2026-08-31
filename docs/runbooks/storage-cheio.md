# RUNBOOK: Storage cheio ou R2 falhando

## Sintoma

Presign 200 mas PUT 403/429/507; confirm `midia.conteudo_nao_confere`; dashboard R2 perto do free tier.

## Severidade

SEV1 se PUT falha na festa. SEV3 se só alerta de cota.

## Diagnóstico

1. Cloudflare → R2 → storage e Class A do bucket de **produção**
2. CORS do bucket inclui a origem do PWA
3. Token do ambiente aponta para o bucket certo (staging vs prod)
4. Object lock bloqueando o job de retenção — outro problema; PUT novo não deveria falhar por lock

## Resolução imediata

- Cota: liberar orphans (uploads não confirmados) ou subir de plano R2 — **não** apagar álbum de evento ativo
- 403: credencial/bucket; conferir secrets do Environment
- Objeto apagado por engano: versionamento do bucket de produção → restaurar versão

## Prevenção

Alarme a 50% de 10 GB. Retenção D365 no job, não na mão. `docs/infra/COST.md`.
