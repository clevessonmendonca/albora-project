# Plano de Reorganização — `apps/web/lib/`

## 🎯 Objetivo

Organizar `apps/web/lib/` por **domínio** e **infraestrutura**, seguindo Clean Architecture. Atualmente está desorganizado — mistura lógica de negócio, infraestrutura e utilitários.

## 📊 Estado Atual (Análise)

```
apps/web/lib/
├── db.ts                     # Infraestrutura
├── session.ts                # Infraestrutura
├── email.ts                  # Infraestrutura
├── media.ts                  # Domínio (Mídia)
├── classify-media.ts         # Domínio (Moderação)
├── export-stream.ts          # Domínio (Export)
├── generate-piece-pdf.ts     # Domínio (Livro)
├── book-layout.ts            # Domínio (Livro)
├── queue.ts                  # Infraestrutura
├── share-or-download.ts      # Utilitário
├── app-links.ts              # Utilitário
├── platform-metrics.ts       # Infraestrutura
├── drive-config.ts           # Infraestrutura
├── parse-pieces-query.ts     # Domínio (Admin)
└── api/
    ├── guest-auth.ts         # Infraestrutura
    ├── validation.ts         # Infraestrutura
    └── handlers/             # API Routes (misturado)
```

**Problemas:**
- ❌ Sem separação clara domínio vs infraestrutura
- ❌ Difícil encontrar código relacionado
- ❌ Acoplamento alto
- ❌ Sem reusabilidade clara

## 🏗️ Estrutura Alvo

```
apps/web/lib/
├── domain/                    # Business Logic (pura)
│   ├── media/
│   │   ├── classify.ts
│   │   ├── process.ts
│   │   └── validate.ts
│   ├── export/
│   │   ├── stream.ts
│   │   └── formats.ts
│   ├── book/
│   │   ├── layout.ts
│   │   ├── pdf-generator.ts
│   │   └── piece-parser.ts
│   └── moderation/
│       ├── classifier.ts
│       └── rules.ts
│
├── infrastructure/            # External Systems
│   ├── database/
│   │   ├── client.ts
│   │   └── queries.ts
│   ├── storage/
│   │   ├── media-storage.ts
│   │   └── drive-config.ts
│   ├── email/
│   │   ├── client.ts
│   │   └── templates.ts
│   ├── queue/
│   │   ├── client.ts
│   │   └── jobs.ts
│   └── auth/
│       ├── session.ts
│       └── guest-auth.ts
│
├── application/               # Use Cases / Services
│   ├── export-event-service.ts
│   ├── book-service.ts
│   ├── media-service.ts
│   └── moderation-service.ts
│
├── utils/                     # Helpers Puros
│   ├── app-links.ts
│   ├── share-or-download.ts
│   ├── platform-metrics.ts
│   └── validation.ts
│
└── api/                       # API Layer (mantido)
    └── handlers/
```

## 📋 Princípios da Reorganização

### 1. **Separação por Camada**
```
domain/          → Business logic pura (sem deps externas)
infrastructure/  → Integrações (DB, Storage, Email, etc.)
application/     → Orquestração (use cases)
utils/           → Helpers puros (sem estado)
```

### 2. **Regras de Dependência**
```
utils → nada
domain → utils
infrastructure → utils
application → domain + infrastructure + utils
api → application + infrastructure
```

### 3. **Critérios de Organização**

**Domain:**
- Lógica de negócio pura
- Sem dependências de framework
- Testável sem mocks
- Ex: `classify-media.ts`, `book-layout.ts`

**Infrastructure:**
- Integração com sistemas externos
- DB, Storage, Email, Queue, Auth
- Mockável em testes
- Ex: `db.ts`, `email.ts`, `queue.ts`

**Application:**
- Orquestra domain + infra
- Implementa use cases
- Ex: exportar evento, gerar livro

**Utils:**
- Funções puras auxiliares
- Zero estado, zero side-effects
- Ex: `app-links.ts`, `validation.ts`

## 🔄 Plano de Migração (3 Fases)

### Fase 1: Infraestrutura (1 sprint)
```bash
# Mover integrações externas
lib/db.ts → lib/infrastructure/database/client.ts
lib/session.ts → lib/infrastructure/auth/session.ts
lib/email.ts → lib/infrastructure/email/client.ts
lib/queue.ts → lib/infrastructure/queue/client.ts
lib/drive-config.ts → lib/infrastructure/storage/drive-config.ts
lib/api/guest-auth.ts → lib/infrastructure/auth/guest-auth.ts
```

### Fase 2: Domain (1 sprint)
```bash
# Mover lógica de negócio
lib/classify-media.ts → lib/domain/media/classify.ts
lib/media.ts → lib/domain/media/process.ts
lib/export-stream.ts → lib/domain/export/stream.ts
lib/generate-piece-pdf.ts → lib/domain/book/pdf-generator.ts
lib/book-layout.ts → lib/domain/book/layout.ts
lib/parse-pieces-query.ts → lib/domain/book/piece-parser.ts
```

### Fase 3: Application & Utils (1 sprint)
```bash
# Criar services de orquestração
lib/application/export-service.ts (novo)
lib/application/book-service.ts (novo)
lib/application/media-service.ts (novo)

# Mover utilitários
lib/app-links.ts → lib/utils/app-links.ts
lib/share-or-download.ts → lib/utils/share-or-download.ts
lib/platform-metrics.ts → lib/utils/platform-metrics.ts
lib/api/validation.ts → lib/utils/validation.ts
```

## ✅ Benefícios Esperados

### Imediato
- ✅ Código mais fácil de encontrar
- ✅ Separação clara de responsabilidades
- ✅ Imports mais semânticos

### Curto Prazo
- ✅ Testes mais fáceis (domain testável sem mocks)
- ✅ Reusabilidade maior
- ✅ Onboarding mais rápido

### Médio Prazo
- ✅ Mudanças de infra isoladas (trocar DB, email, etc.)
- ✅ Domain logic portável (pode virar package)
- ✅ Escalabilidade arquitetural

## 📏 Métricas de Sucesso

- [ ] 100% dos arquivos de domain sem deps de infra
- [ ] 100% dos arquivos de infra mockáveis
- [ ] Zero import circular
- [ ] Docs de arquitetura atualizados
- [ ] Guia de onde colocar novo código

## 🚀 Exemplo: Antes vs Depois

### Antes
```typescript
// apps/web/lib/classify-media.ts
import { db } from "./db";  // ❌ Domain depende de infra

export async function classifyMedia(file: File) {
  const result = await classifyWithAI(file);
  await db.insert(...);  // ❌ Domain faz DB direto
  return result;
}
```

### Depois
```typescript
// apps/web/lib/domain/media/classify.ts
export function classifyMedia(buffer: Buffer): Classification {
  // ✅ Puro: buffer → classification
  return { safe: true, tags: [...] };
}

// apps/web/lib/application/media-service.ts
import { classifyMedia } from "@/lib/domain/media/classify";
import { db } from "@/lib/infrastructure/database/client";

export async function processUpload(file: File) {
  const buffer = await file.arrayBuffer();
  const classification = classifyMedia(buffer);  // ✅ Domain
  await db.insert(classification);  // ✅ Infra
  return classification;
}
```

## 📚 Referências

- Clean Architecture (Robert C. Martin)
- Hexagonal Architecture (Ports & Adapters)
- Domain-Driven Design (Eric Evans)
- Screaming Architecture (Uncle Bob)

---

**Status:** 📋 Planejado  
**Prioridade:** Média (Fase 2)  
**Esforço:** 3 sprints  
**Impacto:** Alto (arquitetura)
