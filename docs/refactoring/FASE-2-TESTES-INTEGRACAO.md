# 📋 Fase 2: Testes de Integração dos Handlers

**Data**: 28 de agosto de 2026  
**Status**: 🎯 **PRÓXIMA FASE**

---

## 🎯 OBJETIVO

Testar a **integração completa** entre:
1. **Handler** (Next.js API Route)
2. **Validator** (Zod Schema)
3. **Use Case** (Business Logic)

Validar contratos de API, tratamento de erros, e fluxo end-to-end de cada endpoint.

---

## 📊 ESCOPO

### Handlers a Testar: 27 endpoints

#### Guest Handlers (9)
1. `POST /api/guest/confirm-upload`
2. `GET /api/guest/feed`
3. `POST /api/guest/reactions`
4. `DELETE /api/guest/reactions`
5. `GET /api/guest/reactions`
6. `GET /api/guest/comments`
7. `POST /api/guest/comments`
8. `DELETE /api/guest/comments`
9. `GET /api/guest/event`

#### Admin Handlers (15)
1. `POST /api/admin/events`
2. `GET /api/admin/insights`
3. `GET /api/admin/metrics`
4. `GET /api/admin/challenges`
5. `PATCH /api/admin/challenges`
6. `GET /api/admin/music`
7. `PUT /api/admin/music`
8. `GET /api/admin/guestbook`
9. `PUT /api/admin/guestbook`
10. `POST /api/admin/sessions/revoke`
11. `PATCH /api/admin/sessions/name`
12. `POST /api/admin/drive/connect`
13. `POST /api/admin/drive/disconnect`
14. `GET /api/admin/drive/status`
15. `POST /api/admin/exports`

#### Wall Handlers (3)
1. `GET /api/wall/feed`
2. `POST /api/wall/pairing`
3. `GET /api/wall/theme`

---

## 🛠️ ESTRATÉGIA DE TESTE

### 1. Setup de Ambiente

```typescript
// apps/web/lib/infrastructure/api/handlers/guest/confirm-upload.integration.test.ts

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";

describe("POST /api/guest/confirm-upload (Integration)", () => {
  // Mock de dependências externas apenas
  // Use cases e validators são testados de verdade
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  // Testes de integração...
});
```

### 2. Cenários a Cobrir (por handler)

#### ✅ Happy Path
- Input válido → Use case executado → Response 200/201

#### ❌ Validation Errors
- Input inválido → Zod rejeita → Response 400
- Schema errors → Body errado → Response 400

#### ❌ Business Errors
- Use case rejeita → Regra de negócio → Response 400/403/404
- Isolamento de eventos → RLS → Response 403

#### ❌ System Errors
- DB offline → Use case falha → Response 500
- Storage offline → Use case falha → Response 500

#### 🔒 Authorization
- Token inválido → Middleware rejeita → Response 401
- Token expirado → Middleware rejeita → Response 401

---

## 📝 TEMPLATE DE TESTE

```typescript
// apps/web/lib/infrastructure/api/handlers/guest/confirm-upload.integration.test.ts

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";

// Mock apenas dependências EXTERNAS (DB, Storage, Email)
vi.mock("@/lib/infrastructure/database", () => ({
  getClient: vi.fn(),
  releaseClient: vi.fn(),
}));

vi.mock("@/lib/infrastructure/storage/r2", () => ({
  generatePresignedUrl: vi.fn(),
}));

describe("POST /api/guest/confirm-upload (Integration)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("✅ Happy Path", () => {
    it("deve confirmar upload com sucesso", async () => {
      const req = new NextRequest("http://localhost/api/guest/confirm-upload", {
        method: "POST",
        headers: { "x-guest-token": "valid-token" },
        body: JSON.stringify({
          uploadKey: "events/evt_123/uploads/abc.jpg",
          contentType: "image/jpeg",
          byteSize: 1024000,
          thumbnailKey: "events/evt_123/thumbnails/abc.jpg",
        }),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("uploadId");
      expect(data).toHaveProperty("estado");
    });
  });

  describe("❌ Validation Errors", () => {
    it("deve rejeitar uploadKey de outro evento", async () => {
      const req = new NextRequest("http://localhost/api/guest/confirm-upload", {
        method: "POST",
        headers: { "x-guest-token": "valid-token" },
        body: JSON.stringify({
          uploadKey: "events/evt_999/uploads/abc.jpg", // Outro evento
          contentType: "image/jpeg",
          byteSize: 1024000,
        }),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toMatch(/evento/i);
    });

    it("deve rejeitar contentType inválido", async () => {
      const req = new NextRequest("http://localhost/api/guest/confirm-upload", {
        method: "POST",
        headers: { "x-guest-token": "valid-token" },
        body: JSON.stringify({
          uploadKey: "events/evt_123/uploads/abc.exe",
          contentType: "application/exe", // Inválido
          byteSize: 1024000,
        }),
      });

      const response = await POST(req);

      expect(response.status).toBe(400);
    });
  });

  describe("❌ Business Errors", () => {
    it("deve rejeitar upload acima do limite do plano", async () => {
      // Mock DB retornando plano com limite baixo
      const req = new NextRequest("http://localhost/api/guest/confirm-upload", {
        method: "POST",
        headers: { "x-guest-token": "valid-token" },
        body: JSON.stringify({
          uploadKey: "events/evt_123/uploads/huge.jpg",
          contentType: "image/jpeg",
          byteSize: 50_000_000, // 50MB
        }),
      });

      const response = await POST(req);

      expect(response.status).toBe(400);
      expect(data.error).toMatch(/limite/i);
    });
  });

  describe("🔒 Authorization", () => {
    it("deve rejeitar token inválido", async () => {
      const req = new NextRequest("http://localhost/api/guest/confirm-upload", {
        method: "POST",
        headers: { "x-guest-token": "invalid" },
        body: JSON.stringify({
          uploadKey: "events/evt_123/uploads/abc.jpg",
          contentType: "image/jpeg",
          byteSize: 1024000,
        }),
      });

      const response = await POST(req);

      expect(response.status).toBe(401);
    });
  });
});
```

---

## 📂 ESTRUTURA DE ARQUIVOS

```
apps/web/lib/infrastructure/api/handlers/
├── guest/
│   ├── confirm-upload/
│   │   ├── route.ts
│   │   └── route.integration.test.ts  ← NOVO
│   ├── feed/
│   │   ├── route.ts
│   │   └── route.integration.test.ts  ← NOVO
│   └── ...
├── admin/
│   ├── events/
│   │   ├── route.ts
│   │   └── route.integration.test.ts  ← NOVO
│   └── ...
└── wall/
    ├── feed/
    │   ├── route.ts
    │   └── route.integration.test.ts  ← NOVO
    └── ...
```

---

## 🎯 META DE COBERTURA

```
┌─────────────────────────────────────────────────────────────┐
│                    META FASE 2: 27 TESTES                   │
├─────────────────────────────────────────────────────────────┤
│  🎯 Handlers Guest:             9 testes                    │
│  🎯 Handlers Admin:            15 testes                    │
│  🎯 Handlers Wall:              3 testes                    │
│  🎯 TOTAL:                     27 testes                    │
│  ⚡ Tempo Esperado:           ~10s                          │
└─────────────────────────────────────────────────────────────┘
```

### Cenários por Teste

Cada handler terá **1 arquivo de teste** com:
- 1-2 happy path tests
- 2-3 validation error tests
- 1-2 business error tests
- 1 authorization test

**Total**: ~5-8 testes por handler  
**Média**: ~135-216 testes de integração

---

## 🚀 PLANO DE EXECUÇÃO

### Fase 2.1: Guest Handlers (Prioridade Alta)
- [ ] `confirm-upload` (Caminho Crítico)
- [ ] `feed`
- [ ] `reactions` (POST, DELETE, GET)
- [ ] `comments` (POST, DELETE, GET)
- [ ] `event`

### Fase 2.2: Admin Handlers (Prioridade Média)
- [ ] `events`
- [ ] `insights`, `metrics`
- [ ] `challenges`
- [ ] `music`
- [ ] `guestbook`
- [ ] `sessions`
- [ ] `drive`
- [ ] `exports`

### Fase 2.3: Wall Handlers (Prioridade Média)
- [ ] `feed`
- [ ] `pairing`
- [ ] `theme`

---

## 🛡️ BENEFÍCIOS

### 1. **Contratos de API Validados**
- Garante que schemas Zod estão corretos
- Valida tipos de entrada e saída

### 2. **Fluxo End-to-End**
- Testa handler → validator → use case
- Garante integração correta

### 3. **Tratamento de Erros**
- Valida status codes corretos
- Testa mensagens de erro

### 4. **Regressão Zero**
- Mudanças em handlers são detectadas
- CI protege contra quebras

---

## 📊 MÉTRICAS DE SUCESSO

- **27 handlers testados** (100%)
- **135-216 testes de integração** passando
- **Tempo de execução** < 10s
- **Taxa de sucesso** 100%
- **Coverage** de handlers ≥90%

---

## 🎬 PRÓXIMO PASSO

**Iniciar Fase 2.1**: Criar testes de integração para handlers Guest, começando pelo caminho crítico (`confirm-upload`).

```bash
# Comando para rodar apenas testes de integração
pnpm vitest run --grep="integration"
```

---

> **"Testes de integração são a ponte entre unidade e E2E — garantem que os sistemas conversam corretamente."**

🎯 **FASE 2 INICIANDO!** 🎯
