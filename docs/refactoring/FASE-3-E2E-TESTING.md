# 🎯 FASE 3: E2E TESTING

**Status**: 🚀 **EM PLANEJAMENTO**  
**Data Início**: 28/08/2026  
**Prioridade**: 🔥 **CRÍTICA** (Caminho crítico de sábado 20h)

---

## 📊 CONTEXTO

### Conquistas Anteriores
- ✅ **Fase 1**: 57 use cases, 344 testes unitários (100%)
- ✅ **Fase 2.1**: 16 schemas Zod, 169 testes de contrato (100%)
- ✅ **Total**: 513 testes, 4.45s de execução, 100% sucesso

### Por Que E2E Agora?

**Pirâmide de Testes Completa:**
```
       /\
      /E2E\       ← FASE 3 (Próxima)
     /------\
    /Contract\    ← FASE 2 (COMPLETA)
   /----------\
  / Unit Tests \  ← FASE 1 (COMPLETA)
 /--------------\
```

**Garantias que E2E adiciona:**
1. Integração real entre todas as camadas
2. Validação do fluxo completo (UI → API → DB → Storage)
3. Detecção de problemas que só aparecem no sistema completo
4. Confiança para deploy em produção

---

## 🎯 OBJETIVO

Testar o **caminho crítico completo do convidado** de ponta a ponta, garantindo que o fluxo de upload funciona perfeitamente no ambiente real de festa (sábado 20h).

### Fluxo Crítico

```
┌─────────────────────────────────────────────────────────────┐
│           FLUXO E2E DO CONVIDADO (Caminho Crítico)          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. QR Code Scan                                            │
│     └─→ Redireciona para /{eventSlug}                       │
│                                                              │
│  2. Landing Page                                            │
│     └─→ Carrega tema do evento                              │
│     └─→ Exibe QR/convite/missões                            │
│                                                              │
│  3. Consentimento LGPD                                      │
│     └─→ Aceita termos de uso                                │
│     └─→ Gera token de sessão opaco                          │
│                                                              │
│  4. Captura de Foto                                         │
│     └─→ Abre câmera nativa                                  │
│     └─→ Remove EXIF (coordenadas GPS)                       │
│     └─→ Aplica LUT (identidade visual)                      │
│                                                              │
│  5. Presign Upload                                          │
│     └─→ POST /api/uploads/presign                           │
│     └─→ Recebe URL presigned (R2)                           │
│     └─→ Cria upload pendente (DB)                           │
│                                                              │
│  6. PUT direto ao R2                                        │
│     └─→ PUT {presignedUrl}                                  │
│     └─→ Bytes nunca tocam o servidor                        │
│     └─→ Offline queue se falhar                             │
│                                                              │
│  7. Confirm Upload                                          │
│     └─→ POST /api/uploads/confirm                           │
│     └─→ Valida chave de storage (event_id)                  │
│     └─→ Valida missão                                       │
│     └─→ Enfileira moderação                                 │
│     └─→ Tenta criar story (degrada se falhar)               │
│                                                              │
│  8. Confirmação Visual                                      │
│     └─→ Exibe foto com checkmark                            │
│     └─→ Exibe progresso da missão                           │
│     └─→ Convite para instalar app                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Requisitos Não Funcionais

**Performance (Caminho Crítico Sábado 20h)**
- ⚡ LCP < 2.5s (First Contentful Paint)
- ⚡ INP < 200ms (Interaction Next Paint)
- ⚡ TTI < 3.0s (Time to Interactive)
- ⚡ Upload + Confirm < 5s (rede 3G)
- ⚡ Bundle da rota do convidado < 100KB

**Confiabilidade**
- 🛡️ RLS enforcement (isolamento entre eventos)
- 🛡️ EXIF removal (coordenadas GPS)
- 🛡️ Offline queue (retry automático)
- 🛡️ Story degradável (não falha o upload)
- 🛡️ Moderação assíncrona (não bloqueia)

**Segurança**
- 🔒 Token opaco e escopado a 1 evento
- 🔒 Presign com expiração (15 min)
- 🔒 Chave de storage derivada no servidor
- 🔒 Consentimento LGPD antes de qualquer captura

---

## 🏗️ STACK DE TESTES E2E

### Ferramentas Recomendadas

#### Opção 1: Playwright (Recomendado)
**Prós:**
- ✅ Suporte nativo a Next.js
- ✅ Auto-wait inteligente (menos flaky)
- ✅ Screenshots e vídeos automáticos
- ✅ Network mocking embutido
- ✅ Trace viewer incrível
- ✅ Multi-browser (Chromium, Firefox, WebKit)
- ✅ Mobile emulation built-in
- ✅ Paralelo out-of-the-box

**Contras:**
- ⚠️ Curva de aprendizado inicial
- ⚠️ CI pode ser pesado

**Instalação:**
```bash
pnpm add -D @playwright/test
npx playwright install
```

#### Opção 2: Cypress
**Prós:**
- ✅ Developer experience excepcional
- ✅ Time-travel debugging
- ✅ Network stubbing fácil

**Contras:**
- ⚠️ Single domain limitation
- ⚠️ Mais pesado que Playwright

### Estrutura de Arquivos

```
apps/web/
├── e2e/
│   ├── fixtures/
│   │   ├── events.json           # Eventos de teste
│   │   ├── tokens.json           # Tokens válidos/inválidos
│   │   └── photos.jpg            # Fotos de teste (EXIF removido)
│   ├── helpers/
│   │   ├── setup-test-event.ts   # Cria evento de teste no DB
│   │   ├── cleanup.ts            # Limpa dados após testes
│   │   ├── mock-r2.ts            # Mock de R2 (opcional)
│   │   └── auth-helpers.ts       # Gera tokens de sessão
│   ├── specs/
│   │   ├── guest-upload-flow.spec.ts        # Fluxo completo
│   │   ├── guest-upload-flow-offline.spec.ts # Retry offline
│   │   ├── guest-upload-flow-slow.spec.ts   # 3G throttling
│   │   ├── guest-multi-mission.spec.ts      # Múltiplas missões
│   │   └── guest-upload-isolation.spec.ts   # RLS enforcement
│   ├── playwright.config.ts      # Config do Playwright
│   └── README.md                 # Instruções de execução
├── vitest.config.ts              # Já existe (unit + contract)
└── package.json
```

---

## 📝 TESTES E2E PLANEJADOS

### 1. **Fluxo Completo (Happy Path)**
**Arquivo**: `guest-upload-flow.spec.ts`

**Cenário**: Convidado acessa QR, faz upload de foto, confirma missão

**Steps:**
```typescript
test('deve completar fluxo de upload com sucesso', async ({ page }) => {
  // 1. Setup: Cria evento de teste no DB
  const event = await setupTestEvent({
    slug: 'casamento-joao-maria',
    packId: 'wedding-modern',
    socialGateOpenAt: new Date(),
  });

  // 2. Acessa landing page via QR
  await page.goto(`/${event.slug}`);
  await expect(page.locator('h1')).toContainText('João & Maria');

  // 3. Aceita consentimento LGPD
  await page.click('[data-testid="accept-consent"]');
  await expect(page).toHaveURL(/\/foto$/);

  // 4. Faz upload de foto
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('./e2e/fixtures/photo.jpg');

  // 5. Seleciona missão
  await page.click('[data-testid="mission-selfie-casal"]');

  // 6. Confirma upload
  await page.click('[data-testid="confirm-upload"]');

  // 7. Aguarda confirmação visual
  await expect(page.locator('[data-testid="upload-success"]')).toBeVisible();
  await expect(page.locator('[data-testid="mission-progress"]')).toContainText('1/1');

  // 8. Valida no DB
  const uploads = await getEventUploads(event.id);
  expect(uploads).toHaveLength(1);
  expect(uploads[0].status).toBe('approved');
  expect(uploads[0].mission).toBe('selfie-casal');

  // Cleanup
  await cleanupTestEvent(event.id);
});
```

**Assertions:**
- ✅ Landing page carrega corretamente
- ✅ Tema do evento é aplicado
- ✅ Consentimento é registrado
- ✅ Foto é enviada para R2
- ✅ Upload é confirmado no DB
- ✅ Missão é validada
- ✅ Progresso é atualizado
- ✅ Confirmação visual aparece

---

### 2. **Fluxo Offline + Retry**
**Arquivo**: `guest-upload-flow-offline.spec.ts`

**Cenário**: Convidado perde sinal durante upload, sistema faz retry automático

**Steps:**
```typescript
test('deve fazer retry automático em caso de falha de rede', async ({ page, context }) => {
  const event = await setupTestEvent();

  // 1. Acessa landing page
  await page.goto(`/${event.slug}`);
  await page.click('[data-testid="accept-consent"]');

  // 2. Faz upload
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('./e2e/fixtures/photo.jpg');
  await page.click('[data-testid="mission-selfie-casal"]');

  // 3. Simula perda de rede DURANTE confirm
  await context.setOffline(true);
  await page.click('[data-testid="confirm-upload"]');

  // 4. Aguarda mensagem de offline
  await expect(page.locator('[data-testid="offline-banner"]')).toBeVisible();
  await expect(page.locator('[data-testid="retry-indicator"]')).toContainText('Tentando novamente...');

  // 5. Restaura rede após 3s
  await page.waitForTimeout(3000);
  await context.setOffline(false);

  // 6. Aguarda retry automático ter sucesso
  await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 10000 });

  // 7. Valida no DB
  const uploads = await getEventUploads(event.id);
  expect(uploads).toHaveLength(1);
  expect(uploads[0].status).toBe('approved');

  await cleanupTestEvent(event.id);
});
```

**Assertions:**
- ✅ Offline queue persiste upload
- ✅ Retry automático funciona
- ✅ UI exibe estado de offline/retry
- ✅ Upload completa após rede voltar

---

### 3. **Fluxo em Rede Lenta (3G)**
**Arquivo**: `guest-upload-flow-slow.spec.ts`

**Cenário**: Convidado em rede 3G lenta (típico em festas)

**Steps:**
```typescript
test('deve completar upload em rede 3G lenta (<5s)', async ({ page, context }) => {
  const event = await setupTestEvent();

  // 1. Simula rede 3G lenta
  await context.route('**/*', route => route.continue({ 
    downloadSpeed: 400 * 1024, // 400 KB/s
    uploadSpeed: 200 * 1024,   // 200 KB/s
    latency: 100,              // 100ms
  }));

  // 2. Acessa landing page
  const startTime = Date.now();
  await page.goto(`/${event.slug}`);
  await page.click('[data-testid="accept-consent"]');

  // 3. Faz upload
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('./e2e/fixtures/photo-optimized.jpg'); // 500KB
  await page.click('[data-testid="mission-selfie-casal"]');
  await page.click('[data-testid="confirm-upload"]');

  // 4. Aguarda confirmação
  await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 10000 });
  const elapsedTime = Date.now() - startTime;

  // 5. Valida performance
  expect(elapsedTime).toBeLessThan(5000); // < 5s mesmo em 3G

  await cleanupTestEvent(event.id);
});
```

**Assertions:**
- ✅ Upload completa em < 5s (3G)
- ✅ Loading states corretos
- ✅ Sem timeouts ou falhas

---

### 4. **Múltiplas Missões**
**Arquivo**: `guest-multi-mission.spec.ts`

**Cenário**: Convidado completa 3 missões diferentes

**Steps:**
```typescript
test('deve completar múltiplas missões corretamente', async ({ page }) => {
  const event = await setupTestEvent();

  await page.goto(`/${event.slug}`);
  await page.click('[data-testid="accept-consent"]');

  // Upload 1: Selfie com o casal
  await uploadPhoto(page, 'photo1.jpg', 'selfie-casal');
  await expect(page.locator('[data-testid="mission-progress-selfie-casal"]')).toContainText('1/1');

  // Upload 2: Foto da decoração
  await uploadPhoto(page, 'photo2.jpg', 'decoracao');
  await expect(page.locator('[data-testid="mission-progress-decoracao"]')).toContainText('1/1');

  // Upload 3: Momento emocionante
  await uploadPhoto(page, 'photo3.jpg', 'momento-emocionante');
  await expect(page.locator('[data-testid="mission-progress-momento-emocionante"]')).toContainText('1/1');

  // Valida total no DB
  const uploads = await getEventUploads(event.id);
  expect(uploads).toHaveLength(3);
  expect(uploads.map(u => u.mission).sort()).toEqual([
    'decoracao',
    'momento-emocionante',
    'selfie-casal',
  ]);

  await cleanupTestEvent(event.id);
});
```

**Assertions:**
- ✅ Múltiplas missões são validadas corretamente
- ✅ Progresso é atualizado para cada missão
- ✅ Uploads são isolados corretamente

---

### 5. **Isolamento entre Eventos (RLS)**
**Arquivo**: `guest-upload-isolation.spec.ts`

**Cenário**: Convidado não pode acessar fotos/dados de outro evento

**Steps:**
```typescript
test('deve isolar uploads entre eventos (RLS enforcement)', async ({ page }) => {
  // 1. Cria 2 eventos distintos
  const event1 = await setupTestEvent({ slug: 'evento-1' });
  const event2 = await setupTestEvent({ slug: 'evento-2' });

  // 2. Faz upload no evento 1
  await page.goto(`/${event1.slug}`);
  await page.click('[data-testid="accept-consent"]');
  await uploadPhoto(page, 'photo1.jpg', 'selfie-casal');

  // 3. Tenta acessar feed do evento 2 com token do evento 1
  const event1Token = await getSessionToken(page);
  
  await page.goto(`/${event2.slug}/feed`);
  await page.evaluate((token) => {
    localStorage.setItem('guestToken', token);
  }, event1Token);
  await page.reload();

  // 4. Deve ver feed vazio (RLS bloqueia)
  const feedItems = page.locator('[data-testid="feed-item"]');
  await expect(feedItems).toHaveCount(0);

  // 5. Valida no DB que RLS funcionou
  const event2Uploads = await getEventUploads(event2.id);
  expect(event2Uploads).toHaveLength(0);

  await cleanupTestEvent(event1.id);
  await cleanupTestEvent(event2.id);
});
```

**Assertions:**
- ✅ Token de um evento não acessa dados de outro
- ✅ RLS enforcement a nível de banco
- ✅ Feed vazio para evento incorreto
- ✅ Queries bloqueadas pelo RLS

---

### 6. **EXIF Removal**
**Arquivo**: `guest-exif-removal.spec.ts`

**Cenário**: Foto com coordenadas GPS tem EXIF removido antes do upload

**Steps:**
```typescript
test('deve remover EXIF com coordenadas GPS antes de upload', async ({ page }) => {
  const event = await setupTestEvent();

  await page.goto(`/${event.slug}`);
  await page.click('[data-testid="accept-consent"]');

  // 1. Upload de foto COM EXIF (GPS)
  await page.locator('input[type="file"]').setInputFiles('./e2e/fixtures/photo-with-gps.jpg');
  await page.click('[data-testid="mission-selfie-casal"]');
  await page.click('[data-testid="confirm-upload"]');

  await expect(page.locator('[data-testid="upload-success"]')).toBeVisible();

  // 2. Baixa foto do R2 e valida EXIF
  const uploads = await getEventUploads(event.id);
  const uploadedPhotoUrl = await getR2SignedUrl(uploads[0].key);
  const uploadedPhotoBlob = await fetch(uploadedPhotoUrl).then(r => r.arrayBuffer());
  
  const exif = await extractExif(uploadedPhotoBlob);
  expect(exif.gps).toBeUndefined(); // GPS removido
  expect(exif.location).toBeUndefined();

  await cleanupTestEvent(event.id);
});
```

**Assertions:**
- ✅ Coordenadas GPS são removidas
- ✅ EXIF sensível é limpo
- ✅ Foto mantém qualidade

---

### 7. **Story Degradável**
**Arquivo**: `guest-story-degradation.spec.ts`

**Cenário**: Se criar story falhar, upload ainda completa

**Steps:**
```typescript
test('deve completar upload mesmo se story falhar', async ({ page }) => {
  const event = await setupTestEvent();

  // 1. Mock para fazer a criação de story falhar
  await page.route('**/api/stories/create', route => route.abort());

  await page.goto(`/${event.slug}`);
  await page.click('[data-testid="accept-consent"]');

  // 2. Faz upload
  await uploadPhoto(page, 'photo.jpg', 'selfie-casal');

  // 3. Upload deve ter sucesso mesmo com story falhando
  await expect(page.locator('[data-testid="upload-success"]')).toBeVisible();

  // 4. Valida no DB que upload foi confirmado
  const uploads = await getEventUploads(event.id);
  expect(uploads).toHaveLength(1);
  expect(uploads[0].status).toBe('approved');

  await cleanupTestEvent(event.id);
});
```

**Assertions:**
- ✅ Upload completa mesmo se story falhar
- ✅ Não há falha crítica
- ✅ Sistema degrada gracefully

---

## 📊 MÉTRICAS DE SUCESSO

### Cobertura E2E

| Área | Testes | Status |
|------|--------|--------|
| **Fluxo Completo (Happy Path)** | 1 | 🔜 Planejado |
| **Offline + Retry** | 1 | 🔜 Planejado |
| **Rede Lenta (3G)** | 1 | 🔜 Planejado |
| **Múltiplas Missões** | 1 | 🔜 Planejado |
| **Isolamento RLS** | 1 | 🔜 Planejado |
| **EXIF Removal** | 1 | 🔜 Planejado |
| **Story Degradação** | 1 | 🔜 Planejado |
| **TOTAL** | **7 testes** | 🔜 **0% completo** |

### Performance Targets

| Métrica | Target | Medição |
|---------|--------|---------|
| **LCP** (Largest Contentful Paint) | < 2.5s | Lighthouse CI |
| **INP** (Interaction Next Paint) | < 200ms | Lighthouse CI |
| **TTI** (Time to Interactive) | < 3.0s | Lighthouse CI |
| **Bundle** (Rota convidado) | < 100KB | Webpack Bundle Analyzer |
| **Upload + Confirm** (3G) | < 5s | Playwright Network Throttling |

### CI/CD Integration

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on:
  pull_request:
    branches: [main, stable, homol]
  push:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Setup test database
        run: pnpm db:push
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/albora_test

      - name: Run E2E tests
        run: pnpm test:e2e
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/albora_test
          R2_BUCKET: test-bucket
          R2_ENDPOINT: http://localhost:9000 # MinIO local

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

---

## 🛠️ SETUP TÉCNICO

### 1. Instalar Playwright

```bash
cd /workspace/apps/web
pnpm add -D @playwright/test
npx playwright install
```

### 2. Criar Configuração

**`apps/web/playwright.config.ts`**
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/specs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'] },
    },
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### 3. Criar Helpers

**`apps/web/e2e/helpers/setup-test-event.ts`**
```typescript
import { db } from '@albora/db';

export async function setupTestEvent(options: {
  slug?: string;
  packId?: string;
  socialGateOpenAt?: Date;
} = {}) {
  const client = await db.getClient();
  
  const event = await client.query(`
    INSERT INTO events (slug, pack_id, social_gate_open_at)
    VALUES ($1, $2, $3)
    RETURNING *
  `, [
    options.slug || 'test-event',
    options.packId || 'wedding-modern',
    options.socialGateOpenAt || new Date(),
  ]);
  
  await db.releaseClient(client);
  return event.rows[0];
}

export async function cleanupTestEvent(eventId: string) {
  const client = await db.getClient();
  
  // Limpa em ordem (FKs)
  await client.query('DELETE FROM uploads WHERE event_id = $1', [eventId]);
  await client.query('DELETE FROM sessions WHERE event_id = $1', [eventId]);
  await client.query('DELETE FROM events WHERE id = $1', [eventId]);
  
  await db.releaseClient(client);
}
```

### 4. Scripts no package.json

**`apps/web/package.json`**
```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:report": "playwright show-report"
  }
}
```

---

## 📋 PLANO DE EXECUÇÃO

### Sprint 1: Setup + Fluxo Completo (2-3 dias)
- [ ] Instalar Playwright
- [ ] Criar configuração base
- [ ] Criar helpers (setup-test-event, cleanup)
- [ ] Implementar teste 1: Fluxo completo (happy path)
- [ ] Integrar no CI/CD

### Sprint 2: Testes de Resiliência (2 dias)
- [ ] Implementar teste 2: Offline + Retry
- [ ] Implementar teste 3: Rede lenta (3G)
- [ ] Implementar teste 7: Story degradável

### Sprint 3: Testes de Segurança + Performance (2 dias)
- [ ] Implementar teste 4: Múltiplas missões
- [ ] Implementar teste 5: Isolamento RLS
- [ ] Implementar teste 6: EXIF removal
- [ ] Configurar Lighthouse CI

---

## 🎯 DEFINIÇÃO DE PRONTO (DoD)

### Critérios de Aceite
- [ ] ✅ 7 testes E2E implementados
- [ ] ✅ 100% dos testes passando
- [ ] ✅ Tempo de execução < 2 min (local)
- [ ] ✅ CI/CD integrado (GitHub Actions)
- [ ] ✅ Performance budgets configurados (Lighthouse CI)
- [ ] ✅ Trace viewer disponível para debug
- [ ] ✅ Screenshots de falhas salvos automaticamente
- [ ] ✅ Documentação de setup completa

### Gates de Qualidade
- [ ] LCP < 2.5s (Lighthouse CI)
- [ ] INP < 200ms (Lighthouse CI)
- [ ] TTI < 3.0s (Lighthouse CI)
- [ ] Bundle < 100KB (Rota convidado)
- [ ] Upload + Confirm < 5s (3G)

---

## 🚀 IMPACTO ESPERADO

### Confiança
✅ Fluxo crítico de sábado 20h **100% testado**  
✅ Validação em dispositivos reais (mobile)  
✅ Deploy em produção com **segurança total**  

### Performance
✅ Garantia de LCP < 2.5s (Core Web Vitals)  
✅ Upload rápido mesmo em 3G  
✅ Bundle otimizado (< 100KB)  

### Resiliência
✅ Offline queue validado  
✅ Retry automático funcionando  
✅ Story degradável confirmado  

---

## 📚 REFERÊNCIAS

### Documentação
- [Playwright Docs](https://playwright.dev/docs/intro)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Next.js Testing Guide](https://nextjs.org/docs/testing)

### Artigos
- [E2E Testing Strategy](https://martinfowler.com/articles/practical-test-pyramid.html)
- [Testing Trophy](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications)

---

## 📊 PROGRESSO

```
┌─────────────────────────────────────────────────────────────┐
│                      FASE 3: E2E TESTING                     │
├─────────────────────────────────────────────────────────────┤
│  Status:     🚀 EM PLANEJAMENTO                             │
│  Progresso:  0/7 testes (0%)                                │
│  Tempo:      0s                                              │
│  Setup:      ⏳ Pendente                                     │
│  CI/CD:      ⏳ Pendente                                     │
└─────────────────────────────────────────────────────────────┘
```

---

**Próximas Ações:**
1. ⚡ Instalar Playwright
2. ⚡ Criar helpers de setup/cleanup
3. ⚡ Implementar teste 1 (Happy Path)
4. ⚡ Integrar no CI/CD

**Meta Final:** 7 testes E2E, 100% passando, caminho crítico blindado! 🚀
