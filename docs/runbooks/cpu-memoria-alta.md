# RUNBOOK: CPU ou memória alta no Worker

## Sintoma

Cloudflare dashboard → Workers → CPU time ou memory subindo; p95 das rotas API estoura; telão travando o poll.

## Severidade

SEV2 se sábado 18h–23h; SEV3 fora da janela de festa.

## Diagnóstico

1. Qual rota? `metrics` / logs `unexpectedError` (`docs/infra/METRICS.md`)
2. Confirm ou presign lento → banco (`docs/runbooks/database-unavailable.md`)
3. Feed lento → índices 0052 aplicados? `EXPLAIN` no Neon
4. Worker fazendo GET de objeto inteiro — **não deveria**; confirm só lê magic bytes

## Resolução imediata

- Rollback se o último deploy coincidir (`docs/infra/ROLLBACK.md`)
- Não "aumentar instância": não há. Reduzir poll do telão só com mudança de código, não no dashboard.

## Prevenção

Orçamento de bundle na rota do convidado. Servidor fora do caminho de bytes.
