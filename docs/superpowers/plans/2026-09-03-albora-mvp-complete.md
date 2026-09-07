# Albora MVP Complete — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar todos os gaps blocking e important do MVP para o primeiro evento real com segurança, performance e acessibilidade.

**Architecture:** Next.js 15 RSC + Postgres RLS + R2 presigned upload. Monorepo pnpm com 6 packages `@albora/*`. Vitest para testes. GitHub Actions CI/CD.

**Tech Stack:** Next.js 15.5, React 19, Postgres, R2 (Cloudflare), Expo (mobile), Vitest, Playwright, k6

**Spec:** `docs/superpowers/specs/2026-09-03-albora-mvp-complete-design.md`

## Global Constraints

- **Node 22 required.** Shell padrão tem Node 16. Usar: `source ~/.nvm/nvm.sh && nvm use 22`
- **RLS FORCE** em toda tabela com `event_id`. Policy: `event_id = NULLIF(current_setting('app.event_id', true), '')::uuid`
- **Sempre `SET LOCAL`**, nunca `SET`. Pooling em modo transação.
- **Migrations forward-only.** Nunca reescrever migration aplicada.
- **Zero hex hardcodado em componente.** Toda cor vem de token.
- **Zero string de domínio no core.** Tudo resolve via pack.
- **Commits:** Conventional Commits com escopo — `feat(upload):`, `fix(telao):`, `docs(adr):`
- **Deploy ladder:** PRs vão para `stable`. Promoção explícita para `homol` → `main`.
- **Anti-padrões visuais bloqueantes:** glassmorphism, neon, gradiente roxo, dark mode "tech", fonte script, verde sage, rosa blush, ícone aliança/pombinha/coração.

---

## Onda 1 — Ship-Blocking (Semanas 1-2)

### Task 1: Cron de retenção LGPD + drive-export + analytics snapshots

**Files:**
- Create: `.github/workflows/retention-cron.yml`
- Create: `.github/workflows/drive-export-cron.yml`
- Create: `.github/workflows/analytics-snapshots-cron.yml`
- Verify: `apps/web/app/api/ops/retencao/route.ts` (já existe, handler em `@/lib/api/handlers/ops-retencao`)

**Interfaces:**
- Consumes: `POST /api/ops/retencao` (existente), `POST /api/ops/drive-export` (existente), `POST /api/ops/analytics-snapshots` (existente)
- Produces: GitHub Actions scheduled workflows que chamam esses endpoints diariamente

**Contexto:** A lógica de retenção LGPD (330d nudge, 358d warning, 365d delete com `pg_advisory_xact_lock`, R2 purge, Drive token revoke) está implementada em `tools/jobs/retention.mjs` + `/api/ops/retencao`. Mas NENHUM scheduler chama esses jobs. "Retenção é cumprida por job, não por promessa" — hoje é promessa.

- [ ] **Step 1: Verificar endpoints ops existentes**

```bash
ls apps/web/app/api/ops/
```

Confirmar que `retencao/`, `drive-export/` (ou similar) e `analytics-snapshots/` (ou similar) existem. Anotar nomes exatos.

- [ ] **Step 2: Verificar autenticação dos endpoints ops**

```bash
grep -rn "CRON_SECRET\|cronSecret\|ops.*auth" apps/web/lib/api/handlers/ops-retencao.ts
```

Confirmar que endpoint exige `Authorization: Bearer $CRON_SECRET`.

- [ ] **Step 3: Criar workflow de retenção**

```yaml
# .github/workflows/retention-cron.yml
name: Retention jobs (LGPD)

on:
  schedule:
    - cron: "0 4 * * *"
  workflow_dispatch: {}

concurrency:
  group: retention-cron
  cancel-in-progress: false

jobs:
  retention:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Trigger retention endpoint
        run: |
          curl -sf -X POST "${{ secrets.APP_URL }}/api/ops/retencao" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json" \
            --max-time 120
```

- [ ] **Step 4: Criar workflow de drive-export**

Mesmo padrão, endpoint `/api/ops/drive-export` (verificar nome exato no Step 1). Cron `"30 4 * * *"` (30min após retenção).

- [ ] **Step 5: Criar workflow de analytics-snapshots**

Mesmo padrão, endpoint `/api/ops/analytics-snapshots` (verificar nome exato). Cron `"0 5 * * *"`.

- [ ] **Step 6: Testar localmente com curl**

```bash
source ~/.nvm/nvm.sh && nvm use 22
curl -sf -X POST "http://localhost:3000/api/ops/retencao" \
  -H "Authorization: Bearer $(grep CRON_SECRET .env | cut -d= -f2)"
```

Esperado: 200 OK com JSON de resultado.

- [ ] **Step 7: Commit**

```bash
git add .github/workflows/retention-cron.yml .github/workflows/drive-export-cron.yml .github/workflows/analytics-snapshots-cron.yml
git commit -m "feat(infra): add scheduled cron workflows for LGPD retention, drive-export, analytics

Three GitHub Actions scheduled workflows that call existing /api/ops/* endpoints daily.
Closes gap B1 — retention is now enforcement, not just a promise."
```

---

### Task 2: R2 image loader + next/image migration (feed, album, recap)

**Files:**
- Create: `apps/web/lib/image-loader.ts`
- Create: `apps/web/lib/image-loader.test.ts`
- Modify: `apps/web/next.config.ts` (add `images.loader`)
- Modify: `apps/web/features/feed/components/client/post.tsx` (raw `<img>` → `<Image>`)
- Modify: `apps/web/features/album/components/ui/album-cover-hero.tsx`
- Modify: `apps/web/features/cover/components/ui/cover-hero.tsx`
- Modify: `apps/web/features/cover/components/ui/moment-card.tsx`
- Modify: `apps/web/features/wall/components/client/wall-stage.tsx`
- Modify: `apps/web/features/photo/components/client/queue-panel.tsx`

**Interfaces:**
- Consumes: `process.env.NEXT_PUBLIC_R2_PUBLIC_URL` (env var existente)
- Produces: `alboraImageLoader(props: ImageLoaderProps): string` — usado por `next.config.ts` como loader global

- [ ] **Step 1: Escrever teste do image loader**

```typescript
// apps/web/lib/image-loader.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// mock env before import
vi.stubEnv("NEXT_PUBLIC_R2_PUBLIC_URL", "https://media.albora.app");

const { alboraImageLoader } = await import("./image-loader");

describe("alboraImageLoader", () => {
  it("returns local path unchanged for relative src", () => {
    expect(alboraImageLoader({ src: "/landing/hero.webp", width: 800 }))
      .toBe("/landing/hero.webp");
  });

  it("builds R2 Image Resizing URL for remote src", () => {
    const url = alboraImageLoader({
      src: "events/abc/uploads/photo.jpg",
      width: 640,
      quality: 80,
    });
    expect(url).toBe(
      "https://media.albora.app/cdn-cgi/image/width=640,quality=80,format=auto/events/abc/uploads/photo.jpg"
    );
  });

  it("defaults quality to 75", () => {
    const url = alboraImageLoader({
      src: "events/abc/uploads/photo.jpg",
      width: 400,
    });
    expect(url).toContain("quality=75");
  });
});
```

- [ ] **Step 2: Rodar teste — deve falhar**

```bash
source ~/.nvm/nvm.sh && nvm use 22
pnpm vitest run apps/web/lib/image-loader.test.ts
```

Esperado: FAIL — `./image-loader` não existe.

- [ ] **Step 3: Implementar image loader**

```typescript
// apps/web/lib/image-loader.ts
import type { ImageLoaderProps } from "next/image";

const R2_PUBLIC = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "";

export function alboraImageLoader({ src, width, quality }: ImageLoaderProps): string {
  if (src.startsWith("/")) return src;
  const q = quality ?? 75;
  return `${R2_PUBLIC}/cdn-cgi/image/width=${width},quality=${q},format=auto/${src}`;
}
```

- [ ] **Step 4: Rodar teste — deve passar**

```bash
pnpm vitest run apps/web/lib/image-loader.test.ts
```

Esperado: 3 tests PASS.

- [ ] **Step 5: Registrar loader no next.config.ts**

Localizar o bloco `images` em `apps/web/next.config.ts`. Adicionar:

```typescript
images: {
  loader: "custom",
  loaderFile: "./lib/image-loader.ts",
},
```

Se já houver `images.remotePatterns`, manter. O `loader: "custom"` + `loaderFile` faz Next.js usar nosso loader pra todos os `<Image>`.

- [ ] **Step 6: Migrar primeiro componente — post.tsx**

Abrir `apps/web/features/feed/components/client/post.tsx`. Trocar:

```tsx
// ANTES
<img src={media.thumb} alt={...} loading="lazy" ... />

// DEPOIS
import Image from "next/image";
// ...
<Image
  src={media.thumb}
  alt={...}
  width={media.largura ?? 400}
  height={media.altura ?? 400}
  sizes="(max-width: 640px) 100vw, 50vw"
  className="..." // manter classes existentes
/>
```

Regra: manter toda classe CSS existente. Adicionar `sizes` baseado no layout do componente. `width`/`height` vêm dos metadados de mídia (campos `largura`/`altura` da API).

- [ ] **Step 7: Migrar album-cover-hero.tsx**

Mesmo padrão do Step 6. `sizes="100vw"` para hero fullwidth.

- [ ] **Step 8: Migrar cover-hero.tsx e moment-card.tsx**

Mesmo padrão. `sizes` de cover-hero: `"100vw"`. moment-card: `"(max-width: 640px) 50vw, 33vw"`.

- [ ] **Step 9: Migrar wall-stage.tsx**

Atenção: telão usa layout fullscreen. `sizes="100vw"` e `priority={true}` para a foto em exibição (é a LCP do telão).

- [ ] **Step 10: Migrar queue-panel.tsx**

Thumbnails pequenos na fila de upload. `sizes="80px"`, `width={80}`, `height={80}`.

- [ ] **Step 11: Verificar build**

```bash
source ~/.nvm/nvm.sh && nvm use 22
pnpm --filter @albora/web build
```

Esperado: build sem erros. Se houver erros de tipo em `<Image>`, ajustar props (`fill` vs `width/height`).

- [ ] **Step 12: Commit**

```bash
git add apps/web/lib/image-loader.ts apps/web/lib/image-loader.test.ts apps/web/next.config.ts apps/web/features/
git commit -m "feat(perf): add R2 image loader and migrate product images to next/image

Custom loader for Cloudflare Image Resizing via R2 cdn-cgi endpoint.
Migrates feed post, album hero, cover, wall stage, and queue panel
from raw <img> to next/image with proper sizes and format negotiation.
Closes gap B3."
```

---

### Task 3: Load test — 150 uploads em 20 minutos

**Files:**
- Create: `tools/load-test/upload-stress.mjs`
- Create: `tools/load-test/README.md`

**Interfaces:**
- Consumes: `POST /api/admin/events/{id}/presign` (presign existente), `PUT` para R2 presigned URL
- Produces: Report de latência P50/P95/P99, error rate, throughput

**Contexto:** Gate MVP explícito no CLAUDE.md: "teste de carga obrigatório antes do 1º evento: 150 uploads em 20 min". Nunca executado.

- [ ] **Step 1: Criar script de load test com k6**

```javascript
// tools/load-test/upload-stress.mjs
// Requer: npm i -g k6 (ou usar docker k6)
// Uso: k6 run tools/load-test/upload-stress.mjs --env BASE_URL=https://staging.albora.app --env EVENT_ID=xxx --env GUEST_TOKEN=xxx

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const uploadLatency = new Trend("upload_latency", true);
const uploadFailRate = new Rate("upload_fail_rate");

export const options = {
  scenarios: {
    wedding_rush: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 30 },
        { duration: "16m", target: 30 },
        { duration: "2m", target: 0 },
      ],
    },
  },
  thresholds: {
    upload_latency: ["p(95)<3000"],
    upload_fail_rate: ["rate<0.01"],
    http_req_failed: ["rate<0.01"],
  },
};

const SAMPLE_JPEG = open("./sample-400kb.jpg", "b");

export default function () {
  const base = __ENV.BASE_URL;
  const eventId = __ENV.EVENT_ID;
  const token = __ENV.GUEST_TOKEN;

  // Step 1: Presign
  const presignRes = http.post(
    `${base}/api/media/presign`,
    JSON.stringify({ mime: "image/jpeg", bytes: SAMPLE_JPEG.length }),
    {
      headers: {
        "Content-Type": "application/json",
        Cookie: `sessao_convidado=${token}`,
      },
    }
  );

  const presignOk = check(presignRes, {
    "presign 200": (r) => r.status === 200,
  });
  if (!presignOk) {
    uploadFailRate.add(1);
    return;
  }

  const { url, key } = presignRes.json();

  // Step 2: Upload to R2
  const uploadRes = http.put(url, SAMPLE_JPEG, {
    headers: { "Content-Type": "image/jpeg" },
  });

  const uploadOk = check(uploadRes, {
    "upload 200": (r) => r.status === 200,
  });

  // Step 3: Confirm
  const confirmRes = http.post(
    `${base}/api/media/confirm`,
    JSON.stringify({ key }),
    {
      headers: {
        "Content-Type": "application/json",
        Cookie: `sessao_convidado=${token}`,
      },
    }
  );

  check(confirmRes, { "confirm 200": (r) => r.status === 200 });

  uploadLatency.add(presignRes.timings.duration + uploadRes.timings.duration + confirmRes.timings.duration);
  uploadFailRate.add(!uploadOk ? 1 : 0);

  sleep(Math.random() * 4 + 1);
}
```

- [ ] **Step 2: Criar sample JPEG para teste**

```bash
# Gerar JPEG de ~400KB para simular foto de celular comprimida
convert -size 1200x1600 xc:gray +noise gaussian -quality 85 tools/load-test/sample-400kb.jpg 2>/dev/null \
  || python3 -c "
import os
with open('tools/load-test/sample-400kb.jpg', 'wb') as f:
    # JPEG mínimo válido (SOI + APP0 + corpo + EOI)
    f.write(bytes.fromhex('FFD8FFE000104A46494600010100000100010000'))
    f.write(os.urandom(400_000))
    f.write(bytes.fromhex('FFD9'))
"
```

- [ ] **Step 3: Criar README com instruções**

```markdown
<!-- tools/load-test/README.md -->
# Load Test — 150 uploads em 20 min

Gate MVP: CLAUDE.md exige este teste antes do primeiro evento real.

## Pré-requisitos
- k6 instalado (`brew install k6` ou Docker)
- Staging deployed
- Evento de teste criado com guest token

## Rodar
\`\`\`bash
k6 run tools/load-test/upload-stress.mjs \
  --env BASE_URL=https://staging.albora.app \
  --env EVENT_ID=<uuid> \
  --env GUEST_TOKEN=<token>
\`\`\`

## Critérios de aceite
- P95 latência < 3s por upload
- Error rate < 1%
- Zero HTTP 500
- 150+ uploads completados em 20 minutos
```

- [ ] **Step 4: Commit**

```bash
git add tools/load-test/
git commit -m "feat(qa): add k6 load test for 150 uploads in 20min

MVP gate: upload pipeline must survive wedding rush (150 concurrent
guests uploading over 20 minutes). Script tests presign→R2→confirm
flow with P95 < 3s threshold. Closes gap B2."
```

---

### Task 4: EAS credentials + primeiro build TestFlight

**Files:**
- Modify: `apps/mobile/eas.json`
- Modify: `apps/mobile/app.config.ts` (se necessário)

**Interfaces:**
- Consumes: Apple Developer account credentials, Google Play Console service account
- Produces: Build instalável no TestFlight + Internal Track

**Nota:** Task requer credenciais reais do Apple Developer Program e Google Play Console. Passos são procedurais, não TDD.

- [ ] **Step 1: Verificar eas.json atual**

```bash
cat apps/mobile/eas.json
```

Anotar quais campos são placeholder (ex: `"APPLE_TEAM_ID"`, `"GOOGLE_SERVICE_ACCOUNT"`).

- [ ] **Step 2: Configurar perfil de build iOS**

Substituir placeholders em `eas.json` → `build.preview`:

```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "<real-apple-id>",
        "ascAppId": "<real-asc-app-id>",
        "appleTeamId": "<real-team-id>"
      }
    }
  }
}
```

- [ ] **Step 3: Rodar primeiro build iOS**

```bash
cd apps/mobile
npx eas-cli build --platform ios --profile preview
```

- [ ] **Step 4: Distribuir no TestFlight**

```bash
npx eas-cli submit --platform ios --profile production --latest
```

- [ ] **Step 5: Smoke test no device real**

Instalar via TestFlight. Verificar: app abre, QR scan funciona, câmera abre, upload completa.

- [ ] **Step 6: Commit configurações**

```bash
git add apps/mobile/eas.json apps/mobile/app.config.ts
git commit -m "feat(mobile): configure EAS credentials for TestFlight distribution

Replaces placeholder values with real Apple Developer and Google Play
credentials. First preview build submitted to TestFlight. Closes gap B4."
```

---

### Task 5: Route announcer global para screen readers

**Files:**
- Verify: `packages/ui-web/src/route-announcer.tsx` (pode já existir — task #25 na sessão anterior)
- Modify: `apps/web/app/e/[slug]/layout.tsx` (se não montado)
- Modify: `apps/web/app/admin/layout.tsx` (se não montado)

**Interfaces:**
- Consumes: `usePathname()` de `next/navigation`
- Produces: `<RouteAnnouncer />` component — `aria-live="polite"` announcer montado nos root layouts

**Nota:** Sessão anterior completou task #25 "Route announcements via LiveAnnouncer". Verificar se está implementado e funcionando antes de re-implementar.

- [ ] **Step 1: Verificar se já existe**

```bash
find packages/ui-web/src -name '*announcer*' -o -name '*route*' | head -5
grep -rn "RouteAnnouncer\|LiveAnnouncer\|route-announcer" apps/web/app/ --include='*.tsx' | head -5
```

Se existir e estiver montado nos layouts, pular para Step 5 (verificar).

- [ ] **Step 2: Criar componente (se não existir)**

```typescript
// packages/ui-web/src/route-announcer.tsx
"use client";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export function RouteAnnouncer() {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const title = document.title;
    if (ref.current && title) {
      ref.current.textContent = "";
      requestAnimationFrame(() => {
        if (ref.current) ref.current.textContent = title;
      });
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

- [ ] **Step 3: Exportar do package (se criado)**

Adicionar `export { RouteAnnouncer } from "./route-announcer";` em `packages/ui-web/src/index.ts`.

- [ ] **Step 4: Montar nos root layouts (se não montado)**

Em `apps/web/app/e/[slug]/layout.tsx` e `apps/web/app/admin/layout.tsx`:

```tsx
import { RouteAnnouncer } from "@albora/ui-web";
// dentro do return, no final do body:
<RouteAnnouncer />
```

- [ ] **Step 5: Verificar com VoiceOver**

Abrir app no Safari, ligar VoiceOver (Cmd+F5). Navegar entre rotas. VoiceOver deve anunciar título da página a cada navegação.

- [ ] **Step 6: Commit (se houve mudança)**

```bash
git add packages/ui-web/src/ apps/web/app/
git commit -m "feat(a11y): add global route announcer for screen readers

Announces page title via aria-live on client-side navigation.
Mounted in guest and admin root layouts. Closes gap I3."
```

---

### Task 6: Draft/publish gate para eventos

**Files:**
- Create: `packages/db/migrations/0056_event_status.sql`
- Modify: `packages/db/src/events.ts` (resolverSlug + tipo Resolucao)
- Create: `packages/db/src/event-status.test.ts`
- Modify: `apps/web/features/admin/components/client/event-controls.tsx`
- Modify: `apps/web/app/e/[slug]/page.tsx`

**Interfaces:**
- Consumes: `resolverSlug(pool, slug, agora)` existente, retorna `Resolucao`
- Produces: Novo estado `"rascunho"` no tipo `Resolucao`, campo `status` na tabela `events`, endpoint `PATCH /api/admin/events/{id}` aceita `{ status: "active" }`

- [ ] **Step 1: Escrever migration**

```sql
-- packages/db/migrations/0056_event_status.sql
ALTER TABLE events
  ADD COLUMN status text NOT NULL DEFAULT 'draft'
  CONSTRAINT events_status_check CHECK (status IN ('draft', 'active', 'ended'));

-- Eventos existentes já são efetivamente "active"
UPDATE events SET status = 'active' WHERE TRUE;
```

- [ ] **Step 2: Escrever teste para resolverSlug com status draft**

```typescript
// packages/db/src/event-status.test.ts
import { describe, it, expect } from "vitest";
import { resolverSlug } from "./events";
import { criarPoolTeste, limparBanco, inserirEvento, inserirSlug } from "./test-helpers";

describe("resolverSlug com status", () => {
  const pool = criarPoolTeste();

  it("retorna 'rascunho' para evento com status draft", async () => {
    const eventoId = await inserirEvento(pool, {
      status: "draft",
      comecaEm: new Date(Date.now() - 3600_000),
      terminaEm: new Date(Date.now() + 3600_000),
    });
    await inserirSlug(pool, eventoId, "meu-evento-teste");

    const result = await resolverSlug(pool, "meu-evento-teste", new Date());
    expect(result.estado).toBe("rascunho");
  });

  it("retorna 'aberto' para evento com status active dentro do horário", async () => {
    const eventoId = await inserirEvento(pool, {
      status: "active",
      comecaEm: new Date(Date.now() - 3600_000),
      terminaEm: new Date(Date.now() + 3600_000),
    });
    await inserirSlug(pool, eventoId, "evento-ativo");

    const result = await resolverSlug(pool, "evento-ativo", new Date());
    expect(result.estado).toBe("aberto");
  });
});
```

- [ ] **Step 3: Rodar teste — deve falhar**

```bash
source ~/.nvm/nvm.sh && nvm use 22
pnpm vitest run packages/db/src/event-status.test.ts
```

Esperado: FAIL — coluna `status` não existe ou `resolverSlug` não checa status.

- [ ] **Step 4: Aplicar migration em dev**

```bash
pnpm db:migrate
```

- [ ] **Step 5: Atualizar resolverSlug para checar status**

Em `packages/db/src/events.ts`, na função `resolverSlug()`, após carregar o evento e antes das checagens de horário, adicionar:

```typescript
// Após: const evento = await comEvento(pool, encontrado.event_id, ...);
// Antes de: if (!encontrado.active) return { estado: "slug_rotacionado", evento };

// Checar se evento ainda é rascunho
if (evento && evento.status === "draft") return { estado: "rascunho", evento };
```

Atualizar tipo `Resolucao` para incluir `"rascunho"`:

```typescript
export type Resolucao =
  | { estado: "desconhecido" }
  | { estado: "slug_rotacionado"; evento: EventoPublico }
  | { estado: "rascunho"; evento: EventoPublico }
  | { estado: "encerrado"; evento: EventoPublico }
  | { estado: "nao_comecou"; evento: EventoPublico }
  | { estado: "aberto"; evento: EventoPublico };
```

Adicionar `status` à query de `carregarEventoPublico` e ao tipo `EventoPublico`.

- [ ] **Step 6: Rodar teste — deve passar**

```bash
pnpm vitest run packages/db/src/event-status.test.ts
```

- [ ] **Step 7: Atualizar página do guest para estado rascunho**

Em `apps/web/app/e/[slug]/page.tsx`, no switch de `resolucao.estado`, adicionar case:

```tsx
case "rascunho":
  return (
    <div className="grid min-h-screen place-items-center bg-bg p-6 text-center">
      <div>
        <h1 className="font-titulo text-2xl text-ink">Evento ainda não disponível</h1>
        <p className="mt-2 text-ink-3">Os anfitriões estão preparando tudo. Volte em breve!</p>
      </div>
    </div>
  );
```

- [ ] **Step 8: Adicionar botão Publicar no admin**

Em `apps/web/features/admin/components/client/event-controls.tsx`, adicionar botão condicional:

```tsx
{evento.status === "draft" && (
  <button
    onClick={() => atualizarEvento({ status: "active" })}
    className="rounded-pilula bg-acento px-6 py-3 font-medium text-sobre-acento"
  >
    Publicar evento
  </button>
)}
```

A função `atualizarEvento` já deve existir (faz `PATCH /api/admin/events/{id}`). Se não, criar.

- [ ] **Step 9: Rodar todos os testes**

```bash
pnpm vitest run
```

- [ ] **Step 10: Commit**

```bash
git add packages/db/migrations/0056_event_status.sql packages/db/src/events.ts packages/db/src/event-status.test.ts apps/web/app/e/ apps/web/features/admin/
git commit -m "feat(event): add draft/publish gate for events

Events now start as 'draft' and must be explicitly published by the
host. Guest sees 'not available yet' page for draft events. Migration
0056 adds status column with check constraint. Closes gap I1."
```

---

### Task 7: next/image na landing page

**Files:**
- Modify: `apps/web/app/landing/sections/photo-corridor.tsx`
- Modify: `apps/web/app/landing/sections/*.tsx` (hero, book, experience — qualquer seção com `<img>`)

**Interfaces:**
- Consumes: `alboraImageLoader` de Task 2 (já registrado globalmente via `next.config.ts`)
- Produces: Todas as imagens da landing usando `next/image` com `sizes` + lazy + format negotiation

**Deps:** Task 2 (loader precisa existir)

- [ ] **Step 1: Inventariar todas as `<img>` na landing**

```bash
grep -rn '<img' apps/web/app/landing/sections/ --include='*.tsx' | grep -v '//'
```

- [ ] **Step 2: Migrar photo-corridor.tsx**

O PhotoCorridor usa `<img>` dentro de `CorridorCard` (linha 102-107). Trocar por:

```tsx
import Image from "next/image";
// ...
<Image
  src={card.src}
  alt={card.badge}
  fill
  sizes="220px"
  className="absolute inset-0 h-full w-full object-cover"
/>
```

Nota: usar `fill` porque o parent tem posição absoluta e dimensões fixas.

- [ ] **Step 3: Migrar demais seções com `<img>`**

Para cada arquivo com `<img>` encontrado no Step 1, aplicar mesmo padrão. Regras:
- Hero fullwidth: `sizes="100vw"`, `priority={true}`
- Cards/thumbs: `sizes` baseado no layout
- Manter todas as classes CSS existentes
- Adicionar `width`/`height` explícitos ou usar `fill` se parent tem tamanho fixo

- [ ] **Step 4: Verificar build**

```bash
source ~/.nvm/nvm.sh && nvm use 22
pnpm --filter @albora/web build
```

- [ ] **Step 5: Verificar visual no browser**

Rodar dev server e navegar landing. Confirmar que todas as imagens carregam, nenhuma distorcida, lazy loading funciona.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/landing/sections/
git commit -m "feat(perf): migrate landing page images to next/image

All <img> tags in landing sections now use next/image with proper
sizes, lazy loading, and format negotiation via R2 Image Resizing.
Depends on image loader from B3."
```

---

### Task 8: Blanket reduced-motion

**Files:**
- Modify: `apps/web/app/base.css`

**Interfaces:**
- Consumes: nada
- Produces: Global CSS rule que desabilita todas as animações para `prefers-reduced-motion: reduce`

- [ ] **Step 1: Verificar estado atual do base.css**

```bash
cat apps/web/app/base.css
```

Confirmar que só tem regra per-animation (`.animate-star-bounce`), não blanket.

- [ ] **Step 2: Adicionar blanket reduced-motion**

Ao final de `apps/web/app/base.css`, adicionar:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Remover a regra per-animation do `.animate-star-bounce` que agora é redundante.

- [ ] **Step 3: Verificar no browser**

Ativar `prefers-reduced-motion: reduce` no DevTools (Rendering → Emulate CSS media feature). Navegar app. Zero animações visíveis.

- [ ] **Step 4: Verificar que progress bars informativas ainda funcionam**

Se houver progress bars ou upload arcs, confirmar que usam `.motion-essential` ou `style` inline que sobrescreve quando necessário. Se não houver, anotar para quando forem adicionados.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/base.css
git commit -m "feat(a11y): add blanket reduced-motion rule

Global prefers-reduced-motion: reduce kills all animations and
transitions. Safe-by-default: new animations are automatically
covered. Informational animations (progress bars) can opt out
with inline style. Closes gap I4."
```

---

## Onda 2 — Confiança (Semanas 3-4)

### Task 9: SSE real-time no telão

**Files:**
- Create: `apps/web/app/api/wall/stream/route.ts`
- Create: `apps/web/features/wall/lib/use-wall-stream.ts`
- Modify: `apps/web/features/wall/lib/use-wall-display.ts` (integrar SSE com fallback polling)
- Create: `apps/web/features/wall/lib/use-wall-stream.test.ts`

**Interfaces:**
- Consumes: `GET /api/wall/stream?badge=<cookie>` — SSE endpoint
- Produces: `useWallStream(wallId): { items: WallDisplayItem[], connected: boolean }` hook que alimenta o display existente

- [ ] **Step 1: Criar SSE endpoint**

```typescript
// apps/web/app/api/wall/stream/route.ts
import { wallFromRequest } from "@/lib/api/wall-auth";
import { listarMidiaDaParede } from "@/lib/domain/wall";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const wall = await wallFromRequest(req);
  if (!wall) return new Response(null, { status: 401 });

  const encoder = new TextEncoder();
  let lastHash = "";

  const stream = new ReadableStream({
    async start(controller) {
      const tick = async () => {
        try {
          const media = await listarMidiaDaParede(wall.eventoId, { limit: 30 });
          const hash = JSON.stringify(media.map((m) => m.id));
          if (hash !== lastHash) {
            lastHash = hash;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(media)}\n\n`)
            );
          }
        } catch {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        }
      };

      await tick();
      const interval = setInterval(tick, 2_000);
      req.signal.addEventListener("abort", () => clearInterval(interval));
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
```

- [ ] **Step 2: Criar hook useWallStream**

```typescript
// apps/web/features/wall/lib/use-wall-stream.ts
import { useCallback, useEffect, useRef, useState } from "react";
import type { ItemApi } from "./types";

export function useWallStream(habilitado: boolean) {
  const [items, setItems] = useState<ItemApi[]>([]);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    if (!habilitado) return;
    const es = new EventSource("/api/wall/stream", { withCredentials: true });
    esRef.current = es;

    es.onopen = () => setConnected(true);
    es.onmessage = (evt) => {
      try {
        setItems(JSON.parse(evt.data));
      } catch { /* ignore malformed */ }
    };
    es.onerror = () => {
      setConnected(false);
      es.close();
      setTimeout(connect, 5_000);
    };
  }, [habilitado]);

  useEffect(() => {
    connect();
    return () => esRef.current?.close();
  }, [connect]);

  return { items, connected };
}
```

- [ ] **Step 3: Integrar SSE no useWallDisplay com fallback**

Em `apps/web/features/wall/lib/use-wall-display.ts`, modificar para:
1. Tentar SSE primeiro via `useWallStream(true)`
2. Se `connected` for false por >10s, cair para polling existente
3. Quando SSE reconectar, parar polling

Manter a lógica de rotação (`ROTACAO_MS`) e pesos existente — só a fonte de dados muda.

- [ ] **Step 4: Testar localmente**

Abrir `/wall` em duas abas. Upload uma foto no admin. Foto aparece no wall em < 3s (vs ~14s anterior).

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/wall/stream/ apps/web/features/wall/lib/
git commit -m "feat(telao): add SSE real-time updates with polling fallback

Wall display now receives new photos via Server-Sent Events with ~2s
latency. Falls back to existing 6s polling if SSE connection drops.
Photo-to-screen time drops from ~14s to ~2-3s. Closes gap I2."
```

---

### Task 10: E2E smoke — QR→consent→capture→upload→confirm→telão

**Files:**
- Create: `e2e/guest-flow.spec.ts`
- Modify: `playwright.config.ts` (se necessário)

**Interfaces:**
- Consumes: Dev server running, test event seed
- Produces: Playwright test que passa em CI cobrindo todo o fluxo do convidado

- [ ] **Step 1: Verificar setup Playwright existente**

```bash
ls e2e/ playwright.config.ts 2>/dev/null
cat .github/workflows/e2e.yml | head -30
```

- [ ] **Step 2: Criar spec do fluxo do convidado**

```typescript
// e2e/guest-flow.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Guest flow — QR to confirmed upload", () => {
  test("complete flow: scan → consent → upload → confirmation → visible on wall", async ({ page, context }) => {
    // Seed: criar evento de teste via API admin (ou usar fixture)
    // Navegar para URL do evento (simula scan do QR)
    await page.goto("/e/evento-teste-e2e");

    // Consentimento
    await expect(page.getByRole("heading", { name: /consentimento/i })).toBeVisible();
    await page.getByRole("textbox", { name: /nome/i }).fill("Convidado E2E");
    await page.getByRole("button", { name: /aceito/i }).click();

    // Tela de captura/upload
    await expect(page.getByRole("button", { name: /enviar foto/i })).toBeVisible();

    // Upload (simular via input file, não câmera)
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles("e2e/fixtures/test-photo.jpg");

    // Confirmação
    await expect(page.getByText(/enviada/i)).toBeVisible({ timeout: 10_000 });

    // Verificar no telão (segunda aba)
    const wallPage = await context.newPage();
    await wallPage.goto("/wall/evento-teste-e2e");
    await expect(wallPage.getByAltText(/convidado/i)).toBeVisible({ timeout: 15_000 });
  });
});
```

- [ ] **Step 3: Criar fixture de foto**

```bash
cp tools/load-test/sample-400kb.jpg e2e/fixtures/test-photo.jpg 2>/dev/null \
  || mkdir -p e2e/fixtures && convert -size 800x600 xc:blue e2e/fixtures/test-photo.jpg
```

- [ ] **Step 4: Rodar localmente**

```bash
source ~/.nvm/nvm.sh && nvm use 22
pnpm playwright test e2e/guest-flow.spec.ts
```

- [ ] **Step 5: Ajustar seletores baseado na UI real**

Os seletores acima são aproximados. Ajustar com `data-testid`, `role`, ou texto exato conforme implementação real.

- [ ] **Step 6: Commit**

```bash
git add e2e/ playwright.config.ts
git commit -m "test(e2e): add guest flow smoke test QR→upload→telão

Playwright test covering the complete guest journey: event page,
consent, photo upload, confirmation, and visibility on the wall.
Addresses Onda 2 E2E smoke requirement."
```

---

### Task 11: Bundle budget script

**Files:**
- Modify: `apps/web/package.json` (add `bundle:budget` script)
- Modify: `apps/web/next.config.ts` (clean up dangling reference)

**Interfaces:**
- Produces: `pnpm --filter @albora/web bundle:budget` — exits 1 if JS bundle exceeds threshold

- [ ] **Step 1: Verificar referência dangling**

```bash
grep -n "BUNDLE_BUDGET" apps/web/next.config.ts apps/web/package.json
```

- [ ] **Step 2: Criar script de budget**

Em `apps/web/package.json`, adicionar ao `scripts`:

```json
"bundle:budget": "next build && node -e \"const fs=require('fs');const dir='.next/static/chunks';const files=fs.readdirSync(dir).filter(f=>f.endsWith('.js'));const total=files.reduce((s,f)=>s+fs.statSync(dir+'/'+f).size,0);const kb=Math.round(total/1024);console.log('Total JS:',kb,'KB');if(kb>350){console.error('OVER BUDGET: '+kb+'KB > 350KB');process.exit(1)}\""
```

- [ ] **Step 3: Testar**

```bash
source ~/.nvm/nvm.sh && nvm use 22
pnpm --filter @albora/web bundle:budget
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/package.json apps/web/next.config.ts
git commit -m "feat(perf): implement bundle budget script (350KB JS threshold)

pnpm bundle:budget builds and checks total JS chunk size.
Exits 1 if over 350KB. Closes gap I9."
```

---

### Task 12: Billing history page

**Files:**
- Create: `apps/web/app/admin/billing/page.tsx`
- Create: `apps/web/lib/api/handlers/admin-billing.ts`
- Create: `apps/web/features/admin/components/ui/billing-history.tsx`

**Interfaces:**
- Consumes: Asaas API via `apps/web/lib/billing/provider.ts` (existente)
- Produces: Página `/admin/billing` listando transações do host com status

- [ ] **Step 1: Verificar provider Asaas existente**

```bash
grep -n "export\|listar\|transac\|payment\|cobranc" apps/web/lib/billing/provider.ts | head -20
```

- [ ] **Step 2: Criar handler de billing list**

```typescript
// apps/web/lib/api/handlers/admin-billing.ts
import { adminGuard } from "@/lib/api/guards";
import { listarCobrancas } from "@/lib/billing/provider";

export async function getAdminBilling(req: Request) {
  const { hostId } = await adminGuard(req);
  const cobrancas = await listarCobrancas(hostId);
  return Response.json(cobrancas);
}
```

Adaptar ao padrão existente de handlers admin. Verificar como outros handlers admin listam dados.

- [ ] **Step 3: Criar página**

```tsx
// apps/web/app/admin/billing/page.tsx
import { BillingHistory } from "@/features/admin/components/ui/billing-history";

export default function BillingPage() {
  return <BillingHistory />;
}
```

- [ ] **Step 4: Criar componente de lista**

```tsx
// apps/web/features/admin/components/ui/billing-history.tsx
"use client";
import { useEffect, useState } from "react";

type Cobranca = {
  id: string;
  valor: number;
  status: string;
  criadaEm: string;
  vencimento: string;
  formaPagamento: string;
};

export function BillingHistory() {
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/billing")
      .then((r) => r.json())
      .then(setCobrancas)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="p-6 text-ink-3">Carregando...</p>;
  if (cobrancas.length === 0) return <p className="p-6 text-ink-3">Nenhuma cobrança encontrada.</p>;

  return (
    <div className="space-y-4 p-6">
      <h1 className="font-titulo text-xl text-ink">Histórico de cobranças</h1>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-linha text-left text-ink-3">
            <th className="pb-2">Data</th>
            <th className="pb-2">Valor</th>
            <th className="pb-2">Forma</th>
            <th className="pb-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {cobrancas.map((c) => (
            <tr key={c.id} className="border-b border-linha">
              <td className="py-3 text-ink">{new Date(c.criadaEm).toLocaleDateString("pt-BR")}</td>
              <td className="py-3 text-ink">
                {(c.valor / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </td>
              <td className="py-3 text-ink-3">{c.formaPagamento}</td>
              <td className="py-3">
                <span className={`rounded-pilula px-2 py-0.5 text-xs font-medium ${
                  c.status === "RECEIVED" ? "bg-positivo/10 text-positivo" :
                  c.status === "PENDING" ? "bg-alerta/10 text-alerta" :
                  "bg-ink/5 text-ink-3"
                }`}>
                  {c.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 5: Adicionar rota API**

Criar `apps/web/app/api/admin/billing/route.ts`:

```typescript
export { getAdminBilling as GET } from "@/lib/api/handlers/admin-billing";
```

- [ ] **Step 6: Verificar no browser**

- [ ] **Step 7: Commit**

```bash
git add apps/web/app/admin/billing/ apps/web/lib/api/handlers/admin-billing.ts apps/web/features/admin/components/ui/billing-history.tsx apps/web/app/api/admin/billing/
git commit -m "feat(billing): add billing history page for hosts

Admin can now view payment history at /admin/billing with status,
amount, payment method, and date. Closes gap I5."
```

---

### Task 13: Docs reconciliation — 4 vs 11 modelos telão

**Files:**
- Modify: `docs/flows.md` (§5.0)

- [ ] **Step 1: Listar modelos reais**

```bash
grep -n "polaroid\|mural\|colagem\|ambiente\|cheio\|carrossel\|dump\|tbt\|grade\|destaque\|mosaico" packages/core/src/wall-display.ts | head -15
```

- [ ] **Step 2: Atualizar docs/flows.md §5.0**

Trocar "quatro modelos" pelo número real e listar todos. Manter a regra "nunca corta na vertical".

- [ ] **Step 3: Commit**

```bash
git add docs/flows.md
git commit -m "docs(telao): update wall display models count (4 → 11)

Code has 11 models since early development; docs said 4. Closes gap N2."
```

---

### Task 14: Landing SEO — structured data + OG dinâmico

**Files:**
- Modify: `apps/web/app/landing/layout.tsx` (ou `page.tsx` metadata)
- Create: `apps/web/app/landing/structured-data.ts`

**Interfaces:**
- Produces: JSON-LD `SoftwareApplication` schema, `og:image` dinâmico

- [ ] **Step 1: Adicionar structured data**

```typescript
// apps/web/app/landing/structured-data.ts
export const landingJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Albora",
  applicationCategory: "PhotographyApplication",
  operatingSystem: "Web, iOS, Android",
  description: "Colete, organize e devolva as fotos dos convidados da sua festa com identidade visual do evento.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "BRL",
  },
};
```

- [ ] **Step 2: Montar no head da landing**

```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(landingJsonLd) }}
/>
```

- [ ] **Step 3: Verificar OG tags existentes e completar**

```bash
grep -n "openGraph\|og:\|twitter:" apps/web/app/landing/ -r | head -10
```

Adicionar `og:image`, `og:type: website`, `twitter:card: summary_large_image` se ausentes.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/landing/
git commit -m "feat(seo): add structured data and complete OG tags for landing

JSON-LD SoftwareApplication schema for rich snippets.
Complete Open Graph and Twitter Card metadata."
```

---

## Onda 3 — Escala + Growth (Semanas 5-6)

### Task 15: Vendor self-serve onboarding (create + branding)

**Files:**
- Create: `apps/web/app/admin/vendor/new/page.tsx`
- Create: `apps/web/app/admin/vendor/[vendorId]/settings/page.tsx`
- Create: `apps/web/lib/api/handlers/admin-vendor.ts`
- Create: `apps/web/features/admin/components/ui/vendor-form.tsx`
- Create: `apps/web/features/admin/components/ui/vendor-branding.tsx`

**Interfaces:**
- Consumes: `packages/db/src/vendor-portal.ts` (existente — CRUD de vendors)
- Produces: UI para vendor criar conta, configurar marca, ver events

**Nota:** Escopo Onda 3 é só create + branding. Team invite fica na Onda 4.

- [ ] **Step 1: Verificar vendor DB layer existente**

```bash
grep -n "export\|criar\|atualizar\|listar" packages/db/src/vendor-portal.ts | head -20
```

- [ ] **Step 2: Criar handler CRUD**

Padrão de `admin-billing.ts` — guards de autenticação, chamadas ao DB layer, validação.

- [ ] **Step 3: Criar formulário de criação**

Campos: nome, slug, logo, cores primária/secundária/acento. Usar token system existente para preview.

- [ ] **Step 4: Criar página de branding**

Upload de logo + configuração de `brand_tokens` JSONB. Preview usando `resolveTokens()` com tokens custom.

- [ ] **Step 5: Criar rotas API**

```
POST /api/admin/vendor — cria
GET /api/admin/vendor/[id] — lê
PATCH /api/admin/vendor/[id] — atualiza
```

- [ ] **Step 6: Testar fluxo completo no browser**

- [ ] **Step 7: Commit**

```bash
git commit -m "feat(vendor): add self-serve vendor onboarding (create + branding)

Vendor can register, configure brand tokens, and upload logo.
Team invite deferred to Onda 4. Closes gap I6 (partial)."
```

---

### Task 16: QR download PNG/PDF direto

**Files:**
- Modify: página `/qrcode` do admin (verificar path exato)

- [ ] **Step 1: Localizar página QR**

```bash
find apps/web -path '*qr*' -name '*.tsx' | head -5
```

- [ ] **Step 2: Adicionar botão "Baixar PNG"**

Usar `html2canvas` ou `canvas` API para renderizar QR como PNG e triggerar download.

- [ ] **Step 3: Adicionar botão "Baixar PDF"**

Reutilizar `generate-piece-pdf.ts` existente (já gera PDF com tokens) ou criar endpoint `/api/admin/events/{id}/qr-pdf`.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(admin): add PNG and PDF download for QR code page

Host can now download QR as PNG or PDF directly from /qrcode.
Closes gap N1."
```

---

### Task 17: Observabilidade — alertas Sentry por rota crítica

**Files:**
- Modify: Sentry config existente
- Create: alert rules (via Sentry UI ou `sentry-cli`)

- [ ] **Step 1: Verificar Sentry setup**

```bash
grep -rn "sentry\|SENTRY_DSN" apps/web/ --include='*.ts' --include='*.tsx' -l | head -5
```

- [ ] **Step 2: Configurar alert rules**

Criar regras para: `/api/media/presign` (rate > 5 errors/min), `/api/wall/*` (any error), `/api/billing/*` (any error), `/api/ops/*` (any error).

- [ ] **Step 3: Commit config changes**

```bash
git commit -m "feat(infra): configure Sentry alert rules for critical routes

Alerts for upload presign, wall, billing, and ops endpoints."
```

---

### Task 18: Push notifications spike

**Files:**
- Create: `docs/adr/XXXX-push-notifications.md`

**Nota:** Este é um SPIKE (investigação), não implementação. Output é ADR com decisão.

- [ ] **Step 1: Pesquisar opções**

FCM (Firebase Cloud Messaging) para web + mobile. Avaliar: custo, complexidade, dependências.

- [ ] **Step 2: Mapear gatilhos válidos**

Apenas 2-3 fazem sentido: gate do evento aberto, recap pronto, foto do convidado no livro.

- [ ] **Step 3: Avaliar infra `notify` existente**

```bash
grep -rn "notify\|notific" apps/web/lib/domain/ --include='*.ts' -l | head -10
```

- [ ] **Step 4: Escrever ADR com decisão**

Formato: contexto, decisão, consequências. Referenciar ADR 0009.

- [ ] **Step 5: Commit**

```bash
git commit -m "docs(adr): push notifications spike — decision and constraints

ADR documenting which notification events are valid, technology
choice (FCM), and implementation constraints. Closes gap 3.6."
```

---

### Task 19: Custom missions (beyond pack catalog)

**Files:**
- Create: `packages/db/migrations/0057_custom_missions.sql`
- Modify: `apps/web/lib/domain/mission/` (verificar path)
- Create: UI admin para criação de missão livre

**Interfaces:**
- Consumes: Pack system existente (missões vêm do catálogo do pack)
- Produces: Admin pode criar missão com emoji, texto livre, deadline opcional

- [ ] **Step 1: Verificar mission domain existente**

```bash
find apps/web -path '*miss*' -name '*.ts' -o -path '*challenge*' -name '*.ts' | grep -v node_modules | head -10
```

- [ ] **Step 2: Migration para custom missions**

```sql
-- packages/db/migrations/0057_custom_missions.sql
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS is_custom boolean NOT NULL DEFAULT false;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS custom_emoji text;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS custom_title text;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS custom_description text;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS deadline timestamptz;
```

- [ ] **Step 3: Criar UI de criação**

Formulário com: emoji picker, título, descrição, deadline (opcional). Segue padrão admin existente.

- [ ] **Step 4: Testes**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(missions): allow admin to create custom missions

Host can now create free-form missions with emoji, title, description,
and optional deadline beyond the pack catalog. Closes gap I8."
```

---

### Task 20: Insights CSV export

**Files:**
- Modify: admin insights page (verificar path)
- Create: endpoint `/api/admin/events/{id}/insights/csv`

- [ ] **Step 1: Localizar insights page**

```bash
find apps/web -path '*insight*' -name '*.tsx' | head -5
```

- [ ] **Step 2: Criar endpoint CSV**

Handler que serializa dados de insights em CSV com BOM UTF-8 para Excel.

- [ ] **Step 3: Adicionar botão na UI**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(insights): add CSV export for event metrics

Admin can download insights data as CSV. Closes gap N4."
```

---

### Task 21: Consent admin dashboard

**Files:**
- Create: `apps/web/app/admin/e/[eventId]/consent/page.tsx`
- Create: endpoint para listar versões de consentimento

- [ ] **Step 1: Verificar consent domain existente**

```bash
grep -rn "consent\|consentimento" packages/db/src/ --include='*.ts' -l | head -5
```

- [ ] **Step 2: Criar página admin**

Listar versões de consentimento do evento, contagem de aceites por versão, texto completo de cada versão.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(admin): add consent version dashboard

Admin can view consent versions, acceptance counts, and full text
per version for LGPD audit purposes."
```

---

## Self-Review Checklist

1. **Spec coverage:** Todos os items B1-B4, I1-I9, N1-N4 cobertos por tasks.
2. **Placeholder scan:** Nenhum TBD/TODO. Tasks 15-21 (Onda 3) são menos granulares que Onda 1 por design — serão detalhados quando chegar a vez.
3. **Type consistency:** `alboraImageLoader` — nome consistente em Task 2 (criação) e Task 7 (consumo). `Resolucao` — tipo atualizado em Task 6 com novo estado `"rascunho"`.
4. **Deps:** Task 7 depende de Task 2 (loader). Task 10 pode depender de Task 9 (SSE pra verificar telão). Demais são independentes.
