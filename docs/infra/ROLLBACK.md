# Rollback

Se produção quebrar: voltar o **Worker** para o SHA anterior. Dados no Neon/R2 não voltam com o código.

## Como

1. Actions → **Rollback production** → `workflow_dispatch`
2. Input `sha`: tag anterior (`v1.2.2`) ou commit conhecido
3. O workflow faz checkout desse ref e `pnpm cf:deploy`
4. Confirme `GET /api/health/live` e `GET /api/health/ready`

Tempo esperado: minutos (build + deploy), não horas.

## O que rollback **não** desfaz

- Migration já aplicada no Neon (ver `docs/db/MIGRATION-SAFETY.md`)
- Objetos já gravados no R2
- Sessões emitidas com `SESSION_SECRET` novo

## Se o health check falhar após o rollback

1. Confirme secrets de produção (DATABASE_URL, R2)
2. Neon console: projeto acordado / não suspenso
3. Cloudflare: último deploy do worker `albora-web`
