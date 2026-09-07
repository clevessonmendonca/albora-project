# 🏗️ COMPARAÇÃO DE ARQUITETURAS — ALBORA

> Documento criado em: 28/08/2026  
> Decisão: **Opção A — Econômica** (validada)  
> Status: ✅ ARQUITETURA ESCOLHIDA

---

## 📊 RESUMO EXECUTIVO

Foram analisadas **3 opções de arquitetura** para o Albora, considerando custo, performance, escalabilidade e complexidade operacional.

**Decisão:** **Opção A — Econômica** foi escolhida por:
- ✅ Custo zero nos primeiros 3-6 meses (dentro do orçamento R$ 0-100/mês)
- ✅ Adequada para MVP (0-10 eventos/mês)
- ✅ Free tiers robustos (Cloudflare, Neon, Resend)
- ✅ Fácil upgrade quando necessário (Opção B)

---

## 🎯 OPÇÃO A — ECONÔMICA (MVP)

### Stack

```
┌─────────────────────────────────────────────────┐
│           Cloudflare CDN (Global)               │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│      Cloudflare Pages (Frontend, SSR)           │
│      - Next.js 15 (App Router)                  │
│      - React 19                                 │
│      - Free: 500 builds/mês, 100k req/dia       │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│      Cloudflare Workers (Backend)               │
│      - Next.js API Routes (via OpenNext)        │
│      - Free: 100k req/dia, 10ms CPU/req         │
└─────────────────────────────────────────────────┘
           ↙                  ↘
┌────────────────────┐  ┌───────────────────────┐
│  Neon (Database)   │  │ Cloudflare R2 (Storage)│
│  - PostgreSQL 16   │  │ - Object Storage       │
│  - Free: 0.5 GB    │  │ - Free: 10 GB          │
│  - 10 conexões     │  │ - Egress grátis        │
└────────────────────┘  └───────────────────────┘
           ↓
┌─────────────────────────────────────────────────┐
│           Resend (Email)                        │
│           - Free: 3k emails/mês                 │
└─────────────────────────────────────────────────┘
```

### Capacidade

```
Eventos/mês: 5-10
Uploads/mês: 1.5k-3k fotos
Storage: 10 GB (free tier)
Database: 0.5 GB (free tier)
Requests: 100k/dia (free tier)
Email: 3k/mês (free tier)
```

### Custo

| Item | Tier | Custo/mês |
|------|------|-----------|
| Cloudflare Pages | Free | $0 |
| Cloudflare Workers | Free | $0 |
| Neon Database | Free | $0 |
| R2 Storage (10 GB) | Free | $0 |
| Resend | Free | $0 |
| Domínio (Cloudflare Registrar) | Paid | ~$1 ($10/ano) |
| **TOTAL** | | **~$1/mês** |

**Conversão:** **R$ 5/mês** ✅ (dentro do orçamento)

### Quando Upgrade?

```
Trigger: Quando atingir 80% de qualquer limite
- Storage > 8 GB
- Database > 0.4 GB
- Eventos/mês > 8
- Emails/mês > 2.5k
```

**Próxima opção:** Opção B (R$ 280/mês).

---

### ✅ Vantagens

- ✅ **Custo:** ~R$ 5/mês (quase grátis)
- ✅ **Simplicidade:** Poucos serviços, fácil de gerenciar
- ✅ **Performance:** CDN global (Cloudflare), baixa latência
- ✅ **Escalabilidade:** Upgrade gradual (nada muda, só paga mais)
- ✅ **Confiabilidade:** SLA 99.9% (Cloudflare), 99.95% (Neon)
- ✅ **Egress grátis:** R2 via Cloudflare (economia de $180-360/mês vs AWS S3)

### ⚠️ Limitações

- ⚠️ **Capacidade:** Apenas 5-10 eventos/mês (suficiente para MVP)
- ⚠️ **Storage:** 10 GB (atingirá limite em ~3-4 meses)
- ⚠️ **Conexões DB:** 10 simultâneas (pode ser insuficiente em pico)
- ⚠️ **SPOF:** Neon sem replica (downtime possível)
- ⚠️ **Support:** Free tier = suporte comunidade (sem SLA pago)

### 🎯 Ideal Para

- ✅ MVP (validação de produto)
- ✅ Primeiros 3-6 meses
- ✅ 0-10 eventos/mês
- ✅ Orçamento apertado (R$ 0-100/mês)

---

## 💰 OPÇÃO B — EQUILIBRADA (Crescimento)

### Stack

```
┌─────────────────────────────────────────────────┐
│           Cloudflare CDN (Global)               │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│      Vercel Pro (Frontend)                      │
│      - Next.js 15 (otimizado)                   │
│      - Edge Functions                           │
│      - $20/mês: builds ilimitados, analytics    │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│      Cloudflare Workers Paid (Backend)          │
│      - $5/mês base + $0.50/1M req               │
└─────────────────────────────────────────────────┘
           ↙                  ↘
┌────────────────────┐  ┌───────────────────────┐
│  Neon Scale        │  │ R2 Paid (150 GB)       │
│  - $19/mês         │  │ - $2.25/mês            │
│  - 10 GB storage   │  │ - Egress grátis        │
│  - Mais conexões   │  │                        │
└────────────────────┘  └───────────────────────┘
           ↓                      ↓
┌────────────────────┐  ┌───────────────────────┐
│  Resend Pro        │  │ Betterstack Monitoring │
│  - $20/mês         │  │ - $10/mês              │
│  - 50k emails      │  │ - Uptime + Logs        │
└────────────────────┘  └───────────────────────┘
```

### Capacidade

```
Eventos/mês: 20-50
Uploads/mês: 6k-15k fotos
Storage: 150 GB
Database: 10 GB
Requests: 1M-2M/mês
Email: 50k/mês
```

### Custo

| Item | Tier | Custo/mês |
|------|------|-----------|
| Vercel Pro | Paid | $20 |
| Cloudflare Workers | Paid | $5-10 |
| Neon Scale | Paid | $19 |
| R2 Storage (150 GB) | Paid | $2.25 |
| Resend Pro | Paid | $20 |
| Betterstack | Paid | $10 |
| Domínio | Paid | $1 |
| **TOTAL** | | **$77-82/mês** |

**Conversão:** **R$ 385-410/mês** (acima do orçamento inicial, mas viável para crescimento)

### ✅ Vantagens

- ✅ **Performance:** Melhor que Opção A (edge caching, mais recursos)
- ✅ **Capacidade:** 20-50 eventos/mês
- ✅ **Monitoring:** Betterstack (uptime, logs, alertas)
- ✅ **Suporte:** Support tickets incluídos
- ✅ **Analytics:** Vercel Analytics (Core Web Vitals)

### ⚠️ Limitações

- ⚠️ **Custo:** 80x mais caro que Opção A
- ⚠️ **Complexidade:** Mais serviços para gerenciar
- ⚠️ **SPOF:** Ainda sem replica de banco (Neon Scale)

### 🎯 Ideal Para

- ✅ Crescimento (6-12 meses)
- ✅ 20-50 eventos/mês
- ✅ Necessidade de monitoring robusto
- ✅ Orçamento: R$ 200-500/mês

---

## 🚀 OPÇÃO C — ESCALA (100+ eventos/mês)

### Stack

```
┌─────────────────────────────────────────────────┐
│           Cloudflare CDN (Global)               │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│      Vercel Pro / Cloudflare Pages              │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│      Cloudflare Workers (Enterprise)            │
│      - Durable Objects para rate limiting       │
│      - Queues para async jobs                   │
└─────────────────────────────────────────────────┘
           ↙                  ↘
┌────────────────────┐  ┌───────────────────────┐
│  Neon Business     │  │ R2 (1 TB) + Multi-region│
│  - $69/mês         │  │ - $15/mês + replication │
│  - Replicas        │  │                        │
│  - Point-in-time   │  │                        │
└────────────────────┘  └───────────────────────┘
           ↓                      ↓
┌────────────────────┐  ┌───────────────────────┐
│  Resend Enterprise │  │ Datadog / New Relic    │
│  - $100/mês        │  │ - $150-200/mês         │
│  - 100k+ emails    │  │ - APM, Logs, Metrics   │
└────────────────────┘  └───────────────────────┘
```

### Capacidade

```
Eventos/mês: 100-200
Uploads/mês: 30k-60k fotos
Storage: 1 TB
Database: 50 GB
Requests: 5M-10M/mês
Email: 100k/mês
```

### Custo

| Item | Tier | Custo/mês |
|------|------|-----------|
| Vercel Pro | Paid | $20 |
| Cloudflare Workers | Enterprise | $50-100 |
| Neon Business | Paid | $69 |
| R2 Storage (1 TB) | Paid | $15 |
| Resend Enterprise | Paid | $100 |
| Datadog | Paid | $150-200 |
| Domínio | Paid | $1 |
| **TOTAL** | | **$405-505/mês** |

**Conversão:** **R$ 2025-2525/mês**

### ✅ Vantagens

- ✅ **Escala:** 100-200 eventos/mês
- ✅ **Resiliência:** Replicas de banco, multi-region storage
- ✅ **Observabilidade:** APM completo (Datadog)
- ✅ **Support:** SLA garantido, suporte 24/7
- ✅ **Performance:** Otimizado para alta carga

### ⚠️ Limitações

- ⚠️ **Custo:** R$ 2000+/mês
- ⚠️ **Complexidade:** Muitos serviços, equipe DevOps necessária

### 🎯 Ideal Para

- ✅ Escala (12+ meses)
- ✅ 100-200 eventos/mês
- ✅ Empresa estabelecida
- ✅ Orçamento: R$ 2000-5000/mês

---

## 📊 COMPARAÇÃO LADO A LADO

| Critério | Opção A | Opção B | Opção C |
|----------|---------|---------|---------|
| **Custo/mês** | R$ 5 | R$ 400 | R$ 2500 |
| **Eventos/mês** | 5-10 | 20-50 | 100-200 |
| **Storage** | 10 GB | 150 GB | 1 TB |
| **SLA** | 99% | 99.5% | 99.9% |
| **Monitoring** | Básico | Betterstack | Datadog (full) |
| **Suporte** | Comunidade | Email/ticket | 24/7 |
| **Complexidade** | Baixa | Média | Alta |
| **Setup Time** | 1-2 dias | 3-5 dias | 1-2 semanas |

---

## 🎯 DECISÃO: OPÇÃO A — ECONÔMICA

### Justificativa

A **Opção A** foi escolhida porque:

1. **Orçamento:** R$ 5/mês ✅ (dentro de R$ 0-100/mês)
2. **Capacidade:** Adequada para MVP (0-10 eventos/mês)
3. **Risco:** Baixo (free tiers robustos, empresas confiáveis)
4. **Upgrade Path:** Fácil migração para Opção B quando necessário
5. **Time to Market:** Rápido (1-2 dias de setup)

### Plano de Migração (Opção A → B)

```
Quando atingir:
- 8+ eventos/mês
- 8+ GB storage
- 2.5k+ emails/mês

Ações:
1. Monitorar métricas semanalmente
2. Alertar quando atingir 80% dos limites
3. Upgrade gradual:
   → Neon Free → Neon Scale ($19/mês)
   → R2 Free → R2 Paid ($0.015/GB/mês)
   → Resend Free → Resend Pro ($20/mês, se necessário)
4. Total: ~$50-80/mês (R$ 250-400/mês)
```

### Riscos Identificados

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Storage limite atingido | ALTA | MÉDIO | Monitorar semanalmente, alertar em 80% |
| DB conexões insuficientes | MÉDIA | ALTO | Connection pooling, load testing |
| Neon downtime | BAIXA | CRÍTICO | Backup diário, restore < 4h |
| R2 indisponível | BAIXÍSSIMA | CRÍTICO | R2 durabilidade 99.999999999% |

---

## ✅ PRÓXIMOS PASSOS

### Fase 6: Implementação (Esta Semana)

```
1. Configurar domínio (albora.app via Cloudflare Registrar)
2. Deploy staging (Cloudflare Pages)
3. Configurar DNS (Cloudflare)
4. SSL automático (Cloudflare)
5. Configurar ambientes (dev/staging/prod)
6. Validar arquitetura (load testing básico)
```

### Fase 7: Monitoramento (Próxima Semana)

```
1. Implementar health checks
2. Configurar alertas (Betterstack free tier)
3. Monitorar métricas de uso (storage, DB, requests)
4. Definir trigger points para upgrade
```

---

**Status:** ✅ ARQUITETURA ESCOLHIDA (Opção A)  
**Próxima Fase:** Fase 6 — Segurança  
**Revisão:** Mensal (validar se upgrade necessário)  
**Data:** 28/08/2026
