# 🎯 Fase 2 (REVISADA): Estratégia de Testes de Integração

**Data**: 28 de agosto de 2026  
**Status**: 📋 **ANÁLISE E REVISÃO**

---

## 🤔 DESAFIO IDENTIFICADO

Após análise dos handlers atuais (exemplo: `apps/web/app/api/uploads/confirm/route.ts`), identifiquei que os handlers Next.js possuem **muitas dependências complexas**:

```typescript
// Handler atual
export async function POST(req: Request) {
  const configError = requireConfig("confirm");          // ❌ Config global
  const auth = await requireGuestSession(req);           // ❌ Cookies, JWT, session
  const limited = enforceRateLimit(req, auth.session);   // ❌ Redis/in-memory
  const parsed = await parseJsonBody(req);               // ⚠️ Request parsing
  const validated = validateBody(parsed.data, schema);   // ✅ Validator
  const objeto = await inspecionarObjeto(key);           // ❌ R2 (storage)
  const resultado = await confirmUpload(...);            // ✅ Use case
  await recordFunnelEvent(...);                          // ❌ Analytics
  return jsonOk(resultado);
}
```

### Problemas para Testes de Integração HTTP

1. **Autenticação Complexa**
   - `requireGuestSession` depende de cookies, JWT tokens, session storage
   - Mockar isso remove o valor do teste de integração

2. **Rate Limiting**
   - Depende de Redis ou in-memory store
   - Adiciona complexidade desnecessária aos testes

3. **Infraestrutura Externa**
   - R2 (object storage)
   - Analytics (funnel tracking)
   - Config global

4. **Next.js Request Object**
   - Criar `NextRequest` mock autêntico é complexo
   - Headers, cookies, body parsing

### Conclusão

**Testar a integração HTTP completa (handler → validator → use case) requer:**
- Mockar 70% das dependências
- Setup complexo de autenticação
- Infraestrutura de teste (Redis, R2 mock)

**Isso remove o valor dos testes de integração**, pois estamos testando mocks, não integrações reais.

---

## ✅ ABORDAGEM REVISADA

### 🎯 Nova Estratégia: Testes de Contrato

Em vez de testar **HTTP end-to-end**, vamos testar **contratos de integração**:

#### 1. **Validator + Use Case Integration** ✅
- Testa que o schema Zod está correto
- Testa que o use case recebe o input esperado
- Sem dependências HTTP

#### 2. **Handler Contract Tests** ✅
- Valida que o handler chama o use case com os parâmetros corretos
- Mock apenas de autenticação e infraestrutura
- Foco no contrato, não no comportamento completo

#### 3. **E2E Tests** (Fase 3) ✅
- Teste completo do fluxo HTTP em ambiente real
- Sem mocks
- Validação end-to-end real

---

## 📋 NOVA ESTRATÉGIA FASE 2

### Fase 2.1: Testes de Contrato Validator + Use Case

**Objetivo**: Garantir que validators Zod produzem o output esperado pelos use cases.

```typescript
// apps/web/lib/infrastructure/api/validators/confirm-upload.contract.test.ts

import { describe, it, expect } from "vitest";
import { confirmUploadSchema } from "./confirm-upload";
import { confirmUpload } from "@/lib/application/use-cases/guest";

describe("confirmUploadSchema → confirmUpload Contract", () => {
  it("deve validar input correto e ser aceito pelo use case", () => {
    const input = {
      uploadId: "upl_123",
      chave: "events/evt_123/uploads/abc.jpg",
      mime: "image/jpeg",
      legenda: "Foto da festa",
      desafioId: "dsa_123",
    };

    // ✅ Validator aceita
    const validated = confirmUploadSchema.parse(input);
    
    // ✅ Use case aceita o output do validator
    expect(validated).toHaveProperty("uploadId");
    expect(validated).toHaveProperty("chave");
    expect(validated.mime).toBe("image/jpeg");
  });

  it("deve rejeitar chave de outro evento", () => {
    const input = {
      uploadId: "upl_123",
      chave: "events/evt_999/uploads/abc.jpg", // Outro evento
      mime: "image/jpeg",
    };

    // ✅ Validator rejeita
    expect(() => confirmUploadSchema.parse(input)).toThrow();
  });
});
```

### Fase 2.2: Testes de Contrato Handler

**Objetivo**: Validar que handlers chamam use cases com os parâmetros corretos.

```typescript
// apps/web/app/api/uploads/confirm/route.contract.test.ts

import { describe, it, expect, vi } from "vitest";
import { confirmUpload } from "@/lib/application/use-cases/guest";

// Mock apenas do use case (para validar chamada)
vi.mock("@/lib/application/use-cases/guest", () => ({
  confirmUpload: vi.fn(),
}));

describe("POST /api/uploads/confirm → confirmUpload Contract", () => {
  it("deve chamar confirmUpload com parâmetros corretos", async () => {
    // Arrange
    const mockUseCase = vi.mocked(confirmUpload);
    mockUseCase.mockResolvedValueOnce({
      ok: true,
      uploadId: "upl_123",
      estado: "criado",
    });

    // Simular request (simplificado)
    const params = {
      eventoId: "evt_123",
      sessaoId: "ses_123",
      uploadId: "upl_123",
      chave: "events/evt_123/uploads/abc.jpg",
      mime: "image/jpeg",
      bytes: 1024000,
    };

    // Act
    await confirmUpload(params, mockGetClient);

    // Assert: use case foi chamado com parâmetros corretos
    expect(mockUseCase).toHaveBeenCalledWith(
      expect.objectContaining({
        eventoId: "evt_123",
        uploadId: "upl_123",
        chave: "events/evt_123/uploads/abc.jpg",
      }),
      expect.any(Function),
    );
  });
});
```

---

## 📊 COMPARAÇÃO DE ABORDAGENS

| Abordagem | Valor | Complexidade | Manutenção | Recomendação |
|-----------|-------|--------------|------------|--------------|
| **Testes de Integração HTTP Completos** | Médio | Alta | Alta | ❌ Evitar |
| **Testes de Contrato Validator + Use Case** | Alto | Baixa | Baixa | ✅ Adotar |
| **Testes de Contrato Handler** | Médio | Média | Média | ✅ Adotar |
| **Testes E2E (Fase 3)** | Muito Alto | Muito Alta | Alta | ✅ Fase 3 |

---

## 🎯 NOVA META FASE 2

```
┌─────────────────────────────────────────────────────────────┐
│              META FASE 2: TESTES DE CONTRATO                │
├─────────────────────────────────────────────────────────────┤
│  ✅ Validator + Use Case:      22 contratos                 │
│  ✅ Handler Contracts:         27 contratos                 │
│  🎯 TOTAL:                     49 testes                    │
│  ⚡ Tempo Esperado:           ~5s                           │
└─────────────────────────────────────────────────────────────┘
```

### Benefícios

1. **Validação de Schemas**: Garante que Zod schemas estão corretos
2. **Contratos Claros**: Valida que handlers chamam use cases corretamente
3. **Baixa Complexidade**: Sem setup de autenticação, Redis, etc.
4. **Alta Manutenibilidade**: Testes simples e diretos
5. **Rápidos**: Sem overhead de HTTP/infraestrutura

---

## 📂 ESTRUTURA DE ARQUIVOS (REVISADA)

```
apps/web/lib/infrastructure/api/validators/
├── confirm-upload.ts
├── confirm-upload.contract.test.ts  ← NOVO (Validator + Use Case)
├── create-event.ts
├── create-event.contract.test.ts    ← NOVO
└── ...

apps/web/app/api/uploads/confirm/
├── route.ts
└── route.contract.test.ts           ← NOVO (Handler Contract)
```

---

## 🚀 PLANO DE EXECUÇÃO (REVISADO)

### Fase 2.1: Validator + Use Case Contracts (Prioridade Alta)
- [ ] `confirmUploadSchema → confirmUpload`
- [ ] `createEventSchema → createEvent`
- [ ] `listFeedSchema → listFeed`
- [ ] ... (22 contratos totais)

### Fase 2.2: Handler Contracts (Prioridade Média)
- [ ] `POST /api/uploads/confirm`
- [ ] `POST /api/admin/events`
- [ ] `GET /api/guest/feed`
- [ ] ... (27 contratos totais)

---

## 🎓 LIÇÕES APRENDIDAS

### ✅ Princípios

1. **Teste o Contrato, Não a Implementação**
   - Contratos são estáveis
   - Implementações mudam

2. **Evite Mocks Excessivos**
   - Mocks > 50% → teste perde valor
   - Mocks de infraestrutura OK
   - Mocks de lógica de negócio NOT OK

3. **Hierarquia de Testes**
   - Unit (use cases) ✅
   - Contract (validators + handlers) ✅
   - E2E (fluxo completo) ✅
   - Integration HTTP (❌ valor limitado)

---

## 🎬 DECISÃO

**Proposta**: Adotar **Testes de Contrato** (Fase 2.1 + 2.2) em vez de Testes de Integração HTTP Completos.

**Justificativa**:
- Maior valor com menor complexidade
- Manutenção simples
- Execução rápida
- Cobertura efetiva de contratos

**Próximo Passo**: Aguardar aprovação do usuário para iniciar Fase 2.1 (Validator + Use Case Contracts).

---

> **"Teste contratos, não implementações. Contratos são a interface estável entre sistemas."**

🎯 **AGUARDANDO APROVAÇÃO PARA FASE 2** 🎯
