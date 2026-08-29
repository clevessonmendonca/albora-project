# Monitoring

## Agora (custo zero)

- Cloudflare Workers observability (`wrangler.jsonc` → `observability.enabled`)
- Neon dashboard (storage, compute, conexões)
- Health: `GET /api/health/live` e `GET /api/health/ready`
- Logs estruturados no stdout do Worker

## Uptime

Apontar um monitor gratuito (Betterstack / UptimeRobot) para:

- `https://<prod>/api/health/ready` a cada 1 min
- timeout 10s; alertar se ≠ 200

## Dashboard mínimo

Uptime, 5xx, uploads/hora, storage Neon, storage R2. Sem APM pago no MVP.
