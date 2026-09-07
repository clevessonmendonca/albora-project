# 🎯 FASE 4: LIGHTHOUSE CI + PERFORMANCE BUDGETS

**Status**: 🚀 **EM IMPLEMENTAÇÃO**  
**Data Início**: 28/08/2026  
**Prioridade**: ⚡ **ALTA** (Core Web Vitals)

---

## 📊 CONTEXTO

### Conquistas Anteriores
- ✅ **Fase 1**: 57 use cases, 344 testes unitários (100%)
- ✅ **Fase 2.1**: 16 schemas Zod, 169 testes de contrato (100%)
- ✅ **Fase 3**: 8 E2E specs, 28 testes (100%), CI/CD integrado
- ✅ **Total**: 541 testes, 100% sucesso

### Por Que Lighthouse CI?

**Garantir Performance em Produção:**
- Validar Core Web Vitals antes de deploy
- Detectar regressões de performance
- Garantir experiência excepcional (sábado 20h)
- Budget enforcement automático

---

## 🎯 OBJETIVO

Configurar Lighthouse CI para validar automaticamente:
- **LCP** (Largest Contentful Paint) < 2.5s
- **INP** (Interaction Next Paint) < 200ms
- **TTI** (Time to Interactive) < 3.0s
- **Bundle Size** (Rota convidado) < 100KB

---

## 🏗️ IMPLEMENTAÇÃO

### 1. Performance Budgets

**Core Web Vitals (Google):**
```json
{
  "lcp": { "budget": 2500 },      // < 2.5s (Good)
  "inp": { "budget": 200 },       // < 200ms (Good)
  "tti": { "budget": 3000 },      // < 3.0s (Good)
  "cls": { "budget": 0.1 },       // < 0.1 (Good)
  "fcp": { "budget": 1800 },      // < 1.8s (Good)
  "speedIndex": { "budget": 3400 } // < 3.4s (Good)
}
```

**Bundle Budgets:**
```json
{
  "route-guest": { "budget": 100 },    // < 100KB
  "route-admin": { "budget": 150 },    // < 150KB
  "total-js": { "budget": 250 }        // < 250KB
}
```

### 2. Lighthouse Configuration

**`lighthouserc.json`:**
```json
{
  "ci": {
    "collect": {
      "url": [
        "http://localhost:3000/casamento-joao-maria",
        "http://localhost:3000/casamento-joao-maria/foto",
        "http://localhost:3000/casamento-joao-maria/feed"
      ],
      "numberOfRuns": 3,
      "settings": {
        "preset": "desktop",
        "throttling": {
          "rttMs": 40,
          "throughputKbps": 10240,
          "cpuSlowdownMultiplier": 1
        }
      }
    },
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.9 }],
        "categories:best-practices": ["error", { "minScore": 0.9 }],
        "categories:seo": ["warn", { "minScore": 0.8 }],
        
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "total-blocking-time": ["error", { "maxNumericValue": 200 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "first-contentful-paint": ["error", { "maxNumericValue": 1800 }],
        "speed-index": ["error", { "maxNumericValue": 3400 }]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

### 3. GitHub Actions Workflow

**`.github/workflows/lighthouse-ci.yml`:**
```yaml
name: Lighthouse CI

on:
  pull_request:
    branches: [main, stable, homol]
  push:
    branches: [main]

jobs:
  lighthouse:
    name: Lighthouse Performance Audit
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 10
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Build application
        run: pnpm build
        env:
          SKIP_ENV_VALIDATION: true
      
      - name: Start server
        run: pnpm start &
        env:
          PORT: 3000
      
      - name: Wait for server
        run: npx wait-on http://localhost:3000 --timeout 60000
      
      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli
          lhci autorun
      
      - name: Upload Lighthouse reports
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: lighthouse-reports
          path: .lighthouseci/
          retention-days: 30
```

### 4. Scripts npm

**`apps/web/package.json`:**
```json
{
  "scripts": {
    "lighthouse": "lhci autorun",
    "lighthouse:collect": "lhci collect",
    "lighthouse:assert": "lhci assert",
    "lighthouse:upload": "lhci upload"
  }
}
```

---

## 📊 MÉTRICAS DE SUCESSO

### Performance Targets

| Métrica | Target | Status | Prioridade |
|---------|--------|--------|------------|
| **LCP** | < 2.5s | ⏳ | 🔥 Crítica |
| **INP** | < 200ms | ⏳ | 🔥 Crítica |
| **TTI** | < 3.0s | ⏳ | 🔥 Crítica |
| **CLS** | < 0.1 | ⏳ | ⚡ Alta |
| **FCP** | < 1.8s | ⏳ | ⚡ Alta |
| **Speed Index** | < 3.4s | ⏳ | ⚡ Alta |

### Bundle Size Targets

| Rota | Target | Status | Prioridade |
|------|--------|--------|------------|
| **Guest (/)** | < 100KB | ⏳ | 🔥 Crítica |
| **Admin** | < 150KB | ⏳ | ⚡ Alta |
| **Total JS** | < 250KB | ⏳ | ⚡ Alta |

### Lighthouse Scores

| Categoria | Target | Status |
|-----------|--------|--------|
| **Performance** | ≥ 90 | ⏳ |
| **Accessibility** | ≥ 90 | ⏳ |
| **Best Practices** | ≥ 90 | ⏳ |
| **SEO** | ≥ 80 | ⏳ |

---

## 🚀 BENEFÍCIOS

### Desenvolvimento
✅ Feedback imediato sobre performance  
✅ Detecção precoce de regressões  
✅ Otimizações guiadas por dados  

### Produção
✅ Core Web Vitals garantidos  
✅ Experiência excepcional (sábado 20h)  
✅ SEO melhorado  
✅ Conversão aumentada  

### CI/CD
✅ Validação automática em PRs  
✅ Bloqueio de merges com regressões  
✅ Histórico de performance  

---

## 📋 PLANO DE EXECUÇÃO

### Sprint 1: Setup (1h)
- [ ] Instalar @lhci/cli
- [ ] Criar lighthouserc.json
- [ ] Definir budgets
- [ ] Criar workflow GitHub Actions

### Sprint 2: Validação (1h)
- [ ] Executar primeira auditoria
- [ ] Ajustar budgets conforme baseline
- [ ] Validar em CI
- [ ] Documentar resultados

### Sprint 3: Otimização (2h)
- [ ] Identificar gargalos
- [ ] Otimizar bundle size
- [ ] Implementar code splitting
- [ ] Validar melhorias

---

## 🎯 DEFINIÇÃO DE PRONTO (DoD)

### Critérios de Aceite
- [ ] Lighthouse CI instalado e configurado
- [ ] Budgets definidos para Core Web Vitals
- [ ] Workflow GitHub Actions funcionando
- [ ] Primeira auditoria executada com sucesso
- [ ] Relatórios salvos como artifacts
- [ ] Documentação completa

### Gates de Qualidade
- [ ] Performance score ≥ 90
- [ ] Accessibility score ≥ 90
- [ ] Best Practices score ≥ 90
- [ ] LCP < 2.5s
- [ ] INP < 200ms
- [ ] TTI < 3.0s
- [ ] Bundle (guest) < 100KB

---

## 📚 REFERÊNCIAS

- [Lighthouse CI Docs](https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/getting-started.md)
- [Core Web Vitals](https://web.dev/vitals/)
- [Performance Budgets](https://web.dev/performance-budgets-101/)
- [Next.js Performance](https://nextjs.org/docs/advanced-features/measuring-performance)

---

## 📊 PROGRESSO

```
┌─────────────────────────────────────────────────────────────┐
│              FASE 4: LIGHTHOUSE CI + BUDGETS                 │
├─────────────────────────────────────────────────────────────┤
│  Status:     🚀 EM IMPLEMENTAÇÃO                            │
│  Progresso:  0% (setup iniciando)                           │
│  ETA:        ~4 horas                                        │
└─────────────────────────────────────────────────────────────┘
```

---

**Próximas Ações:**
1. ⚡ Instalar @lhci/cli
2. ⚡ Criar lighthouserc.json
3. ⚡ Criar workflow GitHub Actions
4. ⚡ Executar primeira auditoria

**Meta Final:** Lighthouse CI integrado, Core Web Vitals garantidos! 🚀
