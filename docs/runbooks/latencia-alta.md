# RUNBOOK: Latência alta

## Sintoma

p95 presign/confirm > 1 s (carga) ou feed/telão visivelmente lento.

## Severidade

SEV2 na janela de festa; SEV3 fora.

## Diagnóstico

1. Separar etapas: presign (API+Neon) vs PUT (R2, fora do Worker) vs confirm (API+Neon+HEAD Range)
2. PUT lento = rede do salão ou R2 — não "otimizar servidor"
3. Confirm lento = `inspecionarObjeto` ou INSERT — Neon cold start no free tier é suspeito
4. Feed lento = índice / seq scan; conferir 0052

## Resolução imediata

- Neon suspenso: abrir o console, acordar compute, considerar Scale se for sábado recorrente
- Deploy recente com query nova: rollback
- Não ligar Redis para "acelerar o feed"

## Prevenção

`CARGA_PERFIL=gate` contra staging antes do 1º evento. Cache só em identidade (60 s), nunca no feed.
