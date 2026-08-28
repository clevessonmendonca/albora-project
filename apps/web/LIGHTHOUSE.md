# 🔍 Lighthouse CI

Auditoria automatizada de performance usando Lighthouse CI.

## 📦 Setup

### Pré-requisitos
```bash
pnpm install
```

O `@lhci/cli` já está instalado como devDependency.

## 🚀 Executar Localmente

### 1. Build da aplicação
```bash
pnpm build
```

### 2. Start do servidor
```bash
pnpm start
```

### 3. Executar Lighthouse (em outro terminal)
```bash
cd apps/web
pnpm lighthouse
```

## 📊 Métricas Monitoradas

### Core Web Vitals
- **LCP** (Largest Contentful Paint): < 2.5s (warn)
- **TBT** (Total Blocking Time): < 300ms (warn)
- **CLS** (Cumulative Layout Shift): < 0.1 (error)
- **FCP** (First Contentful Paint): < 1.8s (warn)
- **Speed Index**: < 3.4s (warn)

### Lighthouse Scores
- **Performance**: ≥ 85% (error)
- **Accessibility**: ≥ 90% (error)
- **Best Practices**: ≥ 90% (error)
- **SEO**: ≥ 80% (warn)

## 🛠️ Configuração

### `lighthouserc.json`
Define as URLs a serem auditadas, número de runs, e budgets.

**URLs auditadas:**
- `/casamento-joao-maria` (landing page de exemplo)

**Runs:** 3 execuções por URL (média)

**Preset:** Desktop (fast connection)

### GitHub Actions
O workflow `.github/workflows/lighthouse-ci.yml` roda automaticamente:
- Em PRs para `main`, `stable`, `homol`
- Em push para `main`
- Manualmente via `workflow_dispatch`

## 📈 Interpretar Resultados

### Scores
- **90-100**: Excelente ✅
- **50-89**: Precisa melhorar ⚠️
- **0-49**: Ruim ❌

### Core Web Vitals (Google)
- **Good**: Verde ✅
- **Needs Improvement**: Amarelo ⚠️
- **Poor**: Vermelho ❌

## 🔧 Otimizações Comuns

### Melhorar LCP
- Otimizar imagens (WebP, tamanhos responsivos)
- Remover CSS/JS não utilizado
- Preload de recursos críticos
- CDN para assets estáticos

### Melhorar TBT/INP
- Code splitting
- Lazy loading de componentes
- Reduzir bundle JavaScript
- Web Workers para tarefas pesadas

### Melhorar CLS
- Definir dimensões de imagens/vídeos
- Evitar inserção de conteúdo dinâmico
- Usar `font-display: swap`
- Reservar espaço para ads/embeds

## 📚 Recursos

- [Lighthouse CI Docs](https://github.com/GoogleChrome/lighthouse-ci)
- [Core Web Vitals](https://web.dev/vitals/)
- [Lighthouse Scoring](https://web.dev/performance-scoring/)
- [Next.js Performance](https://nextjs.org/docs/advanced-features/measuring-performance)

## 🎯 Metas

| Métrica | Target | Status |
|---------|--------|--------|
| Performance Score | ≥ 85 | 🎯 |
| LCP | < 2.5s | 🎯 |
| TBT | < 300ms | 🎯 |
| CLS | < 0.1 | 🎯 |
