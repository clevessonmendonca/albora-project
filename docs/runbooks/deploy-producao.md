# Runbook — deploy produção (N2)

> **Status:** operacional — usar antes do 1º casamento real
> **Última revisão:** 2026-08-29
> **Origem:** [`../product/plano-implementacao-produto.md`](../product/plano-implementacao-produto.md) N2 · [ADR 0006](../adr/0006-hosting-platform.md)

---

## 1. Objetivo

Convidado e anfitrião em **HTTPS de produção**, com e-mail de magic link funcionando — pré-requisito do casamento #1.

---

## 2. Checklist de deploy

| ✓ | Item | Como verificar |
|---|---|---|
| ☐ | Conta Cloudflare Workers **paga** (US$ 5/mês) | CPU 30s/request — PDF de peças |
| ☐ | R2 bucket criado + binding no Worker | PUT presigned grava objeto |
| ☐ | Neon projeto prod + `DATABASE_URL` no CI | Migrações aplicadas |
| ☐ | Driver Neon em **modo transação** (WebSocket) | RLS com `SET LOCAL` — ver ADR 0006 |
| ☐ | Domínio `albora.app` (ou prod) apontando ao Worker | `curl -I https://…` → 200 |
| ☐ | Resend: domínio verificado, `RESEND_API_KEY` | Magic link chega em <1 min |
| ☐ | Variáveis CI/CD GitLab (nunca no repo) | `.env.example` completo |
| ☐ | Branch `stable` deployável | Pipeline verde |
| ☐ | Evento demo ou staging com slug conhecido | QR abre `/e/…/photo` |
| ☐ | **Teste de carga** 150/20 contra este host | [`carga.md`](./carga.md) |

---

## 3. Ladder de promoção

```
stable (teste) → homol → main (prod)
```

- Feature MR → `stable` (padrão)
- Promoção para `homol` / `main` **só a pedido explícito** do mantenedor
- Tag em `main` dispara prod

---

## 4. Smoke pós-deploy

1. Anfitrião: magic link → `/admin` → criar evento teste
2. Convidado: QR → consentimento → captura → upload → confirmação
3. Telão: `/wall-display` pareado, foto aparece
4. Admin: painel ao vivo mostra participação

---

## 5. Rollback

- Worker: redeploy do commit anterior via CI
- Neon: migrations são **forward-only** — rollback de schema exige migration nova
- R2: objetos persistem; não apagar bucket em pânico

---

## 6. Referências

- [`carga.md`](./carga.md) — portão 150 uploads / 20 min
- [`dia-do-evento.md`](./dia-do-evento.md) — ops no salão
- Admin checklist: `/admin/e/[eventId]/pre-event`
