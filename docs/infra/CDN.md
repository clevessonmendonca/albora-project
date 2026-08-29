# CDN — mídia no Cloudflare

Leituras de foto passam pelo domínio de mídia com cache. O **upload** continua PUT presigned direto no R2; o servidor nunca toca nos bytes.

## Por que não Cache-Control no PUT

`signPut` (`apps/web/lib/infrastructure/storage/r2-client.ts`) assina só a query (`allHeaders: false`). Incluir `Cache-Control` na assinatura faria o PUT do browser falhar quando o header não bate. Não assinar header extra no PUT.

Cache de leitura = **Cache Rule** no hostname de mídia (custom domain do R2 ou worker de GET).

## Regras recomendadas

No dashboard Cloudflare → o hostname que serve GET de mídia → Caching → Cache Rules:

| Prefixo da chave | Edge TTL | Browser |
|---|---|---|
| `events/*/uploads/*` e `events/*/thumbs/*` | 1 ano | `public, max-age=31536000, immutable` |
| `events/*/book/*` | 1 dia | `public, max-age=86400, stale-while-revalidate=3600` |
| demais | respeitar origem | — |

Bypass de cache em `PUT`, `HEAD` de inspeção (Range dos magic bytes no confirm) e URLs com query de assinatura AWS se o GET presigned for o caminho atual. Se a leitura pública for custom domain **sem** query string (R2 public bucket / worker que autoriza), a regra acima aplica.

Hoje os GETs de convidado são presigned (`signGet`). Cache compartilhado só vale depois de um hostname estável sem assinatura por objeto — até lá a regra não reduz custo de Class B. Documentar a virada quando o domínio `media.` estiver no ar com worker de leitura.

## O que não cachear na borda

- JSON de feed, comentários, reações
- Presign / confirm
- Health checks

JSON de identidade do evento: `private, max-age=30` (browser only).

## Transformações

Sem image transform na borda no MVP. Resize e EXIF saem no cliente antes do PUT. Conversão AVIF/WebP server-side é Fase 11 (custo de storage), fora do caminho crítico.
