# `apps/web/lib/` — Arquitetura Organizada

## 📁 Estrutura por Camadas

```
lib/
├── domain/                    # 🎯 Business Logic (pura, sem deps externas)
│   ├── media/                 # Processamento e classificação de mídia
│   ├── book/                  # Layout e geração de livros
│   └── export/                # Streaming de exports
│
├── infrastructure/            # 🔧 Sistemas Externos
│   ├── database/              # PostgreSQL (pool, queries)
│   ├── storage/               # Cloudflare R2 (upload, presign)
│   ├── email/                 # Resend (envio de e-mails)
│   ├── queue/                 # Background jobs
│   └── auth/                  # Sessão de convidado
│
├── utils/                     # 🛠️ Helpers Puros (stateless)
│   ├── app-links.ts
│   ├── share-or-download.ts
│   └── platform-metrics.ts
│
├── api/                       # 🌐 API Layer (mantido como estava)
│   └── handlers/
│
└── (arquivos legados)         # ⚠️ Re-exports para compatibilidade
```

## 🎯 Regras de Dependência

```
    ┌──────────────────────────────────┐
    │      API / Components            │  ← Presentation
    └───────────┬──────────────────────┘
                ↓
    ┌──────────────────────────────────┐
    │     infrastructure/*             │  ← External Systems
    └───────────┬──────────────────────┘
                ↓
    ┌──────────────────────────────────┐
    │        domain/*                  │  ← Business Logic
    └──────────────────────────────────┘
                ↑
    ┌──────────────────────────────────┐
    │        utils/*                   │  ← Shared Utilities
    └──────────────────────────────────┘
```

### Direção Permitida:
- ✅ `infrastructure/*` → `domain/*`
- ✅ `domain/*` → `utils/*`
- ✅ `api/*` → `infrastructure/*` → `domain/*`
- ❌ `domain/*` → `infrastructure/*` (violação!)
- ❌ `utils/*` → qualquer outra camada

## 📦 Imports Recomendados

### ✅ Correto (nova estrutura):
```typescript
// Infrastructure
import { getPool } from "@/lib/infrastructure/database";
import { guestSessionFromRequest } from "@/lib/infrastructure/auth";
import { sendHostEmail } from "@/lib/infrastructure/email";

// Domain
import { classifyMedia } from "@/lib/domain/media";
import { layoutBook } from "@/lib/domain/book";

// Utils
import { appLinks } from "@/lib/utils";
```

### ⚠️ Legado (ainda funciona, mas desencorajado):
```typescript
import { getPool } from "@/lib/db";                    // @deprecated
import { guestSessionFromRequest } from "@/lib/session"; // @deprecated
```

## 🚀 Benefícios

### Antes (flat):
```
lib/
├── db.ts                    # ❓ O que é isso?
├── session.ts               # ❓ Infraestrutura ou domínio?
├── media.ts                 # ❓ Processamento ou storage?
├── book-layout.ts           # ❓ Layout ou PDF?
└── (87 outros arquivos...)  # 🤯 Impossível navegar
```

### Depois (organizado):
```
lib/
├── domain/media/            # ✅ Lógica de mídia aqui
├── infrastructure/database/ # ✅ DB aqui
├── infrastructure/storage/  # ✅ R2 aqui
└── utils/                   # ✅ Helpers aqui
```

### Ganhos Concretos:
1. **Navegação 10x mais rápida** — sei onde cada coisa vive
2. **Dependências explícitas** — sem ciclos acidentais
3. **Testabilidade** — domain/ é puro, fácil testar
4. **Reusabilidade** — infrastructure/ pode ser extraído para package
5. **Onboarding** — estrutura auto-explicativa

## 📋 Status da Migração

### Fase 1 (Concluída - 28/08/2026):
- ✅ 12 arquivos core migrados
- ✅ Re-exports para compatibilidade
- ✅ Barrel exports (`index.ts`) criados
- ✅ Testes movidos junto com código

### Fase 2 (Próxima):
- [ ] Migrar arquivos restantes (~70 arquivos)
- [ ] Atualizar todos os imports no projeto
- [ ] Remover re-exports legados
- [ ] Adicionar guards no CI (detectar deps inválidas)

## 🔍 Como Contribuir

### Ao adicionar código novo:
1. **Identifique a camada**:
   - É lógica de negócio? → `domain/`
   - É integração externa? → `infrastructure/`
   - É helper puro? → `utils/`

2. **Crie na estrutura correta**:
   ```bash
   # Exemplo: nova feature de moderação
   apps/web/lib/domain/moderation/
   ├── classifier.ts
   ├── classifier.test.ts
   ├── rules.ts
   └── index.ts
   ```

3. **Exporte via barrel**:
   ```typescript
   // domain/moderation/index.ts
   export { classifyContent } from "./classifier";
   export { getModerationRules } from "./rules";
   ```

### Ao modificar código existente:
1. **Use imports novos** em código novo
2. **Não quebre** imports legados (re-exports garantem isso)
3. **Migre gradualmente** quando tocar em arquivos legados

## 📖 Referências

- **ADR 0006**: Isolamento entre eventos (RLS)
- **CONTRIBUTING.md**: Padrões de código
- **lib-reorganization-plan.md**: Plano completo de migração
