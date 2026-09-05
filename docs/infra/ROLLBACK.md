# Rollback de produção

> Referenciado por [`../runbooks/deploy-quebrado.md`](../runbooks/deploy-quebrado.md).
> Cobre só **código do Worker**. Rollback de **schema** é outro problema — ver
> [`../db/MIGRATION-SAFETY.md`](../db/MIGRATION-SAFETY.md).

## O que existe de verdade

Não existe workflow "Rollback production" no GitHub Actions — `deploy-quebrado.md`
citava um que nunca foi criado. O rollback real é o comando nativo do Wrangler,
rodado manualmente com o mesmo `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` já
usados por `.github/workflows/deploy.yml` e `deploy-stable.yml`:

```bash
npx wrangler versions list --name albora-web-prod    # ou albora-web-homol / albora-web
npx wrangler rollback <version-id> --name albora-web-prod -m "rollback: <motivo>"
```

`wrangler rollback` promove instantaneamente uma Version anterior a 100% do
tráfego — sem rebuild, sem passar pelo CI. É o caminho mais rápido do RTO de
`docs/infra/RPO-RTO.md` (código ruim em produção: RTO alvo 10 min).

Nome do Worker por ambiente (`apps/web/wrangler.jsonc`):

| Ambiente | Nome do Worker |
|---|---|
| stable | `albora-web` (config default, sem `--env`) |
| homol | `albora-web-homol` |
| prod | `albora-web-prod` |

## Antes de rodar

1. `GET /api/health/live` e `GET /api/health/ready` no host — confirma que o
   problema é o código no ar, não o banco (`docs/runbooks/database-unavailable.md`
   cobre banco). `bash scripts/ci/smoke-test.sh <host>` roda os dois.
2. `wrangler versions list` — confirme qual `version-id` é o "último bom"
   (a coluna de trigger mostra `Upload`/`Rollback`/`Secret Change`; procure o
   upload anterior ao deploy que quebrou).
3. Pergunta que decide o próximo passo: **uma migration nova foi aplicada
   junto com o deploy ruim?**
   - **Não** → rollback de código sozinho resolve. Siga para "Executar".
   - **Sim** → o código antigo pode não entender o schema novo. Ver
     `docs/db/MIGRATION-SAFETY.md` antes de reverter — migrations são
     forward-only, então "desfazer" o schema é escrever uma migration nova,
     nunca apagar ou reescrever a aplicada.

## Executar

```bash
export CLOUDFLARE_API_TOKEN=...   # mesmo secret do deploy — nunca hardcode, nunca logar
export CLOUDFLARE_ACCOUNT_ID=...

npx wrangler versions list --name albora-web-prod

npx wrangler rollback <version-id> --name albora-web-prod \
  -m "rollback: <SEV e causa curta>"
```

O comando pede confirmação interativa (`-y` pula o prompt, só use em
automação já revisada). Duas coisas que o próprio Wrangler avisa e valem
repetir aqui:

- **Rollback não desfaz recurso vinculado** (R2, Queue, Durable Object) — só
  o código do Worker. Se o deploy ruim escreveu dado errado no R2 ou na fila,
  isso não volta sozinho.
- **Secret mudado desde a Version alvo bloqueia o rollback silencioso** —
  Wrangler pergunta confirmação extra se `wrangler secret put` rodou depois
  daquela Version. Não é bug, é o Wrangler evitando rodar código velho com
  suposição errada sobre o secret atual.

## Depois

1. Rodar `bash scripts/ci/smoke-test.sh <host>` de novo — confirma `live` e
   `ready` OK na Version revertida.
2. Registrar em `docs/runbooks/deploy-quebrado.md` (ou abrir incidente): SHA
   revertido, Version-id, motivo, se precisou migration compensatória.
3. Se precisou migration compensatória, ela entra como a **próxima**
   numerada (nunca reescreve a antiga) — ver `docs/db/MIGRATION-SAFETY.md`.

## Rollback de banco (fora do escopo deste documento)

Se o incidente exige voltar dado, não só código — `database-unavailable.md`
para banco fora do ar, `docs/infra/BACKUP-RESTORE.md` para restaurar de um
dump ou branch Neon. Nunca confundir os dois: código volta em segundos com
`wrangler rollback`; dado tem RPO de até 24h e exige decisão consciente sobre
o que se perde.
