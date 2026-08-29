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
| ☐ | Variáveis CI/CD (nunca no repo) | `.env.example` + secrets GitHub |
| ☐ | Branch `stable` deployável | Pipeline verde |
| ☐ | Evento demo ou staging com slug conhecido | QR abre `/e/…/photo` |
| ☐ | **Teste de carga** 150/20 contra este host | [`carga-producao.md`](./carga-producao.md) |

### Secrets GitHub (Actions)

| Secret | Uso |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Deploy Worker (`pnpm cf:deploy`) |
| `CLOUDFLARE_ACCOUNT_ID` | Conta CF |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | Arnês de carga CI |
| `DATABASE_URL` (prod) | Migrations + ops — **nunca** no workflow de PR |

Variável opcional `STABLE_URL` (ex. `https://stable.albora.app`) dispara smoke HTTP após deploy manual.

---

## 2.1 Comandos de deploy

Build e preview local (Worker simulado):

```bash
pnpm --filter @albora/web cf:preview
```

Deploy para Cloudflare (requer `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`):

```bash
pnpm --filter @albora/web cf:deploy
```

Deploy via GitHub: **Actions → Deploy stable → Run workflow** (confirmar com `deploy-stable`).

Smoke pós-deploy:

```bash
node tools/deploy/smoke.mjs https://stable.albora.app
```

Migrations em prod (forward-only):

```bash
# usar DATABASE_URL_DIRECT do Neon prod — ver packages/db
pnpm --filter @albora/db migrate:prod   # se script existir; senão psql + arquivos em migrations/
```


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

- [`carga-producao.md`](./carga-producao.md) — portão 150 uploads / 20 min em prod (N3)
- [`carga.md`](./carga.md) — arnês local e leitura do relatório
- [`dia-do-evento.md`](./dia-do-evento.md) — ops no salão
- Admin checklist: `/admin/e/[eventId]/pre-event`
- Smoke: `node tools/deploy/smoke.mjs <url>`

---

## 7. Changelog

| Data | Mudança |
|---|---|
| 2026-08-29 | Runbook criado pós-discovery |
| 2026-08-29 | Comandos cf:deploy, secrets GitHub, smoke e link carga-producao |
