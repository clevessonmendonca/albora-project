# Plano Estratégico de Refatorações — Fases 4-9

## 🎯 Visão Geral

### Status Atual (Fase 3 Concluída):
- ✅ **6 features guest** refatoradas (-1.406 linhas, -56%)
- ✅ **12 arquivos core** de `lib/` migrados
- ✅ **4 componentes** extraídos para `@albora/ui-web`
- ✅ **117 módulos** criados
- ✅ **Clean Architecture** estabelecida

### Escopo Restante:
```
📦 apps/web
├── 50 arquivos admin/host     → Fase 4
├── 10 arquivos wall/telão     → Fase 5
├── 141 arquivos lib/ restantes → Fase 6
└── APIs e handlers            → Fase 7

📦 apps/mobile
└── Todo o app mobile          → Fase 8

📦 packages
├── @albora/core               → Fase 9
├── @albora/db                 → Fase 9
└── @albora/tokens             → Fase 9
```

---

## 📋 Fase 4: Admin/Host Features

**Objetivo:** Aplicar Clean Architecture nas features de administração.

### Escopo:
- **50 arquivos** identificados em `apps/web/features/admin`
- Dashboards, panels, configurações
- Export, moderação, livro

### Componentes Principais:
```
admin/
├── host-export.tsx           (export de fotos)
├── host-drive-export.tsx     (export para Drive)
├── host-album.tsx            (gestão do álbum)
├── host-identity-screen.tsx  (identidade visual)
├── host-pieces-screen.tsx    (livro físico)
├── host-missions-screen.tsx  (gestão de missões)
└── (44 outros arquivos)
```

### Estratégia:

#### 1. **Analisar Componentes God**
```bash
# Identificar maiores componentes
find apps/web/features/admin -name "*.tsx" -exec wc -l {} + | sort -rn | head -10
```

#### 2. **Criar Estrutura**
```
admin/
├── hooks/
│   ├── use-admin-export.ts
│   ├── use-drive-sync.ts
│   ├── use-moderation.ts
│   └── use-book-preview.ts
├── services/
│   ├── export-service.ts
│   ├── moderation-service.ts
│   └── book-service.ts
├── components/
│   ├── ui/                    # Atoms/molecules
│   └── client/                # Orchestrators
└── lib/
    └── admin-utils.ts
```

#### 3. **Padrões a Aplicar**
- ✅ Extrair state management para hooks
- ✅ Isolar lógica de negócio em services
- ✅ Componentizar UI (atoms → molecules → organisms)
- ✅ Aplicar SOLID e Clean Architecture
- ✅ Testes unitários (≥80% cobertura)

#### 4. **Componentes Compartilhados a Criar**
- `DataTable` — tabela de dados genérica
- `AdminPanel` — painel com header/body/footer
- `StatCard` — card de estatística
- `FilterToolbar` — toolbar de filtros
- `ExportButton` — botão de export com estados

### Meta:
- **-40% de linhas** em componentes principais
- **20-30 novos módulos** (hooks, services, UI)
- **100% SOLID compliance**
- **Duração estimada:** Foco em arquitetura, não em calendário

---

## 📋 Fase 5: Wall/Telão Features

**Objetivo:** Refatorar features de exibição no telão (realtime, animations).

### Escopo:
- **10 arquivos** em `apps/web/features/wall`
- Display em tempo real
- Animações e transições
- Pairing e sincronização

### Componentes Principais:
```
wall/
├── wall-stage.tsx                # Palco principal
├── wall-pairing-screen.tsx       # Tela de pareamento
├── wall-client.tsx               # Cliente WebSocket
├── wall-participation-counter.tsx # Contador de participação
└── lib/
    ├── use-animated-counter.ts
    └── use-wall-display.ts
```

### Desafios Específicos:
1. **Performance Crítica**
   - 60 FPS obrigatório
   - Animações suaves
   - Sem jank em dispositivos

2. **Realtime**
   - WebSocket connection management
   - Reconnection logic
   - State sync

3. **Layout Dinâmico**
   - Múltiplos formatos de foto (9:16, 16:9, 1:1, 4:3)
   - Enquadramento sem crop
   - Transições entre fotos

### Estratégia:

#### 1. **Criar Hooks Especializados**
```typescript
// wall/hooks/
use-wall-connection.ts    // WebSocket + reconnection
use-wall-queue.ts         // Fila de fotos
use-wall-animation.ts     // Animações 60fps
use-wall-layout.ts        // Layout dinâmico
use-wall-stats.ts         // Estatísticas realtime
```

#### 2. **Services**
```typescript
// wall/services/
websocket-service.ts      // WebSocket puro
queue-service.ts          // Fila de exibição
animation-service.ts      // requestAnimationFrame
layout-service.ts         // Cálculo de layout
```

#### 3. **Performance Budget**
```
- Bundle: ≤ 80KB gzipped
- First Paint: ≤ 1s
- Frame Rate: 60 FPS constante
- Memory: ≤ 50MB após 1h
```

### Meta:
- **-50% de linhas** (componentes complexos simplificados)
- **15-20 novos módulos**
- **Performance budget enforçado**
- **60 FPS garantido**

---

## 📋 Fase 6: lib/ — Migração Completa

**Objetivo:** Migrar os **141 arquivos restantes** de `lib/` para estrutura por camadas.

### Status:
- **Migrados:** 33 arquivos (19%)
- **Restantes:** 141 arquivos (81%)

### Estratégia de Migração (3 ondas):

#### **Onda 1: Infrastructure (40 arquivos)**
```
lib/infrastructure/
├── storage/
│   ├── drive-client.ts        # Google Drive
│   ├── drive-export.ts
│   └── zip-bytes.ts
├── messaging/
│   ├── whatsapp.ts            # Notificações
│   └── transport.ts
├── analytics/
│   └── platform-metrics.ts    # Já migrado
└── cdn/
    └── media-urls.ts
```

#### **Onda 2: Domain (60 arquivos)**
```
lib/domain/
├── book/
│   ├── layout.ts              # Já migrado
│   ├── pdf-generator.ts
│   ├── piece-*.ts             # 8 arquivos
│   └── generate-*.ts          # 4 arquivos
├── media/
│   ├── process.ts             # Já migrado
│   ├── classify.ts            # Já migrado
│   ├── image.ts
│   ├── music-*.ts             # 3 arquivos
│   └── frame-*.ts             # 4 arquivos
├── album/
│   ├── album.ts
│   ├── album-chapters.ts
│   └── details.ts
├── moderation/
│   ├── classify-comment.ts
│   └── content-policy.ts
└── export/
    ├── stream.ts              # Já migrado
    └── formats.ts
```

#### **Onda 3: Application + Utils (41 arquivos)**
```
lib/application/
├── export-service.ts
├── book-service.ts
├── moderation-service.ts
└── media-processing-service.ts

lib/utils/
├── app-links.ts               # Já migrado
├── share-or-download.ts       # Já migrado
├── dates.ts
├── formatting.ts
├── validation.ts
└── (36 outros utils)
```

### Plano de Execução:

#### **Passo 1: Análise de Dependências**
```bash
# Criar grafo de dependências
npx madge --circular --extensions ts,tsx apps/web/lib

# Identificar módulos sem dependências (começar por eles)
npx madge --orphans apps/web/lib
```

#### **Passo 2: Migração Incremental**
1. Migrar arquivos sem dependências primeiro
2. Atualizar imports nos arquivos movidos
3. Criar re-exports com `@deprecated`
4. Validar que nada quebrou
5. Commit atômico

#### **Passo 3: Atualização de Imports**
```typescript
// Script de migração automática
// tools/migrate-imports.ts

import { Project } from "ts-morph";

const project = new Project();
project.addSourceFilesAtPaths("apps/web/**/*.{ts,tsx}");

// Substituir imports antigos por novos
for (const sourceFile of project.getSourceFiles()) {
  sourceFile.replaceWithText(
    sourceFile.getFullText()
      .replace(/from ["']@\/lib\/db["']/g, 'from "@/lib/infrastructure/database"')
      .replace(/from ["']@\/lib\/session["']/g, 'from "@/lib/infrastructure/auth"')
      // ... mais substituições
  );
}

await project.save();
```

### Meta:
- **100% de lib/ migrado** (174 arquivos)
- **Estrutura de 4 camadas clara**
- **Zero dependências circulares**
- **Re-exports removidos** após migração completa

---

## 📋 Fase 7: APIs e Handlers

**Objetivo:** Refatorar API routes e handlers para Clean Architecture.

### Escopo:
```
apps/web/
├── app/api/                   # Next.js API routes
│   └── e/[slug]/
│       ├── feed/
│       ├── upload/
│       ├── album/
│       └── (N outras rotas)
└── lib/api/handlers/          # Business logic
    ├── admin-*.ts             # 10 handlers
    ├── guest-*.ts             # 5 handlers
    └── ops-*.ts               # 3 handlers
```

### Problemas Atuais:
- ❌ Lógica de negócio misturada com HTTP
- ❌ Validação inline
- ❌ Error handling inconsistente
- ❌ Difícil testar (precisa mockar Request/Response)

### Estrutura Alvo:

#### **Separação de Camadas**
```
lib/api/
├── controllers/               # HTTP layer
│   ├── feed-controller.ts
│   ├── upload-controller.ts
│   └── album-controller.ts
│
├── use-cases/                 # Business logic
│   ├── create-upload.ts
│   ├── publish-to-feed.ts
│   └── moderate-content.ts
│
├── validators/                # Input validation
│   ├── upload-validator.ts
│   └── comment-validator.ts
│
└── middleware/                # Cross-cutting
    ├── auth.ts
    ├── rate-limit.ts
    └── error-handler.ts
```

#### **Exemplo de Refatoração**

**Antes** (misturado):
```typescript
// app/api/e/[slug]/upload/route.ts
export async function POST(req: Request) {
  // Auth inline
  const token = req.headers.get("cookie");
  if (!token) return Response.json({ error: "unauthorized" }, { status: 401 });
  
  // Validation inline
  const body = await req.json();
  if (!body.file) return Response.json({ error: "missing file" }, { status: 400 });
  
  // Business logic inline
  const upload = await db.upload.create({...});
  await queue.enqueue({ type: "process", uploadId: upload.id });
  
  return Response.json({ uploadId: upload.id });
}
```

**Depois** (camadas):
```typescript
// lib/api/controllers/upload-controller.ts
import { createUpload } from "../use-cases/create-upload";
import { validateUpload } from "../validators/upload-validator";

export async function handleUploadCreate(req: AuthenticatedRequest) {
  const input = validateUpload(await req.json());
  const result = await createUpload(req.session, input);
  return Response.json(result);
}

// lib/api/use-cases/create-upload.ts
export async function createUpload(
  session: GuestSession,
  input: UploadInput
): Promise<UploadResult> {
  // Business logic pura, testável sem Request/Response
  const upload = await uploadRepository.create({...});
  await jobQueue.enqueue(ProcessUploadJob, { uploadId: upload.id });
  return { uploadId: upload.id };
}

// app/api/e/[slug]/upload/route.ts
export const POST = withAuth(
  withRateLimit(
    withErrorHandling(handleUploadCreate)
  )
);
```

### Meta:
- **Separation of Concerns** perfeita
- **100% testável** sem mocks de HTTP
- **Middleware composable**
- **Error handling centralizado**

---

## 📋 Fase 8: Mobile App

**Objetivo:** Aplicar Clean Architecture no app mobile (React Native).

### Escopo:
- **Todo** `apps/mobile/src/`
- Screens, components, hooks, services

### Desafios Específicos:
1. **Offline-first**
   - Queue de upload persistente
   - Sync quando volta online
   - State management otimista

2. **Performance Mobile**
   - Bundle size crítico
   - Battery consumption
   - Memory constraints

3. **Native Features**
   - Camera
   - Gallery
   - Push notifications
   - Background upload

### Estrutura Alvo:
```
mobile/src/
├── features/
│   ├── camera/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── screens/
│   ├── gallery/
│   └── upload/
│
├── core/
│   ├── offline-queue/
│   ├── sync/
│   └── storage/
│
├── shared/
│   ├── components/        # UI components
│   ├── hooks/             # Generic hooks
│   └── utils/             # Helpers
│
└── infrastructure/
    ├── camera-native/
    ├── storage-native/
    └── push-native/
```

### Padrões Mobile-Específicos:

#### **Offline Queue**
```typescript
// core/offline-queue/
interface QueuedAction {
  id: string;
  type: "upload" | "comment" | "reaction";
  payload: unknown;
  retries: number;
  createdAt: number;
}

class OfflineQueue {
  async enqueue(action: QueuedAction): Promise<void>;
  async process(): Promise<void>;
  async retry(id: string): Promise<void>;
  async clear(): Promise<void>;
}
```

#### **Optimistic Updates**
```typescript
// features/upload/hooks/use-optimistic-upload.ts
export function useOptimisticUpload() {
  const addOptimistic = (upload: Upload) => {
    // Add to local state immediately
    // Queue for sync
    // Rollback if fails
  };
}
```

### Meta:
- **Offline-first** 100% funcional
- **Battery-efficient** (background sync inteligente)
- **Fast** (bundle ≤ 3MB inicial)
- **Reliable** (queue com retry + exponential backoff)

---

## 📋 Fase 9: Packages (@albora/*)

**Objetivo:** Refatorar packages compartilhados.

### Escopo:
```
packages/
├── core/           # Types, constants, utils
├── db/             # Database schemas, migrations
└── tokens/         # Design tokens
```

### core/
**Atual:** Mistura de types, utils, constants
**Target:** Organização clara por domínio

```
@albora/core/
├── types/
│   ├── event.ts
│   ├── upload.ts
│   ├── mission.ts
│   └── index.ts
├── constants/
│   ├── limits.ts
│   ├── defaults.ts
│   └── index.ts
├── validators/
│   ├── event-validator.ts
│   └── upload-validator.ts
└── utils/
    ├── dates.ts
    └── formatting.ts
```

### db/
**Atual:** Procedures SQL misturados
**Target:** Organização por entidade + migrations versionadas

```
@albora/db/
├── schema/
│   ├── events.sql
│   ├── uploads.sql
│   └── missions.sql
├── migrations/
│   ├── 0001-initial.sql
│   ├── 0002-rls.sql
│   └── 0003-social.sql
├── procedures/
│   ├── event-queries.ts
│   ├── upload-queries.ts
│   └── mission-queries.ts
└── seed/
    └── dev-data.ts
```

### tokens/
**Atual:** Tokens de design
**Target:** Sistema de tokens escalável

```
@albora/tokens/
├── primitives/
│   ├── colors.ts
│   ├── spacing.ts
│   ├── typography.ts
│   └── radii.ts
├── semantic/
│   ├── light-theme.ts
│   ├── dark-theme.ts
│   └── casamento-pack.ts
└── platform/
    ├── web-tokens.ts
    ├── mobile-tokens.ts
    └── pdf-tokens.ts
```

---

## 📊 Resumo das Fases

| Fase | Área | Escopo | Módulos Estimados | Impacto |
|------|------|--------|-------------------|---------|
| **4** | Admin/Host | 50 arquivos | 20-30 módulos | -40% linhas |
| **5** | Wall/Telão | 10 arquivos | 15-20 módulos | -50% linhas |
| **6** | lib/ completo | 141 arquivos | 141 módulos organizados | 100% migrado |
| **7** | APIs | ~30 handlers | Controllers + Use Cases | Testabilidade 10x |
| **8** | Mobile | Todo app | Estrutura completa | Offline-first |
| **9** | Packages | 3 packages | Organização clara | Reuso maximizado |

---

## 🎯 Priorização Estratégica

### **Alta Prioridade** (fazer primeiro):
1. **Fase 6 (lib/)** — Base para tudo, bloqueia outras fases
2. **Fase 4 (Admin)** — Segunda maior superfície de usuário
3. **Fase 7 (APIs)** — Testabilidade crítica

### **Média Prioridade**:
4. **Fase 5 (Wall)** — Performance crítica mas escopo pequeno
5. **Fase 8 (Mobile)** — Importante mas independente

### **Baixa Prioridade**:
6. **Fase 9 (Packages)** — Melhorias incrementais, não urgente

---

## 📏 Métricas de Sucesso

### Por Fase:
- ✅ Redução de linhas em componentes principais (≥30%)
- ✅ Criação de módulos isolados e testáveis
- ✅ Cobertura de testes (≥80%)
- ✅ Zero dependências circulares
- ✅ 100% SOLID compliance
- ✅ Documentação completa

### Global:
- ✅ **Todo o projeto** seguindo Clean Architecture
- ✅ **Zero god components** (≥150 linhas)
- ✅ **Cobertura ≥90%** em todo código novo
- ✅ **Performance budgets** enforçados
- ✅ **CI guards** para arquitetura

---

## 🚀 Próximos Passos Imediatos

1. **Commitar este plano**
2. **Criar issues no GitHub** (uma por fase)
3. **Começar Fase 6** (lib/ completo) — base para tudo
4. **Paralelizar Fase 4** (Admin) se time crescer

---

**Este plano transforma o projeto completamente de código funcional para código LEGENDARY em todas as superfícies. Clean Architecture não será mais parcial — será total.** 🏆
