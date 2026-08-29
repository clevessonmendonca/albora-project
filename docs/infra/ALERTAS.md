# Alertas

Um alerta existe só se alguém precisa agir.

## Crítico (acordar)

| Condição | Sinal |
|---|---|
| App fora | `/api/health/ready` ≠ 200 por > 5 min |
| Banco | probe `database.indisponivel` |
| Upload quebrado | taxa de `upload.confirmed` ~ 0 com `upload.started` > 0 por 10 min num sábado |
| Certificado | expiração < 7 dias |

## Warning (horário comercial)

- 5xx > 5% em 15 min
- Latência p95 da API > 3s
- Neon storage > 80% do teto do plano

Canal inicial: e-mail do operador. Slack/Betterstack quando houver evento real.

Runbooks: `docs/runbooks/app-down.md`, `database-unavailable.md`, `upload-pipeline-broken.md`.
