# 📊 PLANO DE CAPACIDADE — ALBORA

> Documento criado em: 28/08/2026  
> Baseado em: Requisitos do produto + análise de carga  
> Status: ✅ ESTIMATIVAS INICIAIS

---

## 🎯 OBJETIVOS

Definir a capacidade necessária da infraestrutura para suportar:
1. MVP (primeiros 6 meses, 0-10 eventos/mês)
2. Crescimento (6-12 meses, 10-50 eventos/mês)
3. Escala (12+ meses, 50-200 eventos/mês)

---

## 📈 HIPÓTESES INICIAIS

### Evento Típico (Casamento)

```
Duração: 6-8 horas
Convidados: 100-200 pessoas
Engajamento: 40% (meta H1)
Uploads/convidado: 3-5 fotos
Total uploads/evento: 120-400 fotos
```

### Padrão de Upload

```
Fase 1 — Chegada (18h-19h): 10% dos uploads
Fase 2 — Cerimônia (19h-20h): 20% dos uploads
Fase 3 — PICO (20h-21h): 40% dos uploads ⚠️
Fase 4 — Festa (21h-23h): 25% dos uploads
Fase 5 — Saída (23h-24h): 5% dos uploads
```

**Carga Crítica (20h-21h):**
- 40% de 300 uploads (média) = **120 uploads em 60 min**
- **2 uploads/minuto (média)**
- **Pico: até 5-10 uploads/minuto (simultâneos)**

---

## 📊 CENÁRIOS DE CARGA

### Cenário 1: MVP (0-6 meses)

```
Eventos/mês: 5-10
Eventos simultâneos (sábado): 2-3
Convidados/evento: 150 (média)
Uploads/evento: 300 (média, 40% engajamento)
Total uploads/mês: 1.5k-3k fotos

Tráfego:
- Page views/mês: ~50k-100k
- API requests/mês: ~200k-500k
- Uploads/dia: ~50-100

Storage:
- Upload/foto: 3 MB (média após EXIF removal)
- Storage/mês: 4.5-9 GB
- Storage acumulado (6 meses): ~30 GB
```

**Infraestrutura Necessária:**
- Cloudflare Workers: 100k req/dia (free tier OK)
- Neon Database: 0.5 GB → 1 GB (free → upgrade)
- R2 Storage: 10 GB → 50 GB (free → paid)
- Resend: 3k emails/mês (free tier OK)

**Custo Estimado:** $0-10/mês (primeiros 3 meses), depois $20-50/mês.

---

### Cenário 2: Crescimento (6-12 meses)

```
Eventos/mês: 20-50
Eventos simultâneos (sábado): 5-8
Convidados/evento: 150 (média)
Uploads/evento: 300 (média)
Total uploads/mês: 6k-15k fotos

Tráfego:
- Page views/mês: ~200k-500k
- API requests/mês: ~1M-2M
- Uploads/dia: ~200-500

Storage:
- Storage/mês: 18-45 GB
- Storage acumulado (12 meses): ~150 GB
```

**Infraestrutura Necessária:**
- Cloudflare Workers: 100k-500k req/dia (paid)
- Neon Database: Scale plan ($19/mês)
- R2 Storage: 150 GB ($2.25/mês)
- Resend: Pro ($20/mês, 50k emails)

**Custo Estimado:** $50-100/mês.

---

### Cenário 3: Escala (12+ meses)

```
Eventos/mês: 100-200
Eventos simultâneos (sábado): 10-15
Convidados/evento: 150 (média)
Uploads/evento: 300 (média)
Total uploads/mês: 30k-60k fotos

Tráfego:
- Page views/mês: ~1M-2M
- API requests/mês: ~5M-10M
- Uploads/dia: ~1k-2k

Storage:
- Storage/mês: 90-180 GB
- Storage acumulado (24 meses): ~1 TB
```

**Infraestrutura Necessária:**
- Cloudflare Workers: Enterprise (ou Vercel Pro)
- Neon Database: Business ($69/mês) ou AWS RDS
- R2 Storage: 1 TB ($15/mês)
- Resend: Enterprise ($100/mês)
- Monitoring: Datadog/New Relic ($100-200/mês)

**Custo Estimado:** $300-500/mês.

---

## 🔥 TESTE DE CARGA CRÍTICA (Sábado 20h-21h)

### Objetivo: 150 uploads em 20 minutos

```
Uploads simultâneos: até 10-15
Duração: 20 minutos
Total: 150 uploads

Por upload:
1. POST /api/uploads/presign (~200ms)
2. PUT R2 presigned URL (~2-5s, cliente → R2)
3. POST /api/uploads/confirm (~300ms)

Carga total:
- 150 × 3 requests = 450 API calls em 20 min
- 22.5 requests/min = 0.375 req/s (baixo!)
- Mas com picos de até 10 req/s simultâneos
```

**Gargalos Esperados:**

1. **Database Connections (Neon Free Tier)**
   - Limite: 10 conexões simultâneas
   - Risco: "too many connections" em pico
   - Mitigação: Connection pooling (já configurado)

2. **R2 Presign Generation**
   - Latência: ~100-200ms por presign
   - Risco: Acumular se muitos simultâneos
   - Mitigação: Usar Workers (low latency)

3. **Story Creation (DB Writes)**
   - Latência: ~300-500ms por story
   - Risco: Locks no banco
   - Mitigação: Async + queue (já implementado)

**Teste Necessário (Fase 9):**
- Load testing com k6: simular 150 uploads/20min
- Monitorar: latência, CPU, memória, conexões DB
- Validar: 0% de erros, latência p95 < 1s

---

## 💾 CRESCIMENTO DE STORAGE

### Projeção de Armazenamento

```
Mês 1-3 (MVP): ~15 GB (R$ 0, dentro do free tier)
Mês 4-6: ~30 GB (R$ 25/mês, upgrade necessário)
Mês 7-12: ~100 GB (R$ 50/mês)
Ano 2: ~500 GB (R$ 250/mês)
Ano 3: ~1 TB (R$ 500/mês)
```

**Política de Retenção (CLAUDE.md):**
- Fotos disponíveis: 365 dias após o evento
- Export automático: dia 330 (para nuvem do casal)
- Delete automático: dia 365

**Economia de Storage:**
- Sem política: 1 TB em 2 anos
- Com política: ~300-400 GB (eventos recentes)
- **Economia: ~60-70%**

---

## 🌐 TRÁFEGO DE REDE

### Bandwidth (Egress)

```
Cenário MVP:
- 3k fotos/mês × 3 MB = 9 GB upload/mês
- Views: 10x uploads = 90 GB download/mês
- Total: ~100 GB/mês

Cenário Crescimento:
- 15k fotos/mês × 3 MB = 45 GB upload/mês
- Views: 10x uploads = 450 GB download/mês
- Total: ~500 GB/mês

Cenário Escala:
- 60k fotos/mês × 3 MB = 180 GB upload/mês
- Views: 10x uploads = 1.8 TB download/mês
- Total: ~2 TB/mês
```

**Custo de Bandwidth:**
- Cloudflare R2: Egress GRÁTIS (via Cloudflare CDN)
- Cloudflare Workers: 10 GB grátis/dia, depois grátis via CDN
- **Economia: ~$180-360/mês vs AWS S3**

---

## 💰 CUSTO POR CENÁRIO

### MVP (0-6 meses)

| Serviço | Tier | Custo |
|---------|------|-------|
| Cloudflare Workers | Free | $0 |
| Neon Database | Free → Scale | $0-19/mês |
| R2 Storage | Free → Paid (50 GB) | $0-1/mês |
| Resend | Free | $0 |
| Domain | Cloudflare Registrar | $10/ano (~$1/mês) |
| **TOTAL** | | **$0-20/mês** |

**Conversão:** R$ 0-100/mês ✅ (dentro do orçamento)

---

### Crescimento (6-12 meses)

| Serviço | Tier | Custo |
|---------|------|-------|
| Cloudflare Workers | Paid | $5/mês |
| Neon Database | Scale | $19/mês |
| R2 Storage | 150 GB | $2.25/mês |
| Resend | Pro | $20/mês |
| Monitoring | Betterstack | $10/mês |
| **TOTAL** | | **$56/mês** |

**Conversão:** R$ 280/mês (acima do orçamento, revisar quando necessário)

---

### Escala (12+ meses)

| Serviço | Tier | Custo |
|---------|------|-------|
| Vercel Pro | Pro | $20/mês |
| Neon Database | Business | $69/mês |
| R2 Storage | 1 TB | $15/mês |
| Resend | Enterprise | $100/mês |
| Monitoring | Datadog | $150/mês |
| **TOTAL** | | **$354/mês** |

**Conversão:** R$ 1770/mês

---

## 📊 MÉTRICAS DE CAPACIDADE

### SLOs (Service Level Objectives)

```
Availability: 99.0% (SLA escolhido)
  - Downtime permitido: 7.3 horas/mês

Latency:
  - p50: < 300ms
  - p95: < 1s
  - p99: < 2s

Upload Success Rate: ≥ 99%
  - Máximo 1% de falhas permitidas

Database Query Time:
  - p95: < 200ms
  - p99: < 500ms
```

### Limites de Escala

```
Cloudflare Workers (Free):
  - 100k req/dia = 3M req/mês
  - CPU: 10ms/req (avg)
  - Limite: ~10-20 eventos/mês

Neon (Free):
  - 0.5 GB storage
  - 10 GB data transfer/mês
  - 10 conexões simultâneas
  - Limite: ~5-10 eventos/mês

R2 (Free):
  - 10 GB storage
  - 1M Class A ops/mês (writes)
  - 10M Class B ops/mês (reads)
  - Limite: ~3k fotos (3 MB cada)
```

**Primeiro Upgrade Necessário:** Quando atingir 10 GB storage (~3º-4º mês).

---

## 🎯 PLANO DE UPGRADE

### Trigger Points (Quando Fazer Upgrade)

```
✅ Nível 1 → Nível 2:
  - Storage > 8 GB (80% do free tier)
  - Eventos/mês > 8
  - Database > 0.4 GB
  - Emails > 2.5k/mês

✅ Nível 2 → Nível 3:
  - Storage > 100 GB
  - Eventos/mês > 40
  - Requests > 1M/dia
  - Latência p95 > 1s consistentemente
```

### Plano de Ação (Upgrade Nível 1 → 2)

```
1. Monitorar métricas semanalmente
2. Quando atingir 80% de qualquer limite:
   → Alertar equipe
   → Revisar custos
   → Aprovar upgrade

3. Upgrade:
   → R2: ativar paid ($0.015/GB/mês)
   → Neon: upgrade para Scale ($19/mês)
   → Resend: manter free (se < 3k/mês)

4. Validar:
   → Capacidade aumentou?
   → Latência melhorou?
   → Custos dentro do esperado?
```

---

## ✅ CONCLUSÕES

### Capacidade Inicial (Free Tier)

**Adequada para:**
- ✅ MVP (0-10 eventos/mês)
- ✅ Validação de produto
- ✅ Primeiros 3-6 meses

**Limitações:**
- ⚠️ Storage: 10 GB (~3k fotos)
- ⚠️ Database: 0.5 GB (~5k eventos)
- ⚠️ Conexões: 10 simultâneas (pode ser insuficiente em pico)

### Próximos Passos

1. 🟢 Implementar monitoring de capacidade (Fase 8)
2. 🟢 Configurar alertas de limite (80% de uso)
3. 🟢 Load testing (Fase 9) para validar hipóteses
4. 🟡 Planejar primeiro upgrade (quando necessário)

---

**Status:** ✅ PLANO DE CAPACIDADE DEFINIDO  
**Próxima Fase:** Fase 6 — Segurança  
**Revisão:** Mensal (monitorar métricas de uso)  
**Data:** 28/08/2026
