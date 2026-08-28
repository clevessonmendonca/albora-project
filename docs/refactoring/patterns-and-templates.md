# Padrões de Arquitetura e Templates

> **Documento:** Padrões e convenções para código limpo no Albora  
> **Audiência:** Desenvolvedores e agentes de código  
> **Status:** Referência canônica

---

## 1. Regras de Ouro

### 1.1 Tamanhos Máximos

| Tipo | Máximo | Ideal | Ação se ultrapassar |
|------|--------|-------|---------------------|
| **Componente** | 150 linhas | 80 linhas | Quebrar em subcomponentes |
| **Hook** | 100 linhas | 50 linhas | Extrair lógica para service |
| **Service** | 200 linhas | 120 linhas | Dividir responsabilidades |
| **Função** | 50 linhas | 20 linhas | Extrair subfunções |
| **Props** | 10 props | 5 props | Agrupar em objeto |
| **Aninhamento JSX** | 5 níveis | 3 níveis | Extrair componente |

### 1.2 Complexidade

```typescript
// ✅ BOM: Complexidade baixa
function calcularTotal(itens: Item[]): number {
  return itens.reduce((acc, item) => acc + item.preco, 0);
}

// ❌ RUIM: Complexidade alta (7 caminhos)
function processarPedido(pedido: Pedido): Result {
  if (pedido.status === 'pendente') {
    if (pedido.valor > 1000) {
      if (pedido.cliente.vip) {
        return aprovarImediato(pedido);
      } else {
        return aprovarComAnalise(pedido);
      }
    } else {
      return aprovarAutomatico(pedido);
    }
  } else if (pedido.status === 'cancelado') {
    return reembolsar(pedido);
  } else {
    return noop();
  }
}

// ✅ BOM: Extrair lógica
function processarPedido(pedido: Pedido): Result {
  const handlers = {
    pendente: () => processarPendente(pedido),
    cancelado: () => reembolsar(pedido),
  };
  
  return handlers[pedido.status]?.() ?? noop();
}
```

---

## 2. Anatomia de um Componente

### 2.1 Template Básico

```typescript
"use client"; // Se for client component

import type { ReactNode } from "react";
import { cn } from "@albora/ui-web";

/**
 * Descrição do componente em 1-2 linhas.
 * 
 * @example
 * <MeuComponente titulo="Olá" onAction={handleAction} />
 */

// Types
type MeuComponenteProps = {
  /** Descrição da prop */
  titulo: string;
  /** Descrição da prop */
  children?: ReactNode;
  /** Descrição da prop */
  onAction?: () => void;
  /** Classes CSS adicionais */
  className?: string;
};

// Component
export function MeuComponente({
  titulo,
  children,
  onAction,
  className,
}: MeuComponenteProps) {
  // 1. Hooks de contexto/roteamento
  const router = useRouter();
  
  // 2. Estado local (mínimo possível)
  const [aberto, setAberto] = useState(false);
  
  // 3. Derivações (useMemo/useCallback)
  const contador = useMemo(() => calcularContador(), [deps]);
  
  // 4. Efeitos (mínimo possível)
  useEffect(() => {
    // cleanup
    return () => {};
  }, [deps]);
  
  // 5. Handlers (sempre useCallback)
  const handleClick = useCallback(() => {
    onAction?.();
  }, [onAction]);
  
  // 6. Early returns
  if (!titulo) return null;
  
  // 7. Render (JSX limpo)
  return (
    <div className={cn("base-classes", className)}>
      <h2>{titulo}</h2>
      {children}
      <button onClick={handleClick}>Ação</button>
    </div>
  );
}
```

### 2.2 Componente de Apresentação (Dumb)

```typescript
// ✅ BOM: Apenas UI, sem lógica
type CardProps = {
  titulo: string;
  descricao: string;
  imagem: string;
  onClick: () => void;
};

export function Card({ titulo, descricao, imagem, onClick }: CardProps) {
  return (
    <article onClick={onClick} className="cursor-pointer">
      <img src={imagem} alt={titulo} />
      <h3>{titulo}</h3>
      <p>{descricao}</p>
    </article>
  );
}
```

### 2.3 Componente Container (Smart)

```typescript
// ✅ BOM: Lógica de orquestração
type FeedContainerProps = {
  filtro?: string;
};

export function FeedContainer({ filtro }: FeedContainerProps) {
  // Hook de dados
  const { itens, loading, error, loadMore } = useFeed(filtro);
  
  // Transformações
  const grupos = useMemo(() => groupByHour(itens), [itens]);
  
  // Handlers
  const handleLoadMore = useCallback(() => {
    if (!loading) loadMore();
  }, [loading, loadMore]);
  
  // Delega renderização
  return (
    <FeedList
      grupos={grupos}
      loading={loading}
      error={error}
      onLoadMore={handleLoadMore}
    />
  );
}
```

---

## 3. Anatomia de um Hook

### 3.1 Template Básico

```typescript
import { useState, useCallback, useEffect } from "react";

/**
 * Descrição do hook em 1-2 linhas.
 * 
 * @example
 * const { data, loading, refresh } = useMeuHook(id);
 */

// Types
type MeuHookResult = {
  data: Data | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
};

// Hook
export function useMeuHook(id: string): MeuHookResult {
  // 1. Estado
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // 2. Funções auxiliares
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.fetch(id);
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [id]);
  
  // 3. Efeito inicial
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // 4. Interface pública
  return {
    data,
    loading,
    error,
    refresh: fetchData,
  };
}
```

### 3.2 Hook que Usa Service

```typescript
// ✅ BOM: Hook orquestra, service executa
export function useFeed(filtro?: string) {
  const feedService = useFeedService(); // Injeção
  const [estado, setEstado] = useState<FeedEstado>(estadoInicial);
  
  const carregar = useCallback(async () => {
    setEstado(prev => ({ ...prev, carregando: true }));
    
    try {
      const resultado = await feedService.loadFeed(filtro);
      setEstado(prev => ({
        ...prev,
        itens: resultado.itens,
        carregando: false,
      }));
    } catch (erro) {
      setEstado(prev => ({
        ...prev,
        falha: 'rede',
        carregando: false,
      }));
    }
  }, [feedService, filtro]);
  
  useEffect(() => {
    carregar();
  }, [carregar]);
  
  return { estado, carregar };
}
```

---

## 4. Anatomia de um Service

### 4.1 Template Básico

```typescript
/**
 * Serviço para gerenciar [domínio].
 * 
 * Responsabilidades:
 * - [Lista de responsabilidades]
 */

// Types
export type FeedResult = {
  itens: FeedItem[];
  cursor: string | null;
};

// Service
export class FeedService {
  constructor(
    private feedRepo: FeedRepository,
    private mediaRepo: MediaRepository
  ) {}
  
  /**
   * Carrega página do feed.
   */
  async loadFeed(cursor?: string): Promise<FeedResult> {
    // 1. Buscar dados
    const page = await this.feedRepo.fetchPage(cursor);
    
    // 2. Transformar
    const items = page.items.map(this.transformItem);
    
    // 3. Enriquecer (URLs assinadas)
    const urls = await this.mediaRepo.signUrls(
      items.map(i => i.mediaKey)
    );
    
    // 4. Merge
    const enrichedItems = this.mergeUrls(items, urls);
    
    return {
      itens: enrichedItems,
      cursor: page.nextCursor,
    };
  }
  
  private transformItem(raw: RawItem): FeedItem {
    // lógica de transformação
  }
  
  private mergeUrls(items: FeedItem[], urls: Map<string, string>) {
    // lógica de merge
  }
}
```

### 4.2 Factory de Service

```typescript
// services/feed/feed.service.factory.ts
export function createFeedService(): FeedService {
  const feedRepo = new FeedRepository();
  const mediaRepo = new MediaRepository();
  
  return new FeedService(feedRepo, mediaRepo);
}

// Hook de injeção
export function useFeedService(): FeedService {
  return useMemo(() => createFeedService(), []);
}
```

---

## 5. Anatomia de um Repository

### 5.1 Template Básico

```typescript
/**
 * Repositório para acesso aos dados de [domínio].
 */

// Types
export type FeedPage = {
  items: RawFeedItem[];
  nextCursor: string | null;
};

// Repository
export class FeedRepository {
  /**
   * Busca página do feed.
   */
  async fetchPage(cursor?: string): Promise<FeedPage> {
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);
    
    const response = await fetch(`/api/feed?${params}`);
    
    if (!response.ok) {
      throw new FeedError('Falha ao carregar feed', response.status);
    }
    
    return response.json();
  }
  
  /**
   * Reage a um item do feed.
   */
  async react(uploadId: string): Promise<void> {
    const response = await fetch(`/api/uploads/${uploadId}/react`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new FeedError('Falha ao reagir', response.status);
    }
  }
}

// Erro customizado
export class FeedError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = 'FeedError';
  }
}
```

---

## 6. Máquina de Estados (Reducer)

### 6.1 Template Básico

```typescript
// Estado
type Estado =
  | { tipo: "ocioso" }
  | { tipo: "carregando" }
  | { tipo: "sucesso"; dados: Data }
  | { tipo: "erro"; mensagem: string };

// Ações
type Acao =
  | { tipo: "CARREGAR" }
  | { tipo: "SUCESSO"; dados: Data }
  | { tipo: "ERRO"; mensagem: string }
  | { tipo: "RESETAR" };

// Reducer
function reducer(estado: Estado, acao: Acao): Estado {
  switch (acao.tipo) {
    case "CARREGAR":
      return { tipo: "carregando" };
      
    case "SUCESSO":
      return { tipo: "sucesso", dados: acao.dados };
      
    case "ERRO":
      return { tipo: "erro", mensagem: acao.mensagem };
      
    case "RESETAR":
      return { tipo: "ocioso" };
      
    default:
      return estado;
  }
}

// Hook
export function useMinhaMaquina() {
  const [estado, dispatch] = useReducer(reducer, { tipo: "ocioso" });
  
  const carregar = useCallback(() => {
    dispatch({ tipo: "CARREGAR" });
    
    fetchData()
      .then(dados => dispatch({ tipo: "SUCESSO", dados }))
      .catch(err => dispatch({ tipo: "ERRO", mensagem: err.message }));
  }, []);
  
  const resetar = useCallback(() => {
    dispatch({ tipo: "RESETAR" });
  }, []);
  
  return { estado, carregar, resetar };
}
```

---

## 7. Testes

### 7.1 Template de Teste de Componente

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { MeuComponente } from './meu-componente';

describe('MeuComponente', () => {
  it('renderiza o título', () => {
    render(<MeuComponente titulo="Teste" />);
    expect(screen.getByText('Teste')).toBeInTheDocument();
  });
  
  it('chama onAction ao clicar', () => {
    const handleAction = vi.fn();
    render(<MeuComponente titulo="Teste" onAction={handleAction} />);
    
    fireEvent.click(screen.getByRole('button'));
    
    expect(handleAction).toHaveBeenCalledTimes(1);
  });
  
  it('não renderiza quando título é vazio', () => {
    const { container } = render(<MeuComponente titulo="" />);
    expect(container.firstChild).toBeNull();
  });
});
```

### 7.2 Template de Teste de Hook

```typescript
import { renderHook, act, waitFor } from '@testing-library/react';
import { useMeuHook } from './use-meu-hook';

describe('useMeuHook', () => {
  it('inicia com loading false', () => {
    const { result } = renderHook(() => useMeuHook('123'));
    expect(result.current.loading).toBe(false);
  });
  
  it('carrega dados automaticamente', async () => {
    const { result } = renderHook(() => useMeuHook('123'));
    
    await waitFor(() => {
      expect(result.current.data).not.toBeNull();
    });
  });
  
  it('atualiza ao chamar refresh', async () => {
    const { result } = renderHook(() => useMeuHook('123'));
    
    await waitFor(() => expect(result.current.data).not.toBeNull());
    
    act(() => {
      result.current.refresh();
    });
    
    expect(result.current.loading).toBe(true);
  });
});
```

### 7.3 Template de Teste de Service

```typescript
import { FeedService } from './feed.service';
import { FeedRepository } from './feed.repository';
import { MediaRepository } from './media.repository';

describe('FeedService', () => {
  let service: FeedService;
  let feedRepo: FeedRepository;
  let mediaRepo: MediaRepository;
  
  beforeEach(() => {
    feedRepo = {
      fetchPage: vi.fn(),
    } as any;
    
    mediaRepo = {
      signUrls: vi.fn(),
    } as any;
    
    service = new FeedService(feedRepo, mediaRepo);
  });
  
  it('carrega feed e assina URLs', async () => {
    const mockPage = {
      items: [{ id: '1', mediaKey: 'key1' }],
      nextCursor: 'cursor1',
    };
    
    const mockUrls = new Map([['key1', 'https://signed-url']]);
    
    vi.mocked(feedRepo.fetchPage).mockResolvedValue(mockPage);
    vi.mocked(mediaRepo.signUrls).mockResolvedValue(mockUrls);
    
    const result = await service.loadFeed();
    
    expect(result.itens).toHaveLength(1);
    expect(result.cursor).toBe('cursor1');
    expect(feedRepo.fetchPage).toHaveBeenCalledWith(undefined);
    expect(mediaRepo.signUrls).toHaveBeenCalledWith(['key1']);
  });
});
```

---

## 8. Nomenclatura

### 8.1 Arquivos

```
✅ BOM
feed-page.tsx              # kebab-case
use-feed.ts                # use-* para hooks
feed.service.ts            # *.service.ts
feed.repository.ts         # *.repository.ts
feed.types.ts              # *.types.ts
feed.test.tsx              # *.test.tsx

❌ RUIM
FeedPage.tsx               # PascalCase em arquivo
useFeed.ts                 # camelCase
feedService.ts             # sem sufixo claro
feed_repository.ts         # snake_case
```

### 8.2 Componentes

```typescript
// ✅ BOM: Nome descritivo, PascalCase
export function PhotoCard() {}
export function HourStrip() {}
export function EmptyFeedState() {}

// ❌ RUIM: Genérico, ambíguo
export function Card() {}  // Card de quê?
export function Strip() {}  // Strip de quê?
export function Empty() {}  // Empty de quê?
```

### 8.3 Hooks

```typescript
// ✅ BOM: use* + verbo/substantivo
export function useFeed() {}
export function usePhotoUpload() {}
export function useInfiniteScroll() {}

// ❌ RUIM
export function feed() {}  // Sem "use"
export function hookFeed() {}  // "hook" redundante
```

### 8.4 Funções

```typescript
// ✅ BOM: Verbo + substantivo
function carregarFeed() {}
function processarImagem() {}
function validarCota() {}

// ❌ RUIM: Substantivo puro
function feed() {}  // Verbo onde?
function imagem() {}
function cota() {}
```

---

## 9. Imports

### 9.1 Ordem

```typescript
// 1. React
import { useState, useCallback } from "react";
import type { ReactNode } from "react";

// 2. Bibliotecas externas
import { cn } from "clsx";

// 3. Absolute imports do projeto
import { isVideoMime } from "@albora/core";
import { Button } from "@albora/ui-web";

// 4. Relative imports - tipos primeiro
import type { FeedItem } from "../types";
import { useFeed } from "../hooks/use-feed";
import { FeedList } from "./feed-list";

// 5. Assets
import styles from "./feed.module.css";
```

### 9.2 Barrel Exports (index.ts)

```typescript
// ✅ BOM: Exporta interface pública
export { FeedPage } from "./feed-page";
export { useFeed } from "./use-feed";
export type { FeedItem, FeedState } from "./types";

// ❌ RUIM: export *
export * from "./feed-page";  // Exporta tudo, inclusive privado
```

---

## 10. Comentários

### 10.1 Quando Comentar

```typescript
// ✅ BOM: Explica "por quê", não "o quê"
// O NULLIF é obrigatório: sem ele, '' vira erro em vez de NULL
event_id = NULLIF(current_setting('app.event_id', true), '')::uuid

// ✅ BOM: Documenta comportamento não-óbvio
// A drenagem é em série: paralelo satura o enlace de 200 celulares
for (const item of fila) {
  await enviar(item);
}

// ❌ RUIM: Narra o código
// Incrementa o contador
contador++;

// ❌ RUIM: Comenta óbvio
// Renderiza o botão
<button>Clique</button>
```

### 10.2 TSDoc

```typescript
/**
 * Carrega página do feed com paginação por cursor.
 * 
 * @param cursor - Cursor da página anterior (opcional)
 * @returns Itens da página e próximo cursor
 * @throws {FeedError} Se a API retornar erro
 * 
 * @example
 * const { itens, cursor } = await loadFeed();
 * const proxima = await loadFeed(cursor);
 */
export async function loadFeed(cursor?: string): Promise<FeedResult> {
  // implementação
}
```

---

## 11. Checklist de PR

Antes de abrir PR de refatoração:

- [ ] **Comportamento externo idêntico** (E2E verde)
- [ ] **Todos os testes passam** (`pnpm test`)
- [ ] **Guards verdes** (`pnpm guards`)
- [ ] **Lint limpo** (`pnpm lint`)
- [ ] **Typecheck limpo** (`pnpm typecheck`)
- [ ] **Sem console.log** esquecido
- [ ] **Nenhum TODO** introduzido
- [ ] **Cobertura ≥ anterior** (não regredir)
- [ ] **Bundle size ≤ anterior** (não inflar)
- [ ] **Commits limpos** (Conventional Commits)
- [ ] **PR description** explica o "por quê"

---

## 12. Ferramentas

### 12.1 ESLint Rules

```json
{
  "rules": {
    "max-lines": ["error", { "max": 150, "skipBlankLines": true }],
    "max-lines-per-function": ["error", { "max": 50 }],
    "complexity": ["error", 10],
    "max-depth": ["error", 4],
    "max-params": ["error", 5],
    "max-nested-callbacks": ["error", 3],
    "no-console": ["error", { "allow": ["warn", "error"] }]
  }
}
```

### 12.2 Geradores (Plop.js)

```bash
pnpm plop component <nome>     # Gera componente com testes
pnpm plop hook <nome>          # Gera hook com testes
pnpm plop service <nome>       # Gera service com testes
pnpm plop feature <nome>       # Scaffolding completo
```

---

**Fim do Documento**  
**Revisão:** Contínua  
**Última atualização:** 28/08/2026
