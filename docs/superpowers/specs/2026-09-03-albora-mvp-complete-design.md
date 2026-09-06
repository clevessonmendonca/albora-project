# Albora MVP Complete — Design Spec

**Data:** 2026-09-03
**Escopo:** Todas as superfícies (Web, Mobile, Landing, Telão) × 7 dimensões (feature completeness, tech debt, UX, scale readiness, segurança, acessibilidade, performance)
**Abordagem:** C — Ondas balanceadas de 2 semanas
**Branch base:** `feat/discovery-agosto-2026` (117 arquivos ahead de `stable`)

---

## 1. Estado Atual — Síntese da Auditoria

### 1.1 Web App (apps/web)
- **108 API routes**, ~68 páginas, **213 testes**
- Arquitetura limpa: `route.ts` → `handler` → `use-case` → `infrastructure`
- **Upload pipeline:** production-grade (presign R2, rate limit, quota, funnel tracking, offline-first IndexedDB queue, SW)
- **Moderation:** review queue com bulk actions, panic switch, "modo endurecido", threshold por denúncia
- **Export:** Google Drive OAuth completo com queue/worker/scheduler + ZIP export
- **Billing:** Asaas real (PIX/cartão), plan enforcement server-side em 6+ pontos, vendor subscriptions
- **Insights:** dashboard de growth-thesis (funil QR→upload, participation %, drop-off detection, hourly histogram)
- **Identity:** token resolver compartilhado entre admin preview, guest UI, telão e PDF

### 1.2 Mobile App (apps/mobile)
- **16 telas** Expo Router, **80 módulos src**, **31 testes unitários**
- Camera com filtros Skia ao vivo, fila offline durável (IndexedDB + background fetch 15min)
- Session handoff web→mobile: código de 4 dígitos + passagem one-shot deep link
- Universal links (iOS) + App Links (Android) configurados
- Shared packages: `@albora/core`, `@albora/packs`, `@albora/tokens`, `@albora/ui-native`

### 1.3 Telão (wall-display)
- Pairing por código 6-char (excluindo chars ambíguos), badge cookie separado do guest session
- **11 modelos de layout** (spec original dizia 4) — todos respeitam regra "nunca cortar vertical"
- Rotation com peso (nunca-exibida 0.5 / recente 0.25 / popular 0.25) + half-life decay
- Panic switch via spacebar/P no próprio telão + admin dashboard
- Participation counter (fotos + pessoas distintas)

### 1.4 Landing Page (apps/web/app/landing)
- **17 seções** incluindo PhotoCorridor (scroll-driven 3D) e ChoresEliminated (strikethrough hover)
- Token system propagando identidade visual
- Sitemap.ts implementado, SEO básico presente

### 1.5 Segurança
- **RLS FORCE** no catálogo Postgres (ENABLE + FORCE + policy expressions)
- Cookies: HttpOnly, SameSite=Lax, Secure
- CSP headers em `next.config.ts`
- CI: `security.yml` workflow dedicado + guards de isolamento/tokens no pre-push
- EXIF stripping client-side (parser custom + reencode)
- Presign: auth + scoping + rate limit + MIME/size validation
- `.env` gitignored, `CRON_SECRET` para jobs ops

### 1.6 Acessibilidade
- ARIA em 104/336 arquivos `.tsx`
- Skip link compartilhado (`packages/ui-web/src/skip-link.tsx`) em ~19 shells
- Focus-visible global (`:focus-visible { outline: 2px solid var(--acento-texto) }`)
- `prefers-reduced-motion` em 3 stylesheets + JS checks em componentes com animação
- Contrast tokens computados mecanicamente (`acentoLegivelSobre()`, `textoSobre()`)
- `aria-live` local em 8 arquivos (toast, offline banner, feed, etc.)

### 1.7 Performance
- Code splitting via `dynamic()` (Viewer, ShareConsentSheet, etc.)
- Service worker hand-rolled com cache-first/network-first versionado
- Lighthouse CI: perf≥85, a11y≥90, CLS<0.1 — wired to GitHub Actions
- Web Vitals collector custom (LCP/FCP/CLS/INP/TTFB via PerformanceObserver + sendBeacon)
- Fonts self-hosted woff2 com `font-display: swap`
- Apenas 4 arquivos CSS, zero CSS-in-JS runtime

---

## 2. Mapa de Gaps — Classificação Completa

### 2.1 BLOCKING (sem isso não roda evento real com segurança)

#### B1 — Jobs de retenção sem trigger configurado
- **O que:** Lógica de retenção LGPD implementada em `tools/jobs/retention.mjs` + `/api/ops/retencao` (330d nudge, 358d warning, 365d delete com `pg_advisory_xact_lock`, R2 purge, Drive token revoke). Mas NENHUM scheduler chama esses jobs.
- **Onde:** Nenhum cron em `.github/workflows/`, nenhum `vercel.json` com triggers, nenhum `wrangler.toml` com crons.
- **Risco:** LGPD compliance é promessa, não enforcement. Dado de convidado pode ficar pra sempre.
- **Fix:** GitHub Actions scheduled workflow ou Vercel Cron com `CRON_SECRET`.
- **Esforço:** ~2h
- **Arquivos:** `.github/workflows/retention-cron.yml` (novo), `.github/workflows/drive-export-cron.yml` (novo), `.github/workflows/analytics-snapshots-cron.yml` (novo)

#### B2 — Load test 150 uploads/20min nunca executado
- **O que:** Gate MVP explícito no CLAUDE.md. Sem evidência de load test no repo.
- **Risco:** Primeiro evento real com 150 convidados pode estourar rate limits, esgotar conexões Postgres, ou saturar R2.
- **Fix:** Script k6 ou Artillery simulando 150 uploads concorrentes contra staging.
- **Esforço:** ~4h (script + staging deploy + execução + tuning)
- **Arquivos:** `tools/load-test/upload-stress.js` (novo), `tools/load-test/README.md` (novo)

#### B3 — Zero `next/image` em produto de fotos
- **O que:** Todas as 12 tags `<img>` são raw HTML. Só 4 têm `loading="lazy"`. Sem srcset, sem AVIF/WebP negotiation, sem responsive sizing.
- **Risco:** LCP ruim no feed/album (onde a foto É o conteúdo), bandwidth alto em mobile, CLS por imagens sem dimensão.
- **Fix:** Migrar para `next/image` com `sizes`, `placeholder="blur"`, e loader R2 custom.
- **Esforço:** ~8h (loader + migração progressiva + testes visuais)
- **Arquivos:** `apps/web/lib/image-loader.ts` (novo), `apps/web/features/feed/components/client/post.tsx`, `apps/web/features/feed/components/client/frame.tsx`, `apps/web/app/landing/sections/*.tsx`

#### B4 — Credenciais EAS reais ausentes
- **O que:** `eas.json` tem placeholders para Apple/Google. Sem TestFlight build, sem Internal Track.
- **Risco:** Mobile não pode ser testado em device real por beta testers antes do evento.
- **Fix:** Configurar Apple Developer + Google Play Console, gerar primeiro build, distribuir TestFlight.
- **Esforço:** ~4h (burocracia de loja + primeiro build + smoke test)
- **Arquivos:** `apps/mobile/eas.json`, `apps/mobile/app.config.ts`

### 2.2 IMPORTANT (funciona mas com risco, UX degradada, ou dívida)

#### I1 — Sem draft/publish gate no evento
- **O que:** Evento fica "ao vivo" puramente por data (`comecaEm <= now`). Host não pode criar evento e deixar privado até decidir compartilhar.
- **Risco:** Convidado acessa QR antes da hora (link vazado, teste de QR printer).
- **Fix:** Campo `status: draft | active | ended` em `events`, check no `resolverSlug()`.
- **Esforço:** ~4h
- **Arquivos:** `packages/db/src/migrations/XXXX-event-status.sql`, `apps/web/lib/domain/event/`, `apps/web/app/e/[slug]/page.tsx`, `apps/web/features/admin/components/client/event-controls.tsx`

#### I2 — Feed e telão sem real-time (polling only)
- **O que:** Feed guest: 30s poll. Telão: 6s poll + 8s rotation = até 14s latência. Zero SSE/WebSocket no codebase.
- **Risco:** Telão parece "lento" quando 150 pessoas estão tirando foto e a tela demora 14s pra mostrar.
- **Fix:** SSE no telão (prioridade maior que feed — telão é visível pra todos). Feed pode manter polling.
- **Esforço:** ~8h (SSE endpoint + client migration + fallback to polling)
- **Arquivos:** `apps/web/app/api/wall/stream/route.ts` (novo), `apps/web/features/wall/lib/use-wall-display.ts`

#### I3 — Route announcer global SPA ausente
- **O que:** `aria-live` usado localmente em 8 arquivos, mas sem announcer de navegação client-side. Screen readers não recebem "página mudou" em soft navigation.
- **Fix:** Componente `RouteAnnouncer` no root layout que anuncia título da página em `aria-live="polite"`.
- **Esforço:** ~2h
- **Arquivos:** `apps/web/app/e/[slug]/layout.tsx`, `packages/ui-web/src/route-announcer.tsx` (novo)

#### I4 — `prefers-reduced-motion` opt-in por regra
- **O que:** Guard existe em 3 stylesheets + JS, mas é per-animation. Animações novas podem escapar.
- **Fix:** Blanket `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }` no base.css, com opt-out explícito para animações que são informação (progress bars, etc.).
- **Esforço:** ~1h
- **Arquivos:** `apps/web/app/base.css`

#### I5 — Billing history UI thin
- **O que:** Checkout e webhook funcionam, mas host não tem página "minhas faturas".
- **Fix:** Página `/admin/billing` listando transações do Asaas via API.
- **Esforço:** ~6h
- **Arquivos:** `apps/web/app/admin/billing/page.tsx` (novo), `apps/web/lib/api/handlers/admin-billing.ts` (novo), `apps/web/lib/billing/provider.ts`

#### I6 — Vendor self-serve onboarding ausente
- **O que:** Backend multi-tenancy pronto (RLS, `vendors` table, `vendor_members`, brand_tokens JSONB). Mas sem UI de criar vendor, editar branding, ou convidar equipe. Vendors precisam ser criados via DB direto.
- **Fix:** Página `/admin/vendor/new`, `/admin/vendor/[id]/settings`, `/admin/vendor/[id]/team`.
- **Esforço:** ~16h
- **Arquivos:** `apps/web/app/admin/vendor/new/page.tsx` (novo), `apps/web/app/admin/vendor/[vendorId]/settings/page.tsx` (novo), `apps/web/app/admin/vendor/[vendorId]/team/page.tsx` (novo), `apps/web/lib/api/handlers/admin-vendor.ts` (novo), `packages/db/src/vendor-portal.ts`

#### I7 — Push notifications não-implementado
- **O que:** Zero código FCM/APNs em qualquer lugar. Nem stub. Decisão explícita (ADR 0009).
- **Nota:** Greenfield quando decidir implementar. Não é bug, é backlog deliberado.
- **Esforço:** ~20h quando priorizado

#### I8 — Missões são pack-catalog only
- **O que:** Admin pode toggle on/off e adicionar custom text dentro do framework de packs, mas não criar missões totalmente livres com foto-exemplo, deadline, recompensa.
- **Nota:** Funcional pra MVP. Custom missions é feature de escala.
- **Esforço:** ~8h quando priorizado

#### I9 — Bundle budget script dangling
- **O que:** `next.config.ts` referencia `BUNDLE_BUDGET_BUILD` mas script não existe em `package.json`.
- **Fix:** Implementar script ou remover referência.
- **Esforço:** ~2h
- **Arquivos:** `apps/web/next.config.ts`, `apps/web/package.json`

### 2.3 NICE-TO-HAVE

#### N1 — QR page só print, sem download direto
- **O que:** Admin page `/qrcode` usa `window.print()`. Sem botão "baixar PNG" ou "baixar PDF". PDF machinery existe em `domain/book/generate-piece-pdf.ts` mas em rota separada.
- **Esforço:** ~3h

#### N2 — Docs dizem 4 modelos telão, código tem 11
- **O que:** `CLAUDE.md`/`docs/flows.md` §5.0 fala "quatro modelos", mas `packages/core/src/wall-display.ts` define 11 (`polaroide`, `mural`, `colagem`, `ambiente`, `cheio`, `carrossel`, `dump`, `tbt`, `grade`, `destaque`, `mosaico`).
- **Fix:** Atualizar docs.
- **Esforço:** ~30min

#### N3 — WhatsApp é share-link, não API
- **O que:** `wa.me/?text=` deep link. Sem Twilio/Z-API/WhatsApp Business.
- **Nota:** Suficiente pra MVP. API de mensageria é feature de escala/vendor.

#### N4 — Sem export CSV de métricas de insights
- **Esforço:** ~2h quando priorizado

---

## 3. Arquitetura das Soluções

### 3.1 Cron de retenção (B1)

```yaml
# .github/workflows/retention-cron.yml
name: Retention jobs
on:
  schedule:
    - cron: '0 4 * * *'  # 04:00 UTC diário
  workflow_dispatch: {}
jobs:
  retention:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -sf -X POST "${{ secrets.APP_URL }}/api/ops/retencao" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

Mesmo padrão para `drive-export` e `analytics-snapshots`. Alternativa: Vercel Cron se deploy for Vercel.

### 3.2 Image loader R2 (B3)

```typescript
// apps/web/lib/image-loader.ts
import type { ImageLoaderProps } from 'next/image';

const R2_PUBLIC = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

export function alboraImageLoader({ src, width, quality }: ImageLoaderProps) {
  if (src.startsWith('/')) return src; // local assets
  // R2 + Cloudflare Image Resizing
  const q = quality || 75;
  return `${R2_PUBLIC}/cdn-cgi/image/width=${width},quality=${q},format=auto/${src}`;
}
```

Requer Cloudflare Image Resizing habilitado no R2 bucket (incluso no plano, sem custo extra).

### 3.3 SSE no telão (I2)

```typescript
// apps/web/app/api/wall/stream/route.ts
export async function GET(req: Request) {
  const wall = await wallFromRequest(req);
  if (!wall) return new Response(null, { status: 401 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Poll DB a cada 2s, push diff para o client
      const interval = setInterval(async () => {
        const media = await listarMidiaDaParede(wall.eventoId, { limit: 20 });
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(media)}\n\n`));
      }, 2000);
      req.signal.addEventListener('abort', () => clearInterval(interval));
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
```

Client fallback: se SSE falhar, volta pro polling 6s existente. Latência cai de ~14s para ~2-3s.

### 3.4 Draft/publish gate (I1)

Migration:
```sql
ALTER TABLE events ADD COLUMN status TEXT NOT NULL DEFAULT 'draft'
  CHECK (status IN ('draft', 'active', 'ended'));

-- Eventos existentes ficam active (não quebrar nada)
UPDATE events SET status = 'active' WHERE status = 'draft';
```

`resolverSlug()` retorna `rascunho` para `status = 'draft'` (nova branch no switch). Guest vê tela "Evento ainda não disponível" sem revelar dados.

Admin: botão "Publicar evento" no `event-controls.tsx` fazendo `PATCH /api/admin/events/{id}` com `{ status: 'active' }`.

### 3.5 Route announcer (I3)

```typescript
// packages/ui-web/src/route-announcer.tsx
'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

export function RouteAnnouncer() {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const title = document.title;
    if (ref.current && title) {
      ref.current.textContent = title;
    }
  }, [pathname]);

  return (
    <div
      ref={ref}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    />
  );
}
```

Montado uma vez no root layout de cada superfície (guest, admin).

### 3.6 Reduced motion blanket (I4)

```css
/* apps/web/app/base.css — adicionar ao final */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Animações informativas (progress bar, upload arc) usam `animation-duration` inline que sobrescreve o `!important` quando necessário, com classe `.motion-safe` explícita.

---

## 4. Plano de Ondas — Detalhado

### Onda 1 — Ship-blocking (Semanas 1-2)

**Objetivo:** Tornar o produto seguro para o primeiro evento real.

| # | Task | Dim | Esforço | Deps | Critério de aceite |
|---|---|---|---|---|---|
| 1.1 | Cron retenção + drive-export + analytics | Infra | 2h | — | Jobs rodam diariamente em staging, logs no Actions |
| 1.2 | R2 image loader + `next/image` migration (feed, album, recap) | Perf | 8h | — | LCP < 2.5s no feed com 20 fotos, Lighthouse perf ≥ 85 mantido |
| 1.3 | Load test 150 uploads/20min | QA | 4h | Staging deploy | Script roda sem erro, P95 < 3s por upload, zero 500s |
| 1.4 | EAS credentials + TestFlight build | Mobile | 4h | Apple Dev account | Build instalável no TestFlight |
| 1.5 | Route announcer global | A11y | 2h | — | VoiceOver anuncia título ao navegar entre rotas |
| 1.6 | Draft/publish toggle | Feature | 4h | — | Evento criado começa draft, guest vê "não disponível", admin publica |
| 1.7 | `next/image` na landing (hero, book, experience) | Perf | 3h | 1.2 (loader) | Todas as imgs da landing com sizes + lazy + format=auto |
| 1.8 | Reduced motion blanket | A11y | 1h | — | Zero animação visível com `prefers-reduced-motion: reduce` |

**Total Onda 1:** ~28h

### Onda 2 — Confiança (Semanas 3-4)

**Objetivo:** Provar que funciona sob estresse e edge cases.

| # | Task | Dim | Esforço | Deps | Critério de aceite |
|---|---|---|---|---|---|
| 2.1 | SSE no telão | Feature | 8h | — | Foto aparece no telão em < 3s após upload |
| 2.2 | E2E smoke (QR→consent→capture→upload→confirm→telão) | QA | 8h | — | Playwright test passa em CI |
| 2.3 | Bundle budget script real | Perf | 2h | — | `pnpm bundle:budget` roda e falha se JS > threshold |
| 2.4 | Billing history page | Feature | 6h | — | Host vê lista de transações com status |
| 2.5 | Moderação adversarial test | Segurança | 4h | — | Report com cenários: flood, bypass, NSFW edge, rate limit |
| 2.6 | Mobile E2E básico (pair→feed→capture→upload) | QA | 6h | 1.4 | Maestro/Detox test passa localmente |
| 2.7 | Docs reconciliation (4 vs 11 modelos telão) | Docs | 1h | — | `docs/flows.md` §5.0 atualizado |
| 2.8 | Landing SEO (structured data Event, OG dinâmico) | Growth | 4h | — | Rich snippet no Google Search Console preview |

**Total Onda 2:** ~39h

### Onda 3 — Escala + Growth (Semanas 5-6)

**Objetivo:** Preparar para múltiplos eventos simultâneos e vendor white-label.

| # | Task | Dim | Esforço | Deps | Critério de aceite |
|---|---|---|---|---|---|
| 3.1 | Vendor onboarding UI (create + branding + team) | Feature | 16h | — | Vendor se cadastra, configura marca, convida staff |
| 3.2 | QR download PNG/PDF direto | UX | 3h | — | Botão "Baixar PNG" e "Baixar PDF" na página /qrcode |
| 3.3 | Observabilidade (alertas Sentry por rota crítica) | Infra | 4h | — | Alert rules para upload, presign, wall, billing |
| 3.4 | Telão teste em TV real | UX | 4h | 2.1 | Report com fotos de 3 TVs, legibilidade a 5m confirmada |
| 3.5 | Insights CSV export | Feature | 2h | — | Botão "Exportar CSV" no admin insights |
| 3.6 | Push notifications (spike) | Feature | 4h | — | Spike: viabilidade + custo + ADR decision |
| 3.7 | Custom missions (beyond pack catalog) | Feature | 8h | — | Admin cria missão livre com emoji, texto, deadline |
| 3.8 | Consent admin dashboard | Feature | 4h | — | Admin vê versões de consentimento + contagem por versão |

**Total Onda 3:** ~45h

**Total geral: ~112h (~3 semanas de trabalho efetivo, distribuídas em 6 semanas com margem)**

---

## 5. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| R2 Image Resizing não habilitado no bucket | Média | B3 falha | Verificar com `curl` antes de migrar; fallback: sharp serverless function |
| Apple rejeita primeiro build (metadata) | Alta | B4 atrasa | Submeter metadata + screenshots 5 dias antes do build |
| SSE não funciona atrás de proxy/CDN do venue | Média | I2 sem efeito | Fallback automático para polling; testar com Cloudflare no meio |
| Load test revela gargalo Postgres | Média | B2 bloqueia | Connection pooling (PgBouncer), prepared statements, índices no upload path |
| Vendor onboarding escopo cresce | Alta | 3.1 estoura | Fase 1: só criação + branding. Team invite na Onda 4. |

---

## 6. Decisões Arquiteturais Implícitas

### 6.1 Polling vs SSE vs WebSocket
**Decisão:** SSE apenas no telão; feed guest mantém polling.
**Razão:** Telão é uma conexão long-lived (TV plugada), SSE é perfeito. Feed guest tem centenas de conexões simultâneas em mobile com sinal instável — polling com interval adaptativo é mais resiliente.

### 6.2 `next/image` com loader custom vs sharp serverless
**Decisão:** Cloudflare Image Resizing (se R2) ou Vercel Image Optimization (se Vercel).
**Razão:** Zero infra própria, zero cold start, incluso no plano. Sharp serverless só como fallback.

### 6.3 Draft gate vs "não compartilhar o QR"
**Decisão:** Implementar campo `status` real.
**Razão:** "Não compartilhar" depende de comportamento humano. QR impresso em gráfica 3 dias antes pode ser testado/vazado. Gate programático é mais seguro.

### 6.4 Blanket reduced-motion vs per-animation
**Decisão:** Blanket com opt-out explícito.
**Razão:** Opt-in falha por omissão (dev esquece de adicionar). Blanket é safe-by-default. Progress bars e upload arcs que são informação (não decoração) recebem classe `.motion-essential` que sobrescreve.

---

## 7. Métricas de Sucesso

| Métrica | Target Onda 1 | Target Onda 3 |
|---|---|---|
| LCP feed com 20 fotos | < 2.5s | < 1.8s |
| Lighthouse perf (guest route) | ≥ 85 | ≥ 90 |
| Lighthouse a11y | ≥ 90 | ≥ 95 |
| Upload P95 latência | < 3s | < 2s |
| Telão latência foto→tela | < 14s (polling) | < 3s (SSE) |
| Cobertura de testes | ≥ 60% global, ≥ 90% upload | ≥ 80% global |
| E2E smoke | manual | CI green |
| Retenção LGPD | cron configurado | 100% eventos expirados processados |
| Participação H1 (primeiro evento) | ≥ 40% | ≥ 40% com dados reais |

---

## 8. Fora de Escopo — Reanálise Completa (2026-09-03)

Cada item reanalisado independente dos ADRs, com base na infra existente, complexidade restante e valor de produto.

| Item | Infra existente | Custo restante | Valor | Veredito |
|---|---|---|---|---|
| A. Site/RSVP/presentes | Só tokens/i18n | G-GG (200h+) | Baixo-médio | **KEEP OUT** |
| B. IA classificação | Plugável, heurístico | P-M (16-32h/módulo) | Alto (curadoria livro) | **BRING IN parcial** |
| C. Conta cross-evento | Zero | M-GG | Baixo, sem demanda | **KEEP OUT** |
| D. Push notifications | DI `notify` pronta, zero deps | M (40-56h) | Médio, 2-3 gatilhos | **SPIKE FIRST** |
| E. WhatsApp API | Só link wa.me manual | M-G | Médio-alto, caro em escala | **KEEP OUT** |
| F. Admin mobile | 14 telas desenhadas em catálogo | M MVP (24-32h) | Alto no dia D (segurança) | **SPIKE → BRING IN MVP** |
| G. Livro impresso | Motor PDF+CMYK profissional pronto | P manual (8-16h) | Alto | **BRING IN fake door** |

### Detalhes por item

**A) Site/RSVP/presentes — KEEP OUT.** Concorre com ferramentas gratuitas (Zankyou, iCasei). Fase 4 no roadmap com condições de entrada explícitas. Não agrega valor diferencial.

**B) IA classificação — BRING IN parcial (Onda 3/4, pós-H1).** ADR 0007 já autoriza classificação (moderação + curadoria do livro). Interface plugável existe. Geração na mídia permanece KEEP OUT permanente — regra não negociável.

**C) Conta cross-evento — KEEP OUT.** ADR mais deliberado dos 7. Zero evidência de demanda. Reabertura implica repensar RLS, tenancy e o princípio "sem login". Gatilho de reabertura não disparou.

**D) Push notifications — SPIKE FIRST (Onda 3, pós-H1).** Infraestrutura `notify` com DI já desenhada. Só 2-3 gatilhos fazem sentido (gate aberto, recap pronto). Precisa ADR próprio. ~40-56h total.

**E) WhatsApp Business API — KEEP OUT.** Custo por evento pode comer margem. Validar primeiro via X6 (concierge manual). Automatizar só com evidência de ROI.

**F) Admin mobile — SPIKE FIRST curto → BRING IN MVP.** 14 telas mobile-first já desenhadas em catálogo (`apps/web/app/telas-admin/`) mas não conectadas ao admin real. MVP: pânico + moderação + painel ao vivo (~24-32h). Justificável como exceção de robustez — segurança do caminho crítico, não feature nova.

**G) Livro impresso — BRING IN via fake door manual.** Motor de PDF completo (~2.177 linhas) com sangria 3mm, fontes embarcadas, tokens resolvidos. Runbook CMYK profissional com perfis ICC (FOGRA39). Fake door manual (X9, D+30 pós-H1) = ~8-16h. SKU automatizado fica bloqueado pelo congelamento.

> **Nota:** Todos os itens BRING IN e SPIKE estão dentro do congelamento de features (`docs/product/congelamento-de-features.md`). Execução requer decisão explícita e registrada do fundador.

---

## Aprovação

Este spec cobre o caminho completo QR→upload→telão→export em 3 ondas de ~2 semanas. Nenhum fluxo inteiro está faltando — os gaps são de infra (cron), otimização (images), e polish (draft gate, SSE, a11y).

O gap mais crítico é **B1 (cron de retenção)** — 2h de trabalho que transforma compliance de promessa em enforcement.
