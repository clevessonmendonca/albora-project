# Performance e capacidade

Como medir e o que otimizar no caminho crítico. Sem Redis e sem k6: o arnês é `pnpm carga` (`tools/carga`).

## O que medir

O portão de MVP (CLAUDE.md) é **150 uploads em 20 minutos**, em rajada — não em taxa constante. Relatório: p50/p95/p99 por etapa (presign, PUT, confirm). 5xx é defeito; 429 é o rate limit funcionando.

Perfis (`CARGA_PERFIL`, defaults em `tools/carga/config.mjs`; `CARGA_*` explícito ganha):

| Perfil | Quando | Uploads | Janela | Sessões |
|---|---|---|---|---|
| `fumaca` | CI semanal / prova do arnês | 6 | 1 min | 3 |
| `gate` | Portão MVP | 150 | 20 min | 50 |
| `pico` | Salão cheio (mais sessões, mesmo volume) | 150 | 20 min | 150 |
| `normal` | Carga diluída | 300 | 30 min | 50 |
| `stress` | Achar o teto | 400 | 20 min | 200 |
| `soak` | Vazamento / degradação — **só local** | 200 | 240 min | 30 |

```bash
pnpm carga
CARGA_PERFIL=fumaca pnpm carga
CARGA_PERFIL=gate pnpm carga
CARGA_PERFIL=soak pnpm carga
```

Alvo remoto exige `CARGA_CONFIRMO_ALVO` com o host exato. Runbook: `docs/runbooks/carga.md`.

O arnês **não** mede feed, telão, 3G nem fila IndexedDB. Soak de 4 h não entra no CI.

## Banco

Índices do caminho de leitura do convidado:

| Índice | Query |
|---|---|
| `uploads_feed` (0006) | Feed do evento, cursor `(created_at, id)` |
| `uploads_feed_por_missao` (0052) | Mesmo feed filtrado por missão |
| `uploads_por_sessao` (0005) | Galeria "minhas fotos" |
| `uploads_por_sessao_e_missao` (0052) | EXISTS "já fiz esta missão" |
| `comments_por_foto` (0008) | Thread por upload |
| PK `reactions (upload_id, session_id)` | Contagem e reação da sessão |

Não cachear o feed. Foto nova no segundo 11 de um TTL de 10 s some do grid — no salão isso é o produto quebrando.

`EXPLAIN ANALYZE` das queries acima depois de semear carga (`pnpm carga` + `CARGA_TOTAL` pequeno) e **antes** do primeiro evento real. Neon: pooler em transação (`DATABASE_URL`); `pg_dump` e migrations no endpoint direto (`DATABASE_URL_DIRECT`).

## Cache de identidade

`getGuestEvent` guarda pack + tokens em memória por **60 s** (`GUEST_EVENT_CACHE_TTL_MS`). Dezenas de aparelhos no mesmo evento batem o mesmo JSON; 60 s de atraso depois de o casal mudar a paleta é aceitável. Evento ausente **não** entra no cache.

HTTP: `Cache-Control: private, max-age=30` no JSON do evento — `private` para o CDN não servir tema de um evento a outro. Feed, reação e comentário continuam `no-store`.

Workers não compartilham o Map entre isolados: o ganho é por isolado, na rajada. Redis só entra se um sábado real mostrar saturacão de `carregarEventoPublico` **depois** desse TTL.

## CDN / R2

O PUT presigned **não** assina `Cache-Control`. `signPut` usa `allHeaders: false` de propósito: o navegador manda o Content-Type dele e a assinatura não quebra. Cache de mídia é **regra no Cloudflare** no domínio de leitura, não header no PUT.

Ver `docs/infra/CDN.md`.

## Orçamentos já no CI

- Lighthouse CI (rota do convidado)
- `pnpm bundle:budget` na rota do convidado
- Carga `fumaca` semanal; `gate` manual antes do 1º evento
