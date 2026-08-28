# Refatoração Detalhada — FeedPage (601 linhas → ~150 linhas)

> **Componente:** `apps/web/features/feed/components/client/feed-page.tsx`  
> **Linhas atuais:** 601  
> **Complexidade:** Alta (scroll infinito + viewer + reações + comentários)  
> **Prazo:** 3-4 dias

---

## 1. Análise do Problema

### 1.1 Responsabilidades Misturadas

```typescript
// ❌ FeedPage faz 8 coisas diferentes:
export function FeedPage() {
  // 1. Gerenciamento de feed paginado
  const { estado, carregarMais, recomecar, pedirChaves, atualizarReacoes } = useFeed();
  
  // 2. Scroll infinito
  const { ref } = useInfiniteScroll(onLoadMore);
  
  // 3. Filtro de missões
  const [missionId, setMissaoId] = useState<string | null>(null);
  
  // 4. Viewer de fotos (overlay fullscreen)
  const [aberto, setAberto] = useState<Aberto | null>(null);
  
  // 5. Preparação de hora incompleta
  const [preparando, setPreparando] = useState<number | null>(null);
  
  // 6. Controle de vistos
  const [vistos, setVistos] = useState<ReadonlySet<number>>();
  
  // 7. Compartilhamento
  const compartilhar = useShare(eventoId, sessaoId);
  
  // 8. Agrupamento por hora
  const grupos = useMemo(() => groupByHour(estado.itens), [estado.itens]);
  
  // 9. Renderização de tudo
  return (
    <GuestShell>
      {/* 400+ linhas de JSX */}
    </GuestShell>
  );
}
```

### 1.2 Efeitos Colaterais Complexos

- **6 useEffect** interdependentes
- **4 useCallback** com dependências cruzadas
- **3 useMemo** para derivações
- Lógica de overflow do body espalhada

---

## 2. Estratégia de Quebra

### 2.1 Arquitetura Alvo

```
FeedPage (150 linhas)                    ← Orquestrador
├── FeedHeader                           ← Header com filtros
├── FeedContainer                        ← Container principal
│   ├── EmptyFeed                        ← Estado vazio
│   ├── FeedError                        ← Estado de erro
│   ├── HourGroupList                    ← Lista de grupos
│   │   └── HourGroup                    ← Grupo de 1 hora
│   │       ├── HourStrip                ← Cabeçalho da hora
│   │       └── PostGrid                 ← Grid de posts
│   │           └── Post                 ← Card individual
│   └── LoadMoreTrigger                  ← Sentinela de scroll
└── PhotoViewer                          ← Overlay de visualização
    ├── ViewerControls
    ├── ViewerContent
    └── ViewerNavigation
```

### 2.2 Separação de Hooks

```typescript
// Hoje: 1 hook gigante
useFeed() // 417 linhas

// Alvo: 4 hooks focados
├── useFeedData()          // Fetch + paginação
├── useFeedFilter()        // Filtro de missões
├── useFeedViewer()        // Estado do viewer
└── useFeedUrlManager()    // Renovação de URLs
```

---

## 3. Implementação Passo a Passo

### Passo 1 — Extrair PhotoViewer (1 dia)

**Novo arquivo:** `photo-viewer.tsx`

```typescript
type PhotoViewerProps = {
  grupo: HourGroup | null;
  indiceInicial: number;
  onClose: () => void;
  onNavigate: (indice: number) => void;
  onReact: (uploadId: string) => void;
  onComment: (uploadId: string) => void;
  onShare: (uploadId: string) => void;
};

export function PhotoViewer({
  grupo,
  indiceInicial,
  onClose,
  onNavigate,
  onReact,
  onComment,
  onShare,
}: PhotoViewerProps) {
  // Toda lógica de viewer (gestos, navegação, etc.)
  // ~200 linhas extraídas de feed-page.tsx
  
  return grupo ? (
    <div className="fixed inset-0 z-50 bg-black">
      <ViewerControls onClose={onClose} />
      <ViewerContent item={grupo.itens[indiceInicial]} />
      <ViewerNavigation onPrev={...} onNext={...} />
    </div>
  ) : null;
}
```

**Benefícios:**
- PhotoViewer testável isoladamente
- Reutilizável em outras features (álbum, minhas fotos)
- FeedPage reduz ~200 linhas

### Passo 2 — Extrair useFeedViewer (2 horas)

**Novo arquivo:** `hooks/use-feed-viewer.ts`

```typescript
type ViewerState = {
  grupoAberto: HourGroup | null;
  indiceAtual: number;
  vistos: ReadonlySet<number>;
};

export function useFeedViewer(grupos: HourGroup[]) {
  const [aberto, setAberto] = useState<Aberto | null>(null);
  const [vistos, setVistos] = useState<ReadonlySet<number>>(new Set());
  
  const grupoAberto = aberto
    ? grupos.find(g => g.inicio.getTime() === aberto.inicio)
    : null;
  
  const abrir = useCallback((grupo: HourGroup, itemId: string) => {
    setAberto({ inicio: grupo.inicio.getTime(), itemId });
  }, []);
  
  const fechar = useCallback(() => setAberto(null), []);
  
  const navegarPara = useCallback((indice: number) => {
    // lógica de navegação
  }, [grupoAberto]);
  
  const marcarVisto = useCallback((timestamp: number) => {
    setVistos(prev => new Set(prev).add(timestamp));
  }, []);
  
  return {
    grupoAberto,
    indiceAtual,
    vistos,
    abrir,
    fechar,
    navegarPara,
    marcarVisto,
  };
}
```

### Passo 3 — Extrair HourGroupList (3 horas)

**Novo arquivo:** `components/ui/hour-group-list.tsx`

```typescript
type HourGroupListProps = {
  grupos: HourGroup[];
  onOpenPhoto: (grupo: HourGroup, itemId: string) => void;
  onReact: (uploadId: string) => void;
  vistos: ReadonlySet<number>;
  loading: boolean;
};

export function HourGroupList({
  grupos,
  onOpenPhoto,
  onReact,
  vistos,
  loading,
}: HourGroupListProps) {
  return (
    <div className="flex flex-col gap-4">
      {grupos.map((grupo) => (
        <HourGroup
          key={grupo.inicio.getTime()}
          grupo={grupo}
          visto={vistos.has(grupo.inicio.getTime())}
          onOpenPhoto={(itemId) => onOpenPhoto(grupo, itemId)}
          onReact={onReact}
        />
      ))}
      {loading && <FeedSkeleton />}
    </div>
  );
}
```

**Componentes filhos:**

```typescript
// hour-group.tsx (~80 linhas)
function HourGroup({ grupo, visto, onOpenPhoto, onReact }) {
  return (
    <section>
      <HourStrip grupo={grupo} visto={visto} />
      <PostGrid itens={grupo.itens} onOpen={onOpenPhoto} onReact={onReact} />
    </section>
  );
}

// post-grid.tsx (~60 linhas)
function PostGrid({ itens, onOpen, onReact }) {
  return (
    <div className="grid grid-cols-3 gap-1">
      {itens.map(item => (
        <Post key={item.id} item={item} onOpen={onOpen} onReact={onReact} />
      ))}
    </div>
  );
}
```

### Passo 4 — Extrair useFeedFilter (1 hora)

**Novo arquivo:** `hooks/use-feed-filter.ts`

```typescript
export function useFeedFilter(missions: FilterMission[]) {
  const [missionId, setMissionId] = useState<string | null>(null);
  
  const filtroAtivo = useMemo(
    () => missions.find(m => m.id === missionId),
    [missions, missionId]
  );
  
  const limpar = useCallback(() => setMissionId(null), []);
  
  return {
    missionId,
    filtroAtivo,
    setFiltro: setMissionId,
    limpar,
  };
}
```

### Passo 5 — Refatorar FeedPage (3 horas)

**Arquivo refatorado:** `feed-page.tsx` (~150 linhas)

```typescript
export function FeedPage({
  slug,
  eventTitle,
  missions,
  copy,
  cameraPath,
  hostMessageLabel,
  anfitriaoPlural,
  eventoId,
  sessaoId,
}: FeedPageProps) {
  const base = `/e/${encodeURIComponent(slug)}`;
  
  // Hooks focados
  const { missionId, filtroAtivo, setFiltro, limpar } = useFeedFilter(missions);
  const { estado, carregarMais, recomecar, atualizarReacoes } = useFeed(missionId);
  const compartilhar = useShare(eventoId, sessaoId);
  
  // Derivações
  const grupos = useMemo(
    () => groupByHour(estado.itens, { temMais: !estado.fim }),
    [estado.itens, estado.fim]
  );
  
  // Viewer
  const viewer = useFeedViewer(grupos);
  
  // Infinite scroll
  const sentinelaRef = useInfiniteScrollTrigger({
    onIntersect: carregarMais,
    enabled: !estado.fim && !estado.carregando && !estado.falha,
  });
  
  // Estados de UI
  const primeiraCarga = !estado.jaCarregou && estado.carregando;
  const vazio = estado.jaCarregou && estado.itens.length === 0;
  
  return (
    <GuestShell>
      <FeedHeader
        eventTitle={eventTitle}
        missions={missions}
        filtroAtivo={filtroAtivo}
        onSelectMission={setFiltro}
        onClearFilter={limpar}
        base={base}
      />
      
      <GuestMain>
        {primeiraCarga && <FeedSkeleton />}
        
        {estado.falha && (
          <FeedError erro={estado.falha} onRetry={recomecar} />
        )}
        
        {vazio && (
          <EmptyFeed
            cameraPath={cameraPath}
            temFiltro={!!filtroAtivo}
            onClearFilter={limpar}
          />
        )}
        
        {grupos.length > 0 && (
          <>
            <HourGroupList
              grupos={grupos}
              onOpenPhoto={viewer.abrir}
              onReact={atualizarReacoes}
              vistos={viewer.vistos}
              loading={estado.carregando}
            />
            
            <div ref={sentinelaRef} className="h-px" />
          </>
        )}
      </GuestMain>
      
      <PhotoViewer
        grupo={viewer.grupoAberto}
        indiceInicial={viewer.indiceAtual}
        onClose={viewer.fechar}
        onNavigate={viewer.navegarPara}
        onReact={atualizarReacoes}
        onComment={(id) => {/* abrir sheet */}}
        onShare={compartilhar.iniciar}
      />
      
      <FloatingNav active="inicio" base={base} />
      
      {compartilhar.estado.aberto && (
        <ShareConsentSheet
          onClose={compartilhar.fechar}
          onConfirm={compartilhar.confirmar}
        />
      )}
    </GuestShell>
  );
}
```

**Resultado:**
- FeedPage: 601 → **~150 linhas** ✅
- Legibilidade: ⭐⭐⭐⭐⭐
- Testabilidade: Cada peça isolada
- Reusabilidade: PhotoViewer usado em 3 lugares

---

## 4. Estrutura Final de Arquivos

```
features/feed/
├── components/
│   ├── ui/                           # Componentes puros
│   │   ├── empty-feed.tsx            (50 linhas)
│   │   ├── feed-error.tsx            (60 linhas)
│   │   ├── feed-skeleton.tsx         (40 linhas)
│   │   ├── hour-group.tsx            (80 linhas)
│   │   ├── hour-strip.tsx            (130 linhas) ← já existe
│   │   ├── post-grid.tsx             (60 linhas)
│   │   └── post.tsx                  (127 linhas) ← já existe
│   ├── containers/                   # Componentes smart
│   │   ├── feed-container.tsx        (100 linhas)
│   │   ├── feed-header.tsx           (80 linhas)
│   │   └── hour-group-list.tsx       (120 linhas)
│   ├── viewer/                       # Viewer isolado
│   │   ├── photo-viewer.tsx          (150 linhas)
│   │   ├── viewer-controls.tsx       (60 linhas)
│   │   ├── viewer-content.tsx        (100 linhas)
│   │   └── viewer-navigation.tsx     (70 linhas)
│   └── pages/
│       └── feed-page.tsx             (150 linhas) ✅
├── hooks/
│   ├── use-feed.ts                   (200 linhas) ← refatorado
│   ├── use-feed-filter.ts            (40 linhas)  ← novo
│   ├── use-feed-viewer.ts            (100 linhas) ← novo
│   └── use-infinite-scroll.ts        (já existe)
├── services/                         # Novo
│   └── feed.service.ts               (150 linhas)
├── repositories/                     # Novo
│   └── feed.repository.ts            (80 linhas)
└── lib/
    └── group-by-hour.ts              (já existe)
```

**Total:**
- Antes: 1 arquivo gigante (601 linhas)
- Depois: 15 arquivos focados (média 90 linhas)

---

## 5. Testes

### 5.1 Testes Unitários

```typescript
// photo-viewer.test.tsx
describe('PhotoViewer', () => {
  it('abre com foto correta', () => {});
  it('navega para próxima foto', () => {});
  it('fecha com ESC', () => {});
  it('reage à foto', () => {});
});

// use-feed-viewer.test.ts
describe('useFeedViewer', () => {
  it('abre grupo e marca como visto', () => {});
  it('navega entre fotos do grupo', () => {});
  it('fecha viewer', () => {});
});

// hour-group-list.test.tsx
describe('HourGroupList', () => {
  it('renderiza grupos ordenados', () => {});
  it('marca grupos vistos', () => {});
  it('chama onOpenPhoto ao clicar', () => {});
});
```

### 5.2 Testes de Integração

```typescript
// feed-page.integration.test.tsx
describe('FeedPage Integration', () => {
  it('carrega feed e abre foto', async () => {
    render(<FeedPage {...props} />);
    await waitFor(() => expect(screen.getByText('Hora')).toBeInTheDocument());
    fireEvent.click(screen.getByAltText('Foto 1'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
  
  it('scroll infinito carrega mais', async () => {
    render(<FeedPage {...props} />);
    // scroll até o fim
    // verificar que carregarMais foi chamado
  });
});
```

---

## 6. Checklist de Execução

- [ ] **Dia 1**
  - [ ] Criar branch `refactor/feed-page`
  - [ ] Extrair PhotoViewer (200 linhas)
  - [ ] Testes unitários do PhotoViewer
  - [ ] Commit: `refactor(feed): extrair PhotoViewer`

- [ ] **Dia 2**
  - [ ] Extrair useFeedViewer
  - [ ] Extrair useFeedFilter
  - [ ] Testes dos hooks
  - [ ] Commit: `refactor(feed): extrair hooks de viewer e filtro`

- [ ] **Dia 3**
  - [ ] Criar HourGroupList e componentes filhos
  - [ ] Testes de HourGroupList
  - [ ] Commit: `refactor(feed): componentizar lista de grupos`

- [ ] **Dia 4**
  - [ ] Refatorar FeedPage usando novos componentes
  - [ ] Testes de integração
  - [ ] Verificar guards, lint, typecheck
  - [ ] PR: `refactor(feed): FeedPage de 601→150 linhas`

---

## 7. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Quebrar scroll infinito | Média | Alto | Testes E2E antes/depois |
| Regredir renovação de URLs | Baixa | Alto | Manter lógica no hook, testar isoladamente |
| Performance piorar | Baixa | Médio | Lighthouse CI, comparar antes/depois |
| Overflow do body quebrar | Média | Baixo | Testar viewer em mobile |

---

## 8. Próximos Passos

Após esta refatoração:

1. **Aplicar padrão em PhotoPage** (596 linhas)
2. **Documentar padrão** em `docs/refactoring/patterns.md`
3. **Criar template Plop.js** para novas features

---

**Status:** Pronto para executar  
**Aprovação necessária:** Sim  
**Impacto em produção:** Nenhum (refatoração pura)
