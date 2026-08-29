# Métricas

`metrics` em `@albora/core` (provider padrão: log estruturado). Trocar o destino com `configureMetrics`.

Instrumentado agora:

- `upload.started` / `upload.confirmed`
- `http.errors` (via `unexpectedError`)

Próximos nomes estáveis: `feed.loaded`, `comment.published`, `db.query.duration`.

Não enviar PII em tags. Provider pago (Axiom/Betterstack) só quando o volume justificar o custo (orçamento R$ 0–100/mês).
