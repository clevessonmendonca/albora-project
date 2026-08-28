# Plano de Refatoração — Arquitetura e Código Limpo

> **Criado:** 28 de agosto de 2026  
> **Objetivo:** Componentizar corretamente, separar serviços, aplicar Clean Code e Clean Architecture  
> **Prazo estimado:** 6-8 semanas (paralelo ao desenvolvimento de features)

---

## 1. Problemas Identificados

### 1.1 Componentes Gigantes (God Components)

| Componente | Linhas | Problema |
|------------|--------|----------|
| `feed-page.tsx` | **601** | Lógica de feed + viewer + scroll infinito + estado |
| `photo-page.tsx` | **596** | Câmera + editor + fila + detalhes + PWA |
| `editor-controls.tsx` | **607** | Controles + filtros + ajustes + preview |
| `viewer.tsx` | **386** | Visualizador + gestos + navegação |
| `comment-sheet.tsx` | **285** | Comentários + validação + submit |

**Impacto:** Dificulta manutenção, testes e reuso.

### 1.2 Mistura de Responsabilidades

```typescript
// ❌ Problema: PhotoPage faz TUDO
export function PhotoPage() {
  // 1. Gerencia roteamento
  const router = useRouter();
  
  // 2. Gerencia estado de upload
  const { estado, enfileirarFoto, anotar, drenarAgora } = useUpload();
  
  // 3. Gerencia PWA install
  const { disponivel, instalar, dispensar } = usePwaInstall();
  
  // 4. Gerencia refs do DOM
  const entradaCamera = useRef<HTMLInputElement>(null);
  
  // 5. Gerencia máquina de estados de UI
  const [etapa, setEtapa] = useState<Etapa>({ nome: "camera" });
  
  // 6. Gerencia missões
  const [missions, setMissions] = useState(initialMissions);
  
  // 7. Lógica de negócio inline
  useEffect(() => {
    // 50+ linhas de lógica de drenagem
  }, []);
  
  // 8. Renderiza tudo
  return (
    <GuestShell>
      {/* 500+ linhas de JSX aninhado */}
    </GuestShell>
  );
}
```

### 1.3 Falta de Camadas Claras

```
❌ Hoje:
Component → Hook → API direta

✅ Deveria ser:
Component → Hook/ViewModel → Service → Repository → API
```

### 1.4 Lib/Utils Desorganizado

```
apps/web/lib/
├── album.ts              # Domínio: álbum
├── queue.ts              # Domínio: upload
├── media.ts              # Domínio: mídia
├── db.ts                 # Infra: banco
├── r2.ts                 # Infra: storage
├── email.ts              # Infra: e-mail
├── session.ts            # Domínio: autenticação
└── ...86 arquivos        # Sem organização clara
```

### 1.5 Hooks Complexos Demais

```typescript
// ❌ use-feed.ts: 417 linhas
// Faz: fetch, paginação, cache, renovação de URLs, reações
export function useFeed(missionId: string | null) {
  // 400+ linhas de lógica
}
```

---

## 2. Arquitetura Alvo (Clean Architecture Adaptada)

### 2.1 Camadas

```
┌─────────────────────────────────────────────┐
│  Presentation (UI Components)               │  ← React Components (thin)
├─────────────────────────────────────────────┤
│  Application (Use Cases / Hooks)            │  ← Hooks como Use Cases
├─────────────────────────────────────────────┤
│  Domain (Entities + Business Logic)         │  ← @albora/core
├─────────────────────────────────────────────┤
│  Infrastructure (API / Storage / External)  │  ← Adapters
└─────────────────────────────────────────────┘
```

### 2.2 Estrutura de Pasta por Feature

```
apps/web/features/feed/
├── components/           # Presentation Layer
│   ├── ui/              # Dumb components (atoms/molecules)
│   │   ├── post-card.tsx
│   │   ├── hour-badge.tsx
│   │   └── empty-feed.tsx
│   ├── containers/      # Smart components (organisms)
│   │   ├── feed-container.tsx
│   │   └── viewer-container.tsx
│   └── pages/           # Page components
│       └── feed-page.tsx (< 150 linhas)
├── hooks/               # Application Layer (Use Cases)
│   ├── use-feed.ts
│   ├── use-infinite-scroll.ts
│   └── use-reaction.ts
├── services/            # Application Services
│   ├── feed.service.ts
│   ├── reaction.service.ts
│   └── comment.service.ts
├── repositories/        # Infrastructure Layer
│   ├── feed.repository.ts
│   └── media.repository.ts
├── domain/              # Domain Logic (quando necessário)
│   ├── models/
│   │   ├── feed-item.ts
│   │   └── hour-group.ts
│   └── use-cases/       # Domain Use Cases puros
│       └── group-by-hour.ts
├── lib/                 # Utilities específicos da feature
│   └── feed-utils.ts
└── types/               # TypeScript types
    └── feed.types.ts
```

### 2.3 Exemplo de Responsabilidades

```typescript
// ✅ Component (Presentation) - APENAS UI
export function FeedPage({ slug, eventTitle }: Props) {
  const { items, loading, error, loadMore } = useFeed();
  
  return (
    <GuestShell>
      <FeedContainer items={items} onLoadMore={loadMore} />
    </GuestShell>
  );
}

// ✅ Hook (Use Case) - Orquestra serviços
export function useFeed() {
  const feedService = useFeedService();
  const mediaService = useMediaService();
  
  // Lógica de orquestração
  return { items, loading, error, loadMore };
}

// ✅ Service - Lógica de aplicação
export class FeedService {
  constructor(
    private feedRepo: FeedRepository,
    private mediaRepo: MediaRepository
  ) {}
  
  async loadFeed(cursor?: string): Promise<FeedResult> {
    const items = await this.feedRepo.fetchPage(cursor);
    const urls = await this.mediaRepo.signUrls(items.map(i => i.key));
    return { items: this.mergeUrls(items, urls) };
  }
}

// ✅ Repository - Acesso a dados
export class FeedRepository {
  async fetchPage(cursor?: string): Promise<FeedItem[]> {
    const res = await fetch(`/api/feed?cursor=${cursor}`);
    return res.json();
  }
}
```

---

## 3. Princípios de Refatoração

### 3.1 SOLID

| Princípio | Aplicação |
|-----------|-----------|
| **S**ingle Responsibility | 1 componente = 1 razão para mudar |
| **O**pen/Closed | Extensível via props, fechado para modificação |
| **L**iskov Substitution | Interfaces consistentes |
| **I**nterface Segregation | Props mínimas, sem "god objects" |
| **D**ependency Inversion | Dependa de abstrações, não de implementações |

### 3.2 Regras de Componente

1. **< 150 linhas** por componente
2. **< 10 props** por componente
3. **< 5 níveis** de aninhamento JSX
4. **0 lógica de negócio** em componentes de apresentação
5. **Single responsibility** — se tem "e" no nome, dividir

### 3.3 Regras de Hook

1. **< 100 linhas** por hook
2. **1 responsabilidade** por hook
3. **Não chama API diretamente** — delega para service
4. **Testável** sem DOM

### 3.4 Regras de Service

1. **< 200 linhas** por service
2. **Injetável** (DI via factory ou context)
3. **Testável** com mocks
4. **Sem dependência de React**

---

## 4. Roteiro de Refatoração (Fases)

### Fase 1 — Fundação (2 semanas)

**Meta:** Criar estrutura de camadas e primeiros exemplos

- [ ] **1.1** Criar estrutura de pastas padrão
- [ ] **1.2** Implementar Service Layer para Feed (exemplo canônico)
- [ ] **1.3** Implementar Repository pattern para Feed
- [ ] **1.4** Refatorar `useFeed` para usar services
- [ ] **1.5** Documentar padrões em `docs/architecture/patterns.md`
- [ ] **1.6** Criar templates/geradores (Plop.js)

**Entregável:** Feed refatorado como referência.

### Fase 2 — Photo/Upload (2 semanas)

**Meta:** Refatorar caminho crítico de upload

- [ ] **2.1** Quebrar `PhotoPage` (596 linhas) em 5-7 componentes
- [ ] **2.2** Extrair `CameraService`, `EditorService`, `QueueService`
- [ ] **2.3** Implementar máquina de estados explícita (XState ou reducer)
- [ ] **2.4** Separar `use-upload` em 3 hooks focados
- [ ] **2.5** Testes unitários dos services

**Entregável:** Upload limpo e testável.

### Fase 3 — Componentes Compartilhados (1 semana)

**Meta:** Limpar `@albora/ui-web`

- [ ] **3.1** Auditar componentes de `ui-web`
- [ ] **3.2** Separar atoms/molecules/organisms
- [ ] **3.3** Storybook para catálogo visual
- [ ] **3.4** Testes visuais (Chromatic ou Percy)

**Entregável:** Design system organizado.

### Fase 4 — Admin (1.5 semanas)

**Meta:** Refatorar superfície do anfitrião

- [ ] **4.1** Aplicar padrão de camadas no admin
- [ ] **4.2** Extrair services de moderação, export, billing
- [ ] **4.3** Quebrar `create-event-wizard` se > 200 linhas

**Entregável:** Admin mantível.

### Fase 5 — Lib/Infra (1 semana)

**Meta:** Organizar `apps/web/lib/`

- [ ] **5.1** Reorganizar em `lib/{domain,infra,shared}/`
- [ ] **5.2** Extrair adapters (R2, DB, Email, Drive)
- [ ] **5.3** Injeção de dependência via context/factory

**Entregável:** Lib organizado por domínio.

### Fase 6 — Qualidade (1.5 semanas)

**Meta:** Elevar cobertura e performance

- [ ] **6.1** Cobertura ≥80% em services/repositories
- [ ] **6.2** Performance tests (Lighthouse CI)
- [ ] **6.3** Bundle analysis automático
- [ ] **6.4** ESLint rules customizadas (max-lines, complexity)

**Entregável:** Qualidade garantida.

---

## 5. Quick Wins (Paralelo, 1-2 dias cada)

Refatorações rápidas que podem ser feitas em paralelo:

### QW1 — Quebrar `editor-controls.tsx` (607 linhas)

```typescript
// Hoje: 1 arquivo gigante
editor-controls.tsx (607 linhas)

// Alvo: 6 componentes focados
├── filter-strip.tsx         (80 linhas)
├── adjustment-controls.tsx  (100 linhas)
├── intensity-slider.tsx     (60 linhas)
├── crop-tool.tsx           (100 linhas)
├── editor-toolbar.tsx      (80 linhas)
└── editor-controls.tsx     (150 linhas - orquestra)
```

### QW2 — Extrair hooks de `photo-page.tsx`

```typescript
// Hoje: 3 hooks inline
PhotoPage() {
  const upload = useUpload();      // 150 linhas
  const pwa = usePwaInstall();     // 80 linhas
  const etapas = useEtapas();      // inline, 100 linhas
}

// Alvo: hooks separados
├── use-photo-upload.ts
├── use-pwa-install.ts  (já existe)
└── use-photo-wizard.ts (máquina de estados)
```

### QW3 — Criar `FeedService`

```typescript
// Mover lógica de use-feed.ts para service
export class FeedService {
  async loadPage(cursor?: string) { }
  async refreshUrls(items: Item[]) { }
  async react(uploadId: string) { }
  async unreact(uploadId: string) { }
}
```

### QW4 — Organizar `lib/` por domínio

```bash
# Antes
lib/
├── album.ts
├── queue.ts
├── media.ts
└── ...86 arquivos

# Depois
lib/
├── domain/
│   ├── album/
│   ├── upload/
│   └── media/
├── infra/
│   ├── db/
│   ├── storage/
│   └── email/
└── shared/
    └── utils/
```

---

## 6. Métricas de Sucesso

| Métrica | Hoje | Alvo | Prazo |
|---------|------|------|-------|
| **Linhas por componente** | Max 607 | Max 150 | Fase 2 |
| **Linhas por hook** | Max 417 | Max 100 | Fase 2 |
| **Arquivos > 200 linhas** | 15 | 0 | Fase 4 |
| **Cobertura de testes** | ~60% | ≥80% | Fase 6 |
| **Complexidade ciclomática** | Avg 12 | Avg 6 | Fase 6 |
| **Bundle size (guest)** | ? | < 150KB | Fase 6 |

---

## 7. Ferramentas e Automações

### 7.1 Linters/Checkers

```json
// eslint.config.mjs - adicionar
{
  "rules": {
    "max-lines": ["error", { "max": 150 }],
    "max-lines-per-function": ["error", { "max": 50 }],
    "complexity": ["error", 10],
    "max-depth": ["error", 4],
    "max-params": ["error", 5]
  }
}
```

### 7.2 Geradores (Plop.js)

```bash
pnpm plop component     # Gera componente com padrão
pnpm plop service       # Gera service com testes
pnpm plop repository    # Gera repository
pnpm plop feature       # Scaffolding completo
```

### 7.3 Code Mods (jscodeshift)

```bash
# Migração automática de padrões antigos
pnpm codemod migrate-to-service feed
```

---

## 8. Guarda-Costas (Não Quebrar)

Durante toda refatoração, **MANTER**:

1. ✅ Isolamento por evento (RLS)
2. ✅ Guards de CI (tokens, domínio, packs, etc.)
3. ✅ Testes existentes passando
4. ✅ Comportamento externo idêntico
5. ✅ Performance ≥ atual

**Regra de ouro:** Refatoração não muda comportamento, apenas estrutura.

---

## 9. Próximos Passos Imediatos

### Hoje (2 horas)

```bash
# 1. Criar estrutura de pastas
mkdir -p docs/refactoring
mkdir -p apps/web/features/feed/{services,repositories,domain}

# 2. Documentar padrões
# (este arquivo)

# 3. Escolher feature piloto
# Recomendação: Feed (mais isolado)
```

### Esta Semana (QW1)

1. Quebrar `editor-controls.tsx` em 6 componentes
2. Testes unitários para cada
3. PR de exemplo

### Próximas 2 Semanas (Fase 1)

1. Implementar Service Layer completo para Feed
2. Documentar em `docs/architecture/patterns.md`
3. Template Plop.js
4. Apresentar para equipe

---

## 10. Referências

- [Clean Architecture (Uncle Bob)](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Feature-Sliced Design](https://feature-sliced.design/)
- [React Clean Architecture](https://github.com/eduardomoroni/react-clean-architecture)
- [Screaming Architecture](https://blog.cleancoder.com/uncle-bob/2011/09/30/Screaming-Architecture.html)

---

**Autor:** Cloud Agent  
**Revisão:** Necessária antes de execução  
**Status:** Proposta inicial
