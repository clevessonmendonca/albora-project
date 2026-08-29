# Infraestrutura em produção (Opção A)

Fonte de **fronteiras de produto**: [`docs/architecture.md`](../architecture.md). Este arquivo é o mapa **de operação**.

```
Convidado (PWA)
  → Cloudflare (DNS, TLS, cache de estáticos)
  → Worker OpenNext (Next.js)
       → Neon Postgres (RLS, SET LOCAL app.event_id)
       → R2 presign (PUT do browser direto no bucket)
  Telão: mesma origem, poll
  Admin: magic link (Resend)
```

Caminho crítico de sábado 20h: **R2 + Postgres**. Classificador, WhatsApp, Drive, e-mail e analytics degradam.

Isolamento: toda tabela de evento tem `event_id`; GUC `app.event_id` com `SET LOCAL` e `NULLIF`. Jobs sem `event_id` no payload falham alto.

Decisão de stack: `docs/infra/ARQUITETURAS-COMPARADAS.md` (Opção A). Capacidade: `docs/infra/CAPACITY-PLAN.md`. Performance: `docs/infra/PERFORMANCE.md`.
