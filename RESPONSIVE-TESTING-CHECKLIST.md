# Checklist de Testes de Responsividade - Feed do Convidado

## Objetivo

Validar que todas as melhorias de responsividade implementadas funcionam corretamente em todos os viewports alvo, de 320px (mobile pequeno) a 1920px (desktop grande).

---

## Melhorias Implementadas

### ✅ P0 — Mobile Quebrado (Implementado)

1. **Viewport Config** ✅
   - `viewport-fit: cover` para suporte a notch
   - `maximumScale: 5` para permitir zoom acessível
   - `initialScale: 1` para escala correta

2. **Overflow Horizontal** ✅
   - `overflow-x: hidden` no html/body
   - Previne scroll horizontal indesejado

3. **Touch Targets** ✅
   - Todos os botões têm `min-h-11` (44px) ou mais
   - Espaçamento adequado entre elementos interativos

4. **Safe Area Inset** ✅
   - `NewPhotosButton` usa `env(safe-area-inset-top)`
   - `Viewer` header/footer usam safe-area-inset
   - `FloatingNav` usa `env(safe-area-inset-bottom)`

### ✅ P1 — UX Mobile Crítica (Implementado)

1. **Densidade Mobile** ✅
   - Post component: `py-3 sm:py-4` (reduzido em mobile)
   - Image margins: `mb-2.5 sm:mb-3` (reduzido em mobile)
   - Melhor aproveitamento de espaço em viewports pequenos

2. **Fluid Typography** ✅
   - FeedEmptyState: `clamp(1.25rem, 5vw, 1.68rem)`
   - EmptyState (guest-chrome): `clamp(1.25rem, 5vw, 1.6rem)`
   - Tipografia escala fluidamente entre mobile/desktop

---

## Checklist de Testes por Viewport

### Mobile Pequeno (320px - 374px)

**Device Examples:** iPhone SE (320px), Galaxy Fold (280px fechado)

#### Layout
- [ ] Sem overflow horizontal em nenhuma página
- [ ] Todos os posts visíveis e legíveis
- [ ] Images não cortadas
- [ ] Botões não fora da tela

#### Typography
- [ ] Títulos legíveis (min 1.25rem via clamp)
- [ ] Textos de corpo legíveis
- [ ] Sem quebras de linha estranhas
- [ ] Labels de botões completos

#### Touch Targets
- [ ] Botão de curtir (Star) ≥ 44px
- [ ] Botão de comentários ≥ 44px
- [ ] Botão "Stories" ≥ 44px
- [ ] Botão "Mais opções" ≥ 44px
- [ ] Tabs do filtro temporal ≥ 44px
- [ ] Hour strip circles ≥ 44px

#### Density
- [ ] Padding do Post reduzido (py-3, não py-5)
- [ ] Margins de imagem reduzidas (mb-2.5)
- [ ] Espaço suficiente para conteúdo
- [ ] Não há desperdício de espaço vertical

#### Safe Area
- [ ] NewPhotosButton não coberto por notch
- [ ] FloatingNav não coberto por gesture bar
- [ ] Viewer header respeitando safe-area-top
- [ ] Viewer footer respeitando safe-area-bottom

---

### Mobile Padrão (375px - 413px)

**Device Examples:** iPhone 12/13/14 (390px), iPhone 14 Pro (393px), Pixel 5 (393px)

#### Layout
- [ ] Sem overflow horizontal
- [ ] Grid de fotos (MirrorGrid) balanced
- [ ] Hour strip scrollável sem cortes
- [ ] Filtros temporais scrolláveis

#### Typography
- [ ] Títulos escalados corretamente
- [ ] Legibilidade mantida
- [ ] Fluid typography funcionando

#### Interactions
- [ ] Swipe no Viewer funciona
- [ ] Pull-to-refresh (se houver) não conflita
- [ ] Scroll suave no feed
- [ ] Tap zones sem overlap

#### Density
- [ ] Posts com densidade ideal
- [ ] Não há excess whitespace
- [ ] Imagens ocupam espaço adequado

---

### Mobile Grande (414px - 479px)

**Device Examples:** iPhone 14 Plus (428px), Pixel 6 Pro (412px), Galaxy S21+ (412px)

#### Layout
- [ ] Layout transicionando para mais espaçoso
- [ ] Breakpoint sm: começando a aplicar
- [ ] Sem gaps visuais

#### Typography
- [ ] Títulos maiores via clamp
- [ ] Legibilidade excelente
- [ ] Hierarquia visual clara

#### Interactions
- [ ] Touch targets confortáveis
- [ ] Thumb zones acessíveis
- [ ] Gestures responsivos

---

### Tablet Portrait (480px - 767px)

**Device Examples:** iPad Mini (744px), Kindle Fire

#### Layout
- [ ] Layout adaptado para tela maior
- [ ] Breakpoint sm: aplicado (padding/margins maiores)
- [ ] Sem estiramento excessivo de imagens

#### Typography
- [ ] Tamanhos maiores via clamp
- [ ] Leitura confortável
- [ ] Espaçamento adequado

#### Density
- [ ] Post padding maior (py-4 via sm:)
- [ ] Margins maiores (mb-3 via sm:)
- [ ] Uso eficiente do espaço extra

---

### Tablet Landscape (768px - 1023px)

**Device Examples:** iPad (768px), iPad Air (820px), Surface (912px)

#### Layout
- [ ] Layout desktop começando a aparecer
- [ ] Sem elementos cortados nas bordas
- [ ] Central content bem posicionado

#### Typography
- [ ] Tamanhos próximos ao máximo do clamp
- [ ] Hierarquia visual forte
- [ ] Legibilidade excelente

#### Interactions
- [ ] Hover states funcionando (se device suporta)
- [ ] Touch ainda funcional
- [ ] Focus states visíveis

---

### Desktop Pequeno (1024px - 1279px)

**Device Examples:** MacBook Air 13" (1280px), laptops comuns

#### Layout
- [ ] Layout desktop completo
- [ ] Breakpoint md: aplicado (se houver)
- [ ] Content max-width respeitado

#### Typography
- [ ] Tamanhos máximos do clamp
- [ ] Leitura confortável
- [ ] Hierarquia perfeita

#### Density
- [ ] Densidade desktop (mais espaçosa)
- [ ] Whitespace adequado
- [ ] Balance visual

---

### Desktop Grande (1280px - 1919px)

**Device Examples:** MacBook Pro 14"/16", monitores 1440p

#### Layout
- [ ] Layout escalando bem
- [ ] Sem max-width problems
- [ ] Content centrado se necessário

#### Typography
- [ ] Tamanhos máximos mantidos
- [ ] Sem textos pequenos demais
- [ ] Sem textos grandes demais

---

### Desktop Extra Grande (1920px+)

**Device Examples:** Monitores 4K, ultrawide

#### Layout
- [ ] Layout não quebra
- [ ] Content não estica demais
- [ ] Whitespace controlado

#### Typography
- [ ] Tamanhos máximos via clamp funcionando
- [ ] Legibilidade mantida
- [ ] Sem gigantismo de texto

---

## Testes de Virtual Keyboard

### iOS Safari

#### Comportamento Esperado
- [ ] Virtual keyboard não cobre input field
- [ ] Scroll automático traz input para view
- [ ] Safe-area-bottom respeitada
- [ ] FloatingNav não sobrepõe keyboard

#### Comment Sheet
- [ ] Input visível quando keyboard abre
- [ ] "Publicar" button acessível
- [ ] Character counter visível
- [ ] Scroll funciona se necessário

#### Problemas Conhecidos
- [ ] iOS < 15: keyboard pode cobrir content
- [ ] Solução: `scrollIntoView()` manual se necessário

---

### Android Chrome

#### Comportamento Esperado
- [ ] Virtual keyboard empurra content
- [ ] Input field visível
- [ ] Safe-area-bottom respeitada
- [ ] FloatingNav ajusta automaticamente

#### Comment Sheet
- [ ] Input visível quando keyboard abre
- [ ] "Publicar" button acessível
- [ ] Scroll funciona
- [ ] Sem overlap de elementos

---

## Testes de Orientação

### Portrait → Landscape

- [ ] Layout adapta sem reload
- [ ] Viewer mantém estado
- [ ] Scroll position preservada
- [ ] Animations não retriggered

### Landscape → Portrait

- [ ] Layout adapta sem reload
- [ ] Feed position mantida
- [ ] Filtros mantém seleção
- [ ] Sem flash de conteúdo

---

## Testes de Performance Mobile

### 3G Slow (throttled)

- [ ] LCP < 2.5s (target)
- [ ] Images lazy load funcionando
- [ ] Skeleton screens aparecem rápido
- [ ] Sem layout shift (CLS < 0.1)

### 4G

- [ ] LCP < 1.5s
- [ ] Scroll buttery smooth (60fps)
- [ ] Animations performant
- [ ] No jank

---

## Testes de Acessibilidade Mobile

### Screen Reader (VoiceOver/TalkBack)

- [ ] Touch targets anunciados corretamente
- [ ] Botões têm labels descritivos
- [ ] Images têm alt text
- [ ] Landmarks navegáveis

### High Contrast Mode

- [ ] Borders visíveis
- [ ] Text readable
- [ ] Focus indicators claros

### Large Text

- [ ] Layout não quebra com 200% text size
- [ ] Clamp limita crescimento excessivo
- [ ] Scroll bars aparecem se necessário

---

## Testes Específicos do Feed

### Post Component

- [ ] Header com author e timestamp legíveis em 320px
- [ ] Image aspect ratio preservado em todos viewports
- [ ] Photo interaction buttons ≥ 44px touch targets
- [ ] Legenda wraps corretamente
- [ ] Sem overflow em nenhum viewport

### Viewer (Lightbox)

- [ ] Header não coberto por notch (safe-area-inset-top)
- [ ] Footer não coberto por gesture bar (safe-area-inset-bottom)
- [ ] Swipe gestures funcionam em todos devices
- [ ] Progress bars visíveis
- [ ] "Fechar" button acessível
- [ ] Photo interaction dentro do viewer funcional

### HourStrip

- [ ] Scroll horizontal funciona
- [ ] Circles ≥ 44px (size-14 = 56px ✅)
- [ ] Labels legíveis
- [ ] Sem overflow vertical

### Filtros (Temporal e Missão)

- [ ] Scroll horizontal sem cortes
- [ ] Tabs ≥ 44px (min-h-12 = 48px ✅)
- [ ] Active state visível
- [ ] Text não trunca desnecessariamente

### Empty State

- [ ] Título fluido (clamp 1.25rem-1.68rem)
- [ ] Legível em todos viewports
- [ ] CTA button ≥ 44px (min-h-[54px] ✅)
- [ ] Centrado verticalmente

### MirrorGrid

- [ ] Grid 2 colunas em mobile
- [ ] Gap adequado (gap-1.5)
- [ ] Images não cortadas
- [ ] Aspect ratios preservados

### FloatingNav

- [ ] Respeitando safe-area-bottom
- [ ] Tabs ≥ 44px (min-h-[3.375rem] = 54px ✅)
- [ ] Camera button destacado
- [ ] Não obstrui conteúdo

---

## Devices Prioritários para Teste Manual

### iOS
1. **iPhone SE (2nd/3rd gen)** - 375x667 - viewport mínimo iOS
2. **iPhone 14 Pro** - 393x852 - Dynamic Island
3. **iPhone 14 Pro Max** - 430x932 - maior iPhone
4. **iPad Air** - 820x1180 - tablet comum

### Android
1. **Galaxy S10e** - 360x760 - viewport comum Android
2. **Pixel 5** - 393x851 - viewport padrão Android moderno
3. **Galaxy S21 Ultra** - 412x915 - flagship grande
4. **Galaxy Tab S8** - 1600x2560 - tablet Android

### Desktop
1. **MacBook Air M1** - 1440x900 scaled (2880x1800 native)
2. **Dell XPS 13** - 1920x1080
3. **Monitor 4K** - 3840x2160

---

## Como Executar os Testes

### No Navegador (DevTools)

1. Abrir DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M / Cmd+Shift+M)
3. Selecionar device preset ou custom size
4. Testar em cada viewport da checklist
5. Usar throttling 3G para performance
6. Usar "Capture screenshot" para documentar

### No Device Real

1. Acessar URL em device físico
2. Testar todos os flows
3. Rotacionar device (portrait/landscape)
4. Abrir/fechar keyboard
5. Testar com safe-area (notch/dynamic island)
6. Verificar touch targets na prática

### Testes Automatizados (Futuro)

```bash
# Exemplo com Playwright
npm run test:responsive
```

---

## Critérios de Aprovação

### Obrigatórios (Bloqueantes)

✅ Layout funciona 320px-1920px sem overflow horizontal
✅ Touch targets ≥ 44px em todos elementos interativos
✅ Safe area respeitada em todos devices com notch/gesture bar
✅ Sem quebras de layout em nenhum viewport
✅ Typography legível em todos viewports (clamp funcionando)

### Desejáveis (Não-bloqueantes)

- Performance: LCP < 2.5s em 3G
- Acessibilidade: WCAG 2.1 AA compliant
- Smooth scroll: 60fps consistente
- No layout shift: CLS < 0.1

---

## Status Atual

**Data:** 2026-08-28  
**Branch:** `cursor/feed-responsive-mobile-b477`  
**Commit:** `feat(feed): auditoria completa de responsividade e mobile-first`

### Implementado ✅

- Viewport config com viewport-fit e maximumScale
- Overflow-x hidden no html/body
- Densidade mobile otimizada (Post component)
- Safe-area-inset no NewPhotosButton
- Fluid typography com clamp() (FeedEmptyState, EmptyState)
- Touch targets auditados (todos ≥ 44px)

### Aguardando Teste Manual 🧪

- Todos os breakpoints (320px-1920px)
- Virtual keyboard behavior (iOS/Android)
- Orientação portrait/landscape
- Performance em 3G
- Devices reais (iPhone, Android, iPad)

### Próximos Passos

1. **Tester manual:** executar checklist completa
2. **Documentar issues:** se houver
3. **Iterar:** corrigir problemas encontrados
4. **Aprovar:** merge após validação

---

## Notas Técnicas

### Breakpoints Tailwind

```css
/* Default (mobile-first) */
/* sm: 640px */
/* md: 768px */
/* lg: 1024px */
/* xl: 1280px */
/* 2xl: 1536px */
```

### Fluid Typography Formula

```css
clamp(MIN, PREFERRED, MAX)
```

Exemplo: `clamp(1.25rem, 5vw, 1.68rem)`
- 320px viewport: 1.25rem
- 640px viewport: ~1.46rem (interpolado)
- 1280px+ viewport: 1.68rem (max)

### Safe Area Insets

```css
env(safe-area-inset-top)    /* notch, dynamic island */
env(safe-area-inset-bottom) /* gesture bar, home indicator */
env(safe-area-inset-left)   /* landscape padding */
env(safe-area-inset-right)  /* landscape padding */
```

---

## Referências

- [CLAUDE.md](./CLAUDE.md) - Regras não negociáveis
- [Mobile Web Best Practices (W3C)](https://www.w3.org/TR/mobile-bp/)
- [Touch Target Size (Material Design)](https://m3.material.io/foundations/accessible-design/accessibility-basics#28032e45-c598-450c-b355-f9fe737b1cd8)
- [Safe Area (WebKit)](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)

---

**Auditoria completa concluída em:** 2026-08-28  
**Por:** Claude (Cloud Agent)  
**Tarefa:** FASE 3D — RESPONSIVIDADE + MOBILE-FIRST
