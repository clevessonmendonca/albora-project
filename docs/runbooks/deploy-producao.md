# Runbook — deploy produção (N2)

> **Status:** operacional — usar antes do 1º casamento real
> **Última revisão:** 2026-09-05
> **Origem:** [`../product/plano-implementacao-produto.md`](../product/plano-implementacao-produto.md) N2 · [ADR 0006](../adr/0006-hosting-platform.md)

---

## 1. Objetivo

Convidado e anfitrião em **HTTPS de produção**, com e-mail de magic link funcionando — pré-requisito do casamento #1.

---

## 2. Checklist de deploy

| ✓ | Item | Como verificar |
|---|---|---|
| ☐ | Conta Cloudflare Workers **paga** (US$ 5/mês) | CPU 30s/request — PDF de peças |
| ☐ | Buckets R2 `albora-media-homol` e `albora-media-prod` criados | PUT presigned grava objeto em cada um |
| ☐ | Filas Cloudflare Queues `albora-drive-export-homol` e `albora-drive-export-prod` criadas (`wrangler queues create <nome> --env homol\|prod`) | Consumer não erra "queue not found" no primeiro deploy |
| ☐ | Neon projeto prod + branch homol, `DATABASE_URL`/`DATABASE_URL_DIRECT` de cada um carregados via `wrangler secret put --env homol\|prod` | Migrações aplicadas (`docs/db/MIGRATION-SAFETY.md`) |
| ☐ | Driver Neon em **modo transação** (WebSocket) | RLS com `SET LOCAL` — ver ADR 0006 |
| ☐ | Domínio de produção **decidido e registrado** — ⚠️ ainda em aberto (`docs/architecture.md` Anexo A item 2; `.env.prod.example` assume `albora.com.br` só como suposição de template) | `curl -I https://…` → 200 só depois de decidido |
| ☐ | Resend: domínio verificado, `RESEND_API_KEY` por ambiente | Magic link chega em <1 min |
| ☐ | Todas as variáveis de `.env.homol.example`/`.env.prod.example` carregadas via `wrangler secret put --env homol\|prod` (nunca no repo) | `wrangler secret list --env homol\|prod` |
| ☐ | Branch `stable` deployável, promovida para `homol` a pedido do mantenedor | Pipeline verde em `homol` |
| ☐ | Evento demo ou staging com slug conhecido | QR abre `/e/…/photo` |
| ☐ | **Teste de carga** 150/20 contra este host | [`carga-producao.md`](./carga-producao.md) |
| ☐ | Cron Trigger de retenção disparou (§2.2) | `wrangler tail --env prod \| grep retencao.cron_ok` no dia seguinte ao deploy |

### Secrets GitHub (Actions)

| Secret | Uso |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Deploy Worker — mesma credencial para `stable`/`homol`/`prod`; `--env` troca só o Worker de destino |
| `CLOUDFLARE_ACCOUNT_ID` | Conta CF |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | Arnês de carga CI (`carga.yml`) — não confundir com o secret do Worker, que é `wrangler secret put`, não secret do GitHub |
| `HOMOL_DATABASE_URL`, `PROD_DATABASE_URL` | Só para `backup.yml` (dump). Convenção prefixada por ambiente — **não** o `DATABASE_URL` genérico que uma revisão anterior deste runbook citava; o runtime do Worker nunca lê secret do GitHub, só `wrangler secret put` |

Variáveis opcionais `vars.HOMOL_URL` / `vars.PROD_URL` (Settings → Secrets and
variables → Actions → Variables) disparam o smoke pós-deploy de
`.github/workflows/deploy.yml` automaticamente.

---

## 2.1 Comandos de deploy

Build e preview local (Worker simulado, ambiente default/stable):

```bash
pnpm --filter @albora/web cf:preview
```

Deploy manual por ambiente (requer `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`):

```bash
pnpm --filter @albora/web cf:deploy          # default — stable
pnpm --filter @albora/web cf:deploy:homol    # env.homol (apps/web/wrangler.jsonc)
pnpm --filter @albora/web cf:deploy:prod     # env.prod
```

Deploy via GitHub:

- **stable** — Actions → **Deploy stable** → Run workflow (confirmar com `deploy-stable`).
- **homol** — Actions → **Deploy** → Run workflow, **a partir do branch `homol`** (confirmar com `deploy-homol`). O job recusa rodar se o ref não for `homol`.
- **prod** — nunca manual. Só `git tag vX.Y.Z <sha-em-main> && git push origin vX.Y.Z`. O job confirma que o SHA da tag é ancestral de `main` antes de publicar, e roda atrás do GitHub Environment `production` (approval) — mesmo padrão que `backup.yml` já usa para `inputs.alvo == production`.

Smoke pós-deploy (rodado automaticamente pelo workflow se `vars.HOMOL_URL`/`vars.PROD_URL` estiverem configuradas; rodar manual senão):

```bash
node tools/deploy/smoke.mjs https://homol.albora.com.br
bash scripts/ci/smoke-test.sh https://homol.albora.com.br   # /api/health/{live,ready}
```

### 2.2 Cron Trigger — retenção LGPD (d330 export, d365 delete)

`apps/web/wrangler.jsonc` (`env.homol`/`env.prod`) declara `triggers.crons` disparando o
`scheduled` handler do Worker (`apps/web/cloudflare/worker.ts`), que chama
`POST /api/ops/retencao` via self-fetch (`WORKER_SELF_REFERENCE`), autenticado por
`Bearer $CRON_SECRET`. Cadência: `0 4 * * *` (diária, 04:00 UTC) — escolha conservadora,
não uma decisão de produto; ajustar exige decisão explícita do dono.

Verificar que disparou (não há endpoint de status — só log):

```bash
wrangler tail --env prod   # ou --env homol
# procurar "retencao.cron_ok" (sucesso) ou "retencao.cron_falhou"/"retencao.cron_erro"
```

Sem `CRON_SECRET` configurado (`wrangler secret put CRON_SECRET --env prod`), o handler
loga `retencao.cron_sem_segredo` e não chama o endpoint — silencioso por design (mesmo
padrão do `JOB_RUNNER_SECRET` da fila de export), então **confirmar o secret antes do 1º
evento**, não confiar só no cron existir.

Migrations em prod (forward-only — ver `docs/db/MIGRATION-SAFETY.md` antes de rodar):

```bash
# Não existe hoje um script migrate:prod dedicado. Conectar com
# DATABASE_URL_DIRECT (nunca o pooler) e rodar, em ordem, só os arquivos de
# packages/db/migrations/ que a tabela _migrations do ambiente ainda não tem —
# mesmo runner que tools/db/semear-dev.mjs usa em dev, adaptado ao alvo real.
```

---

## 3. Ladder de promoção

```
stable (teste) → homol (homologação) → main (prod)
```

- Feature MR → `stable` (padrão) — `.github/workflows/deploy-stable.yml`
- Promoção `stable` → `homol` **só a pedido explícito** do mantenedor — depois de promovida, deploy manual via `.github/workflows/deploy.yml` job `deploy-homol`
- Validar em homol antes de prosseguir (§4) — inclui o portão de carga N3 (`carga-producao.md`)
- Promoção `homol` → `main` **só a pedido explícito** do mantenedor
- **Prod nunca sai de branch — só tag em `main`** (`git tag vX.Y.Z && git push origin vX.Y.Z`), disparando o job `deploy-prod` de `deploy.yml`

---

## 4. Smoke pós-deploy

1. `bash scripts/ci/smoke-test.sh <host>` — `/api/health/live` e `/api/health/ready` (banco)
2. Anfitrião: magic link → `/admin` → criar evento teste
3. Convidado: QR → consentimento → captura → upload → confirmação
4. Telão: `/wall-display` pareado, foto aparece
5. Admin: painel ao vivo mostra participação

---

## 5. Rollback

Procedimento completo: [`../infra/ROLLBACK.md`](../infra/ROLLBACK.md).

- Código: `wrangler rollback <version-id> --name albora-web-homol|albora-web-prod` — instantâneo, sem passar pelo CI
- Schema: migrations são **forward-only** — rollback de schema exige migration nova (`../db/MIGRATION-SAFETY.md`), nunca reescrever a aplicada
- R2: objetos persistem; não apagar bucket em pânico
- Dado (não só código/schema): [`../infra/BACKUP-RESTORE.md`](../infra/BACKUP-RESTORE.md)

---

## 6. Referências

- [`carga-producao.md`](./carga-producao.md) — portão 150 uploads / 20 min em prod (N3)
- [`carga.md`](./carga.md) — arnês local e leitura do relatório
- [`dia-do-evento.md`](./dia-do-evento.md) — ops no salão
- [`deploy-quebrado.md`](./deploy-quebrado.md) — incidente de deploy quebrado
- [`../infra/ROLLBACK.md`](../infra/ROLLBACK.md) · [`../infra/BACKUP-RESTORE.md`](../infra/BACKUP-RESTORE.md) · [`../db/MIGRATION-SAFETY.md`](../db/MIGRATION-SAFETY.md)
- `apps/web/wrangler.jsonc` — `env.homol` / `env.prod`
- `.github/workflows/deploy.yml` — homol manual, prod só por tag em `main`
- Admin checklist: `/admin/e/[eventId]/pre-event`
- Smoke: `node tools/deploy/smoke.mjs <url>` + `bash scripts/ci/smoke-test.sh <url>`

---

## 7. Changelog

| Data | Mudança |
|---|---|
| 2026-08-29 | Runbook criado pós-discovery |
| 2026-08-29 | Comandos cf:deploy, secrets GitHub, smoke e link carga-producao |
| 2026-09-05 | Ambientes nomeados (`env.homol`/`env.prod` no `wrangler.jsonc`) e `.github/workflows/deploy.yml` (homol manual, prod só por tag em `main` + Environment `production`); secrets GitHub corrigidos para a convenção `HOMOL_`/`PROD_` que `backup.yml` já usa; rollback e migration apontam para `docs/infra/ROLLBACK.md` e `docs/db/MIGRATION-SAFETY.md`; domínio de produção sinalizado como decisão ainda em aberto |
