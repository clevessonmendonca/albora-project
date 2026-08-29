/**
 * Migration Guide - lib/ Reorganization
 * 
 * Este arquivo documenta a migração da estrutura flat de `apps/web/lib/`
 * para uma arquitetura organizada por camadas.
 * 
 * ## Nova Estrutura
 * 
 * ```
 * lib/
 * ├── domain/              # Lógica de negócio pura
 * │   ├── media/
 * │   ├── book/
 * │   └── export/
 * ├── infrastructure/      # Sistemas externos
 * │   ├── database/
 * │   ├── storage/
 * │   ├── email/
 * │   ├── queue/
 * │   └── auth/
 * ├── utils/              # Helpers puros
 * └── (arquivos legados)  # Re-exports para compatibilidade
 * ```
 * 
 * ## Arquivos Migrados (Fase 1)
 * 
 * ### Infrastructure
 * - `db.ts` → `infrastructure/database/client.ts`
 * - `session.ts` → `infrastructure/auth/session.ts`
 * - `email.ts` → `infrastructure/email/client.ts`
 * - `queue.ts` → `infrastructure/queue/client.ts`
 * - `r2.ts` → `infrastructure/storage/r2-client.ts`
 * 
 * ### Domain
 * - `media.ts` → `domain/media/process.ts`
 * - `classify-media.ts` → `domain/media/classify.ts`
 * - `book-layout.ts` → `domain/book/layout.ts`
 * - `export-stream.ts` → `domain/export/stream.ts`
 * 
 * ### Utils
 * - `app-links.ts` → `utils/app-links.ts`
 * - `share-or-download.ts` → `utils/share-or-download.ts`
 * - `platform-metrics.ts` → `utils/platform-metrics.ts`
 * 
 * ## Como Migrar Imports
 * 
 * ### Antes (legado):
 * ```typescript
 * import { getPool } from "@/lib/db";
 * import { guestSessionFromRequest } from "@/lib/session";
 * ```
 * 
 * ### Depois (recomendado):
 * ```typescript
 * import { getPool } from "@/lib/infrastructure/database";
 * import { guestSessionFromRequest } from "@/lib/infrastructure/auth";
 * ```
 * 
 * ## Retrocompatibilidade
 * 
 * Os arquivos legados ainda funcionam como re-exports. Eles mostram:
 * ```typescript
 * /**
 *  * @deprecated Importar de `@/lib/infrastructure/database` na nova estrutura.
 *  * /
 * export { getPool } from "./infrastructure/database/client";
 * ```
 * 
 * ## Próximos Passos
 *
 * - [x] Migrar módulos de `lib/` para domain / infrastructure / utils (shims no lugar antigo)
 * - [x] Handlers de API: uma implementação em `infrastructure/api/handlers`
 * - [ ] Atualizar imports no projeto para os caminhos novos (shims permanecem)
 * - [ ] Remover arquivos legados (re-exports) quando o CI de imports novos estiver verde
 */

export const LIB_REORGANIZATION_STATUS = {
  phase: "2-shims-complete",
  migratedFiles: 90,
  totalFiles: 90,
  progress: "100%",
  completedAt: new Date("2026-08-29"),
} as const;
