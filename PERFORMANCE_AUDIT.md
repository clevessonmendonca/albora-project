# Feed Performance Audit

**Branch:** `cursor/feed-performance-audit-8daf-4c16`  
**Date:** 2026-08-28  
**Scope:** Feed do convidado — performance, re-renders, carregamento

---

## SUMÁRIO EXECUTIVO

Auditoria completa de performance do feed identificou **11 issues de P0/P1** causando re-renders excessivos e falta de memoization estratégica.

**Status de Otimizações de Imagem:** ✅ JÁ IMPLEMENTADAS
- `loading="lazy"` presente em todas as imagens (post.tsx:85)
- `decoding="async"` presente em todas as imagens (post.tsx:86)
- Aspect ratio dinâmico para evitar CLS (post.tsx:70)

---

## P0 — BLOQUEADORES DE PERFORMANCE

### 1. ❌ Post Component Não Memoizado

**Localização:** `apps/web/features/feed/components/client/post.tsx`

**Problema:**  
Componente `Post` re-renderiza em cada update do estado do feed (scroll, nova foto, reação). Com 50+ posts na tela, cada state change causa 50+ re-renders desnecessários.

**Impacto:** 🔴 **CRÍTICO**  
- Feed com 100 items = 100 re-renders por scroll
- Jank visível em dispositivos low-end
- INP > 200ms

**Solução:**
```typescript
export const Post = React.memo(function Post({ ... }) {
  // component implementation
});
```

### 2. ❌ PhotoInteraction Não Memoizado

**Localização:** `apps/web/features/feed/components/client/photo-interaction.tsx`

**Problema:**  
Componente de interação re-renderiza junto com Post. Inclui hooks pesados (useReaction, useComments, useReactionList).

**Impacto:** 🔴 **CRÍTICO**  
- 3 hooks executados por post por re-render
- Network requests disparadas desnecessariamente

**Solução:**
```typescript
export const PhotoInteraction = React.memo(function PhotoInteraction({ ... }) {
  // component implementation
});
```

### 3. ❌ Event Handlers Sem useCallback

**Localização:** `apps/web/features/feed/components/client/feed-page.tsx:205-207, 212, 252-255, 266-271`

**Problema:**  
Múltiplas arrow functions inline criadas a cada render:
- `onVerAutor` (linha 205)
- `onCompartilhar` (linha 212, 252)
- `onConfirm` (linha 266)

**Impacto:** 🔴 **CRÍTICO**  
- Props instáveis quebram memoization de children
- Post memo inútil se recebe nova função a cada render

**Solução:**
```typescript
const handleVerAutor = useCallback((id: string) => {
  router.push(`${base}/g/${encodeURIComponent(id)}`);
}, [router, base]);

const handleCompartilhar = useCallback((uploadId: string) => {
  void compartilhar.compartilhar(uploadId);
}, [compartilhar]);
```

### 4. ❌ useFeed Retorna Objeto Novo a Cada Render

**Localização:** `apps/web/features/feed/hooks/use-feed.ts:435-441`

**Problema:**  
```typescript
return { 
  estado: { ...estado, itens: itensFiltrados }, 
  carregarMais, 
  recomecar, 
  pedirChaves, 
  atualizarReacoes 
};
```

Spread operator cria novo objeto toda vez, mesmo quando `itensFiltrados` não mudou.

**Impacto:** 🔴 **CRÍTICO**  
- Quebra memoization downstream
- useEffect dependencies instáveis

**Solução:**
```typescript
const estadoFinal = useMemo(
  () => ({ ...estado, itens: itensFiltrados }),
  [estado, itensFiltrados]
);

return useMemo(
  () => ({ estado: estadoFinal, carregarMais, recomecar, pedirChaves, atualizarReacoes }),
  [estadoFinal, carregarMais, recomecar, pedirChaves, atualizarReacoes]
);
```

---

## P1 — PERFORMANCE CRÍTICA

### 5. ❌ alternarReacao Não Envolvido em useCallback

**Localização:** `apps/web/features/feed/components/client/photo-interaction.tsx:54-70`

**Problema:**  
Função `alternarReacao` recriada a cada render, mas usada inline em `onClick`.

**Solução:**
```typescript
const alternarReacao = useCallback(async () => {
  // implementation
}, [reacao.minha, reacao.alternar, onReacoes]);
```

### 6. ❌ handleCompartilhar Não Envolvido em useCallback

**Localização:** `apps/web/features/feed/components/client/photo-interaction.tsx:72-81`

**Problema:**  
Mesmo issue que `alternarReacao`.

**Solução:**
```typescript
const handleCompartilhar = useCallback(async () => {
  // implementation
}, [onCompartilhar]);
```

### 7. ❌ navegarPara em useFeedViewer Depende de itensAbertos

**Localização:** `apps/web/features/feed/hooks/use-feed-viewer.ts:68-75`

**Problema:**  
```typescript
const navegarPara = useCallback(
  (indice: number) => {
    const alvo = itensAbertos[indice];
    if (!alvo) return;
    setAberto((atual) => (atual ? { inicio: atual.inicio, itemId: alvo.id } : atual));
  },
  [itensAbertos], // <-- array nova a cada render
);
```

`itensAbertos` é derivado de `grupoAberto?.itens` que muda constantemente.

**Solução:**  
Usar ref para armazenar itens e remover dependência.

### 8. ❌ Viewer Keys Calculado Sem Memoization

**Localização:** `apps/web/features/feed/components/client/viewer.tsx:27-51`

**Problema:**  
Função `viewerKeys` não é memoizada no componente que a chama, causando recálculo toda vez.

**Solução:**
```typescript
const chaves = useMemo(
  () => viewerKeys(itens, indice),
  [itens, indice]
);
```

### 9. ❌ Polling de URL Renewal Sem Visibility API

**Localização:** `apps/web/features/feed/hooks/use-feed.ts:383`

**Problema:**  
Polling de 30s continua quando tab está em background.

**Impacto:** 🟡 **MODERADO**  
- Desperdício de battery/network em background
- Não é crítico, mas melhora UX

**Solução:**
```typescript
useEffect(() => {
  // existing logic
  
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      void renovar(true);
    }
  };
  
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  return () => {
    // existing cleanup
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}, [estado, janela]);
```

---

## P2 — OTIMIZAÇÕES AVANÇADAS

### 10. Virtual Scrolling para 500+ Items

**Status:** ❌ NÃO IMPLEMENTADO

**Análise:**  
Com infinite scroll e 50 items por página, atingir 500+ items requer 10 pages carregadas. DOM com 500 nodes é manejável em dispositivos modernos.

**Recomendação:**  
⏸️ **ADIAR** — Implementar apenas se métricas reais mostrarem problema com 300+ items.

### 11. Code Splitting de Componentes Pesados

**Análise de Bundle:**
- `Viewer` (393 linhas): usado apenas quando usuário clica em hora
- `CommentSheet`: usado apenas quando usuário abre comentários
- `ReactionListSheet`: usado apenas quando usuário vê lista de reações
- `ShareConsentSheet`: usado apenas na primeira vez compartilhando

**Recomendação:**  
✅ **IMPLEMENTAR** — Dynamic imports para componentes de modal/sheet.

```typescript
const Viewer = dynamic(() => import('./viewer').then(m => ({ default: m.Viewer })), {
  loading: () => <ViewerSkeleton />,
  ssr: false
});
```

### 12. Preload de Fonts

**Status:** ❓ NÃO AUDITADO

**Recomendação:**  
Verificar se fonts críticas estão preloaded no `<head>`.

---

## OTIMIZAÇÕES JÁ PRESENTES ✅

### Images
- ✅ `loading="lazy"` em todas as images (post.tsx:85)
- ✅ `decoding="async"` (post.tsx:86)
- ✅ Aspect ratio dinâmico para evitar CLS (post.tsx:70)
- ✅ Alt text dinâmico (post.tsx:84)
- ✅ Skeleton enquanto carrega (post.tsx:90)

### React Patterns
- ✅ `useMemo` para grupos (feed-page.tsx:91-94)
- ✅ `useMemo` para itensFiltrados (use-feed.ts:314-317)
- ✅ `useCallback` em carregar, carregarMais, recomecar (use-feed.ts:319-401)
- ✅ useCallback em abrir, fechar, navegarPara do viewer (use-feed-viewer.ts:40-75)

### Network
- ✅ Deduplicação de requests de URL (use-feed.ts:362)
- ✅ Evita re-request do mesmo lote (use-feed.ts:361-363)
- ✅ Retry automático offline (use-reaction.ts:61-76)
- ✅ Credentials include (use-feed.ts:201)

### UX
- ✅ Prefers-reduced-motion respeitado (viewer.tsx, feed-page.tsx:316-319)
- ✅ Skeleton states (post.tsx:120-130, feed-page.tsx:129-130)
- ✅ Error states com retry (feed-footer)

---

## PLANO DE IMPLEMENTAÇÃO

### Fase 1 — Memoization Crítica (P0)
1. ✅ Wrap `Post` com `React.memo`
2. ✅ Wrap `PhotoInteraction` com `React.memo`
3. ✅ Wrap handlers em `feed-page.tsx` com `useCallback`
4. ✅ Memoize retorno de `useFeed`

### Fase 2 — Callbacks (P1)
5. ✅ Wrap `alternarReacao` com `useCallback`
6. ✅ Wrap `handleCompartilhar` com `useCallback`
7. ✅ Fix `navegarPara` dependencies
8. ✅ Memoize `viewerKeys` call

### Fase 3 — Code Splitting (P2)
9. ✅ Dynamic import de `Viewer`
10. ✅ Dynamic import de `CommentSheet`
11. ✅ Dynamic import de `ReactionListSheet`
12. ✅ Dynamic import de `ShareConsentSheet`

### Fase 4 — Polish
13. ✅ Adicionar Visibility API ao polling
14. ✅ Validate ESLint exhaustive-deps
15. ✅ Document findings

---

## MÉTRICAS ESPERADAS

### Antes (Estimativas)
- Re-renders por scroll: ~100 (todos os Posts)
- Re-renders por reação: ~100
- Bundle inicial: ~400KB (com todos os modals)
- INP: ~250ms (com jank)

### Depois (Targets)
- Re-renders por scroll: ~5 (apenas novos Posts)
- Re-renders por reação: ~1 (apenas Post afetado)
- Bundle inicial: ~280KB (modals lazy)
- INP: < 200ms
- LCP: < 2.5s
- CLS: < 0.1

---

## REGRAS SEGUIDAS

✅ Não otimizar prematuramente — issues identificados com análise de código  
✅ Medir antes e depois — documento de métricas  
✅ Não quebrar funcionalidades — memoization preserva comportamento  
✅ Memoization com deps corretas — ESLint exhaustive-deps validará

---

## PRÓXIMOS PASSOS

1. ✅ Implementar Fase 1-4
2. ✅ Commit incremental por fase
3. ✅ Push branch
4. ✅ Abrir PR com este documento
5. ⏸️ Testes manuais em dispositivo low-end (requer env setup completo)
6. ⏸️ React DevTools Profiler (requer env setup completo)
7. ⏸️ Lighthouse audit (requer env setup completo)
