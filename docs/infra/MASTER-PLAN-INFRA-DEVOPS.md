# 🏗️ MASTER PLAN — INFRAESTRUTURA, DEVOPS, SRE & SEGURANÇA

> **Plano Estratégico Completo** para transformar o Albora de um produto em desenvolvimento para um sistema production-ready: seguro, escalável, observável, performático e operável.

---

## 📊 ESTADO ATUAL (Agosto 2026)

### ✅ FASES CONCLUÍDAS

| Fase | Escopo | Status |
|------|--------|--------|
| **Fase 1** | Testes Unitários | ✅ COMPLETA |
| **Fase 2.1** | Contract Tests (Zod schemas) | ✅ COMPLETA |
| **Fase 3** | E2E Tests (Playwright) | ✅ COMPLETA |
| **Fase 4** | Lighthouse CI | ✅ COMPLETA |
| **Fase 5** | Auditoria & Arquitetura (Opção A) | ✅ COMPLETA |
| **Fase 6** | Segurança (headers, rate limit, OWASP) | ✅ COMPLETA |
| **Fase 7** | Ambientes & CI/CD | ✅ COMPLETA |
| **Fase 8** | Observabilidade | ✅ COMPLETA |
| **Fase 9** | Performance & Capacity | ✅ COMPLETA |
| **Fase 10** | Disaster Recovery | ✅ COMPLETA |
| **Fase 11** | Custo | ✅ COMPLETA |
| **Fase 12** | Documentação operacional | ✅ COMPLETA |

**Total de Testes Validados (Fases 1–4):** 541 testes (histórico)

**Fases 9–12 (esta onda):** índices 0052, cache TTL da identidade, perfis `pnpm carga` (sem k6/Redis), dump/restore, RPO/RTO, runbooks, `COST.md`, onboarding.

**Conquistas:**
- ✅ Clean Architecture aplicada (55 use cases, 22 validators)
- ✅ CI/CD básico no GitHub Actions
- ✅ Performance monitoring (Lighthouse)
- ✅ RLS enforcement testado
- ✅ Critical path protegido (upload pipeline)
- ✅ Opção A (Cloudflare/Neon/R2/Resend) documentada e operável

---

## 🎯 PRÓXIMAS FASES — PRODUCTION-READY

### Ordem de Execução (Baseada no MASTER PROMPT)

```
FASE 5: AUDITORIA & ARQUITETURA
    ↓
FASE 6: SEGURANÇA (DevSecOps)
    ↓
FASE 7: AMBIENTES & CI/CD COMPLETO
    ↓
FASE 8: OBSERVABILIDADE
    ↓
FASE 9: PERFORMANCE & CAPACITY
    ↓
FASE 10: DISASTER RECOVERY & OPERAÇÃO
    ↓
FASE 11: OTIMIZAÇÃO & CUSTO
    ↓
FASE 12: DOCUMENTAÇÃO OPERACIONAL
```

---

## 📋 FASE 5: AUDITORIA & ARQUITETURA

**Objetivo:** Entender completamente a aplicação, mapear dependências, definir capacidade e escolher arquitetura de produção.

### 5.1 Auditoria Completa da Aplicação

**Stack Atual (a validar):**
- **Frontend:** Next.js 15+ App Router, React 19, TypeScript
- **Backend:** Next.js API Routes → Cloudflare Workers (OpenNext)
- **Database:** PostgreSQL 16 (Neon)
- **Storage:** Cloudflare R2
- **Email:** Resend
- **Auth:** Magic links, guest tokens (JWT)
- **Monorepo:** pnpm workspaces

**Auditoria a realizar:**

```
✅ Tarefas:
1. Mapear TODAS as dependências (packages, APIs externas)
2. Identificar TODOS os secrets/env vars necessários
3. Mapear integrações externas (Resend, R2, Drive, etc.)
4. Identificar portas, protocolos, runtime requirements
5. Mapear fluxo completo: User → Frontend → API → Services → DB → Storage
6. Identificar pontos críticos (SPOF)
7. Identificar gargalos prováveis
```

**Deliverables:**
- `docs/infra/AUDITORIA-STACK.md` — Mapeamento completo
- `docs/infra/DEPENDENCIAS.md` — Lista de dependências e versões
- `docs/infra/SECRETS-INVENTORY.md` — Inventário de secrets necessários
- `docs/infra/INTEGRACAO-EXTERNA.md` — Todas as APIs e serviços externos

---

### 5.2 Análise de Capacidade

**Perguntas a responder:**

```
1. Quantos eventos simultâneos esperamos?
2. Quantos convidados por evento (média/pico)?
3. Quantos uploads simultâneos no pico (sábado 20h)?
4. Qual o tamanho médio de foto/vídeo?
5. Qual o crescimento esperado do banco (GB/mês)?
6. Qual o padrão de tráfego? (picos vs constante)
7. Quais recursos são mais pesados? (CPU, memória, banco, storage)
```

**Hipóteses Iniciais (a validar):**
- 10 eventos simultâneos (Fase MVP)
- 150 convidados por evento
- 150 uploads em 20 min (pico)
- 3 MB por foto (média)
- Picos concentrados em sábados (19h-23h)

**Deliverable:**
- `docs/infra/CAPACITY-PLAN.md` — Estimativas de capacidade

---

### 5.3 Comparação de Arquiteturas

**Opção A — Extremamente Econômica (MVP)**

```
Frontend: Cloudflare Pages (gratuito, 500 builds/mês)
Backend: Cloudflare Workers (gratuito, 100k req/dia)
Database: Neon (gratuito, 0.5 GB, 10 GB transfer/mês)
Storage: Cloudflare R2 (gratuito, 10 GB storage, 1M reads/mês)
Email: Resend (gratuito, 3k emails/mês)
CDN: Cloudflare (incluído)

Custo Estimado: $0 - $20/mês
Capacidade: ~5-10 eventos/mês, ~500 fotos/evento
Limitações: Limites de free tier, sem redundância
```

**Opção B — Equilíbrio Custo/Performance (Crescimento)**

```
Frontend: Vercel (Pro $20/mês)
Backend: Cloudflare Workers (Paid $5/mês + usage)
Database: Neon (Scale $19/mês) + connection pooling
Storage: Cloudflare R2 (Paid, $0.015/GB/mês)
Email: Resend (Pro $20/mês)
Monitoring: Betterstack / Sentry (Free tiers)

Custo Estimado: $80-150/mês
Capacidade: ~50 eventos/mês, ~1000 fotos/evento
Escalabilidade: Média, pode crescer até ~100 eventos/mês
```

**Opção C — Preparada para Escala (100+ eventos/mês)**

```
Frontend: Cloudflare Pages + CDN
Backend: Cloudflare Workers (Enterprise)
Database: Neon (Business) ou AWS RDS (com replicas)
Storage: Cloudflare R2 (multi-region) ou AWS S3
Queue: Cloudflare Queues ou AWS SQS
Email: Resend (Enterprise) ou AWS SES
Monitoring: Datadog ou New Relic
Logs: Axiom ou Logflare

Custo Estimado: $500-1500/mês
Capacidade: 200+ eventos/mês, milhares de fotos/evento
Escalabilidade: Alta, pode crescer indefinidamente
```

**Deliverable:**
- `docs/infra/ARQUITETURAS-COMPARADAS.md` — Análise detalhada
- **Decisão:** Qual arquitetura adotar inicialmente?

---

### 5.4 Escolha da Arquitetura Recomendada

**Proposta Inicial (baseada em análise):**

Começar com **Opção A (econômica)** para validação inicial, com plano claro de migração para **Opção B** quando atingir:
- 5 eventos simultâneos
- 500 uploads/dia
- 50 GB de storage

**Arquitetura Inicial:**

```
        Cloudflare CDN
              ↓
    Cloudflare Pages (Frontend)
              ↓
    Cloudflare Workers (Backend)
         ↙        ↘
    Neon (DB)    R2 (Storage)
         ↘        ↙
        Resend (Email)
```

**Pontos de Atenção:**
- SPOF: Neon database (sem replica no free tier)
- SPOF: R2 storage (single region)
- Limite: 100k req/dia no Workers free tier
- Limite: 10 GB storage no R2 free tier

**Deliverable:**
- `docs/infra/ARQUITETURA-ESCOLHIDA.md` — Decisão final + justificativa

---

## 🔒 FASE 6: SEGURANÇA (DevSecOps)

**Objetivo:** Implementar controles de segurança em todas as camadas: aplicação, infraestrutura, CI/CD.

### 6.1 OWASP Security Audit

**Auditoria de Vulnerabilidades:**

```
✅ Tarefas:
1. SQL Injection — ✅ Protegido (parametrized queries, RLS)
2. XSS — Verificar sanitização em comentários/guestbook
3. CSRF — Implementar tokens para ações críticas
4. IDOR — ✅ RLS enforcement testado
5. Broken Access Control — Revisar todos os endpoints
6. Authentication Flaws — Revisar magic links, JWT
7. Insecure File Upload — ✅ EXIF removal, mime validation
8. Path Traversal — Verificar chaves de storage
9. Rate Limit Bypass — Implementar rate limiting
10. Deserialization — Verificar JSON parsing
```

**Ferramentas:**
- SAST: Semgrep, ESLint security plugins
- Dependency Scanning: Snyk, npm audit
- DAST: OWASP ZAP (para endpoints críticos)

**Deliverable:**
- `docs/security/OWASP-AUDIT.md` — Relatório completo
- Issues criadas para cada vulnerabilidade encontrada

---

### 6.2 Secrets Management

**Inventário de Secrets:**

```
Database:
- DATABASE_URL
- DATABASE_POOL_URL (se usar pooling)

Storage:
- R2_ACCESS_KEY_ID
- R2_SECRET_ACCESS_KEY
- R2_BUCKET_NAME
- R2_PUBLIC_URL

Email:
- RESEND_API_KEY

Auth:
- JWT_SECRET (guest tokens)
- MAGIC_LINK_SECRET
- SESSION_SECRET

Google Drive (admin):
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- GOOGLE_REDIRECT_URI

Analytics (se aplicável):
- ANALYTICS_KEY

Monitoring (futuro):
- SENTRY_DSN
- DATADOG_API_KEY
```

**Estratégia:**

```
Development:
- .env.local (gitignored)
- Secrets em plaintext (apenas dev local)

Staging/Produção:
- GitHub Secrets (CI/CD)
- Cloudflare Workers Secrets (runtime)
- Neon connection strings (encrypted)
- Rotação: manual, a cada 90 dias (mínimo)
```

**Validações:**
- ❌ NUNCA commitar secrets no Git
- ❌ NUNCA logar secrets
- ❌ NUNCA expor secrets no frontend
- ✅ Usar environment variables em todos os ambientes
- ✅ Mascarar secrets em logs/errors

**Deliverable:**
- `docs/security/SECRETS-MANAGEMENT.md` — Estratégia completa
- `.env.example` atualizado com TODOS os secrets necessários

---

### 6.3 Security Headers

**Headers a implementar (Next.js middleware):**

```typescript
// apps/web/middleware.ts (criar/atualizar)

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Security Headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // HSTS (apenas em produção)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // CSP (ajustar conforme necessário)
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
  );

  return response;
}
```

**Deliverable:**
- `apps/web/middleware.ts` atualizado com security headers
- Testes E2E validando headers (novo spec)

---

### 6.4 Rate Limiting

**Endpoints Críticos a Proteger:**

```
Upload Pipeline:
- POST /api/uploads/presign — 10 req/min por guest token
- POST /api/uploads/confirm — 10 req/min por guest token

Auth:
- POST /api/auth/magic-link — 3 req/10min por email
- POST /api/auth/consume — 5 req/min global

Admin:
- POST /api/admin/export — 1 req/5min por event
- POST /api/admin/drive/connect — 3 req/hour por event

Feed:
- GET /api/feed — 30 req/min por guest token

Comentários/Reações:
- POST /api/comments — 10 req/min por guest token
- POST /api/reactions — 20 req/min por guest token
```

**Implementação:**
- Cloudflare Workers: Rate Limiting API (Durable Objects)
- Alternativa: Upstash Redis (se necessário)
- Fallback: In-memory rate limiting (não persistente)

**Deliverable:**
- `apps/web/lib/infrastructure/rate-limit/` — Implementação
- Testes unitários para rate limiter
- E2E tests validando rate limits

---

### 6.5 Dependency Scanning

**Ferramentas a configurar:**

```
1. npm audit (já disponível)
   - Rodar no CI/CD
   - Bloquear vulnerabilidades HIGH/CRITICAL

2. Snyk (gratuito para open source)
   - Integração com GitHub
   - Scans automáticos em PRs

3. Dependabot (GitHub)
   - Auto-update de dependências
   - Alertas de segurança
```

**CI/CD Integration:**

```yaml
# .github/workflows/security.yml (criar)
name: Security Scan

on:
  pull_request:
  push:
    branches: [main, stable]
  schedule:
    - cron: '0 0 * * 1' # Segunda-feira, 00:00

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm audit --audit-level=high
      
  snyk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

**Deliverable:**
- `.github/workflows/security.yml` criado
- Dependabot configurado
- Snyk integrado

---

## 🏗️ FASE 7: AMBIENTES & CI/CD COMPLETO

**Objetivo:** Separar ambientes (dev/staging/prod), implementar quality gates robustos, deploy seguro e rollback.

### 7.1 Ambientes Separados

**Estrutura:**

```
Development (Local)
- .env.local
- Database: local PostgreSQL ou Neon dev branch
- Storage: mock ou R2 dev bucket
- Email: mock (console.log)

Staging (Homologação)
- URL: staging.albora.app
- Database: Neon staging branch
- Storage: R2 staging bucket
- Email: Resend (test mode ou destinatários restritos)
- Deploy: automático em push para `stable`

Production
- URL: albora.app
- Database: Neon production
- Storage: R2 production bucket
- Email: Resend (produção)
- Deploy: manual approval após staging
```

**Secrets por Ambiente:**

```
GitHub Secrets:
- DEV_DATABASE_URL
- STAGING_DATABASE_URL
- PROD_DATABASE_URL
- STAGING_R2_ACCESS_KEY
- PROD_R2_ACCESS_KEY
... (todos os secrets duplicados por ambiente)
```

**Deliverable:**
- `docs/infra/AMBIENTES.md` — Especificação de cada ambiente
- GitHub Secrets configurados
- Neon branches criadas (staging, production)

---

### 7.2 Quality Gates Robustos

**Gates Bloqueantes (OBRIGATÓRIOS para deploy):**

```
✅ Build Success
   - pnpm build passa sem erros
   
✅ Type Check
   - pnpm typecheck passa
   
✅ Lint
   - pnpm lint passa
   - Sem erros de lint (warnings permitidos)
   
✅ Unit Tests
   - 344 unit tests passando
   - Cobertura ≥ 90%
   
✅ Contract Tests
   - 169 contract tests passando
   
✅ E2E Tests (Staging)
   - 28 E2E tests passando
   - Fluxo crítico (upload) OBRIGATÓRIO
   
✅ Security Scan
   - npm audit: sem vulnerabilidades HIGH/CRITICAL
   - Snyk: sem vulnerabilidades bloqueantes
   
✅ Guards Arquiteturais
   - guard-tokens: sem hex hardcodados
   - guard-rls: RLS enforcement
   - (outros guards do CLAUDE.md)
   
✅ Lighthouse (Staging)
   - Performance ≥ 85
   - Accessibility ≥ 90
   - LCP < 2.5s
   
✅ Database Migrations
   - Migrations validadas em staging
   - Rollback testado
```

**Gates Informativos (NÃO bloqueantes):**

```
⚠️ Bundle Size
   - Alertar se bundle crescer > 10%
   
⚠️ Lighthouse SEO
   - Score < 80 gera warning
   
⚠️ Code Coverage
   - Alertar se coverage cair
```

**Deliverable:**
- `.github/workflows/ci.yml` atualizado com todos os gates
- Scripts de validação em `scripts/ci/`

---

### 7.3 Deploy Strategy

**Estratégia Escolhida: Blue/Green com Manual Approval**

```
Fluxo Completo:

1. Developer → Push para `stable`
        ↓
2. CI: Lint + Type Check + Unit Tests
        ↓
3. CI: Contract Tests + Security Scan
        ↓
4. CI: Build
        ↓
5. Deploy Staging (automático)
        ↓
6. E2E Tests em Staging
        ↓
7. Lighthouse em Staging
        ↓
8. Smoke Tests em Staging
        ↓
9. ✋ MANUAL APPROVAL (GitHub Environments)
        ↓
10. Deploy Production
        ↓
11. Health Check em Production
        ↓
12. Smoke Test em Production
        ↓
13. ✅ Deploy Completo
        ↓
14. Notificação (Slack/Email)
```

**Rollback Strategy:**

```
Automático:
- Health check falha em produção → rollback automático
- Smoke test falha → rollback automático

Manual:
- gh workflow run rollback.yml --ref v1.2.3
- Reverte para última versão estável conhecida
- Tempo de rollback: < 5 minutos
```

**Deliverable:**
- `.github/workflows/deploy-staging.yml` criado
- `.github/workflows/deploy-production.yml` criado
- `.github/workflows/rollback.yml` criado
- `docs/infra/DEPLOY-PROCESS.md` — Documentação completa

---

### 7.4 Database Migrations Safety

**Processo de Migration:**

```
1. Escrever migration em `packages/db/migrations/`
2. Testar localmente
3. Push para `stable`
4. CI aplica migration em staging
5. Validar staging (queries, performance)
6. Aprovação manual
7. CI aplica migration em produção (dentro de transaction quando possível)
8. Validar produção
9. Commit da migration
```

**Validações:**

```
✅ Tarefas:
1. Migration é idempotente?
2. Migration tem rollback?
3. Migration quebra compatibilidade com código anterior?
4. Migration é destrutiva? (DROP, TRUNCATE)
5. Migration afeta tabelas grandes? (risco de lock)
6. Migration foi testada com dados reais (staging)?
```

**Migrations Seguras vs Perigosas:**

```
SEGURAS (podem rodar sem medo):
- ADD COLUMN (nullable ou com default)
- CREATE INDEX CONCURRENTLY
- ADD CONSTRAINT (validado previamente)
- CREATE TABLE

PERIGOSAS (exigem cuidado):
- DROP COLUMN (pode quebrar código rodando)
- RENAME COLUMN (requer deploy coordenado)
- ALTER COLUMN TYPE (pode travar tabela)
- DROP TABLE (irreversível)
- TRUNCATE (perda de dados)
```

**Deliverable:**
- `docs/db/MIGRATION-SAFETY.md` — Guia completo
- Script de validação: `scripts/db/validate-migration.sh`

---

## 📊 FASE 8: OBSERVABILIDADE

**Objetivo:** Implementar logs, métricas, tracing e alertas para entender o que acontece em produção.

### 8.1 Logs Estruturados

**Estratégia:**

```typescript
// packages/core/logger/index.ts (criar)

import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.token',
      'res.headers["set-cookie"]',
      'email', // mascarar emails em logs
      'phone', // mascarar telefones
      'cpf',
    ],
    censor: '[REDACTED]',
  },
});

// Uso:
logger.info({ eventId, guestId, uploadId }, 'Upload confirmed');
logger.error({ error, eventId }, 'Failed to confirm upload');
```

**Campos Obrigatórios em Logs:**

```
- timestamp (ISO 8601)
- level (info, warn, error)
- message (string)
- eventId (quando aplicável)
- guestId (mascarado)
- hostId (mascarado)
- requestId (trace)
- duration (ms, para requests)
- error (stack trace, quando aplicável)
```

**O que NÃO logar:**
- ❌ Passwords
- ❌ Tokens completos (JWT, magic links)
- ❌ Emails completos (maskear: `j***@example.com`)
- ❌ PII sem mascaramento

**Deliverable:**
- `packages/core/logger/` implementado
- Logs estruturados em todos os use cases
- Testes unitários para logger

---

### 8.2 Métricas

**Métricas a Coletar:**

```
Application Metrics:
- upload.started (counter)
- upload.confirmed (counter)
- upload.failed (counter)
- upload.duration (histogram)
- feed.loaded (counter)
- feed.duration (histogram)
- comment.published (counter)
- reaction.added (counter)
- magic_link.sent (counter)
- magic_link.consumed (counter)

Infrastructure Metrics:
- http.requests.total (counter, por endpoint)
- http.requests.duration (histogram)
- http.requests.errors (counter, por status)
- database.query.duration (histogram)
- database.connections.active (gauge)
- storage.upload.duration (histogram)
- storage.upload.size (histogram)

Business Metrics:
- events.active (gauge)
- guests.active (gauge)
- uploads.daily (counter)
- engagement.rate (gauge) — % de convidados que subiram foto
```

**Ferramentas:**

```
Opção A (Gratuita):
- Cloudflare Analytics (incluído)
- Neon Metrics (incluído)
- Custom metrics via API (console.log + parsing)

Opção B (Paga, recomendada):
- Axiom (logs + metrics, $25/mês)
- Betterstack (uptime + logs, $10/mês)
- Sentry (errors, gratuito até 5k events/mês)
```

**Deliverable:**
- `packages/core/metrics/` implementado
- Integração com Axiom ou similar
- Dashboard básico de métricas

---

### 8.3 Health Checks

**Endpoints a criar:**

```typescript
// apps/web/app/api/health/route.ts
export async function GET() {
  return Response.json({ status: 'ok' }, { status: 200 });
}

// apps/web/app/api/health/ready/route.ts
export async function GET() {
  try {
    // Verificar conexão com banco
    await db.query('SELECT 1');
    
    // Verificar R2 (opcional, pode ser lento)
    // await r2Client.headBucket();
    
    return Response.json({ 
      status: 'ready',
      database: 'ok',
      timestamp: new Date().toISOString(),
    }, { status: 200 });
  } catch (error) {
    return Response.json({ 
      status: 'not ready',
      error: error.message,
    }, { status: 503 });
  }
}

// apps/web/app/api/health/live/route.ts
export async function GET() {
  // Verifica apenas se o processo está rodando
  return Response.json({ status: 'alive' }, { status: 200 });
}
```

**Health Checks para Monitoring:**

```
Uptime Monitoring (Betterstack, UptimeRobot, etc.):
- GET /api/health/ready
- Intervalo: 1 minuto
- Timeout: 10 segundos
- Alertar se: status !== 200 || response time > 5s

Kubernetes-style (futuro, se migrar para containers):
- Liveness: GET /api/health/live
- Readiness: GET /api/health/ready
- Startup: GET /api/health/live
```

**Deliverable:**
- Health check endpoints criados
- E2E test validando health checks
- Monitoramento configurado (Betterstack ou similar)

---

### 8.4 Alertas

**Alertas Críticos (Notificação Imediata):**

```
🚨 CRITICAL:
- Production está fora do ar (health check falha por > 5 min)
- Database indisponível
- Upload pipeline quebrado (100% de falhas por > 10 min)
- Certificado SSL expirando em < 7 dias
- Disco cheio (storage > 90%)

⚠️ WARNING:
- Taxa de erro > 5% em qualquer endpoint
- Latência de resposta > 3s (p95)
- CPU > 80% por > 15 min
- Memória > 85% por > 15 min
- Upload failure rate > 10%
```

**Canais de Notificação:**

```
1. Email (sempre)
2. Slack (recomendado, webhook gratuito)
3. SMS (apenas CRITICAL, Twilio ~$0.01/SMS)
```

**Deliverable:**
- Alertas configurados em Betterstack/Sentry
- Runbook para cada alerta (ver Fase 10)

---

## ⚡ FASE 9: PERFORMANCE & CAPACITY

**Objetivo:** Medir, testar e otimizar performance sob carga real.

### 9.1 Load Testing

**Cenários de Teste:**

```
Teste 1: Carga Normal
- 50 convidados simultâneos
- 10 uploads/minuto
- 100 page views/minuto
- Duração: 30 minutos
- Objetivo: Latência < 500ms (p95), 0% erros

Teste 2: Pico de Evento (Sábado 20h)
- 150 convidados simultâneos
- 150 uploads em 20 minutos (7.5/min)
- 500 page views/minuto
- Duração: 20 minutos
- Objetivo: Latência < 1s (p95), < 1% erros

Teste 3: Stress Test
- Aumentar carga até quebrar
- Descobrir: onde está o gargalo?
- Objetivo: Identificar limites do sistema

Teste 4: Soak Test (Longa Duração)
- Carga moderada (30 convidados)
- Duração: 4 horas
- Objetivo: Detectar memory leaks, degradação
```

**Ferramentas:**

O repositório já tem `tools/carga` (`pnpm carga`). Perfis `fumaca|gate|pico|normal|stress|soak` via `CARGA_PERFIL`. **Não** adicionar k6.

**Deliverable:**
- Perfis no arnês existente + `docs/infra/PERFORMANCE.md`
- Relatório JSON do arnês (`CARGA_SAIDA`)
- Portão MVP: `CARGA_PERFIL=gate` antes do 1º evento

---

### 9.2 Database Performance

**Auditoria de Queries:**

```
✅ Tarefas:
1. Identificar queries N+1
2. Verificar índices em colunas filtradas/ordenadas
3. Analisar EXPLAIN ANALYZE de queries críticas
4. Verificar uso de `SELECT *` (evitar)
5. Avaliar connection pooling (Neon, PgBouncer)
6. Verificar locks em transactions
```

**Queries Críticas a Otimizar:**

```sql
-- Feed (paginação)
SELECT * FROM uploads 
WHERE event_id = $1 
  AND status = 'confirmed'
ORDER BY created_at DESC 
LIMIT 20 OFFSET $2;
-- Índice necessário: (event_id, status, created_at DESC)

-- Comentários de um upload
SELECT * FROM comments 
WHERE upload_id = $1 
ORDER BY created_at ASC;
-- Índice necessário: (upload_id, created_at ASC)

-- Reações (agregação)
SELECT reaction_type, COUNT(*) 
FROM reactions 
WHERE upload_id = $1 
GROUP BY reaction_type;
-- Índice necessário: (upload_id, reaction_type)

-- Missões (progresso)
SELECT mission_id, COUNT(*) 
FROM uploads 
WHERE event_id = $1 
  AND guest_session_id = $2 
  AND status = 'confirmed'
GROUP BY mission_id;
-- Índice necessário: (event_id, guest_session_id, status, mission_id)
```

**Connection Pooling:**

```
Neon Serverless (recomendado):
- @neondatabase/serverless + connection pooling
- Máximo 10 conexões simultâneas (free tier)

PgBouncer (se necessário escalar):
- Pool externo, gerenciado pelo Neon
- Modo: transaction (recomendado para serverless)
```

**Deliverable:**
- Índices criados (migration)
- Queries otimizadas
- Connection pooling configurado

---

### 9.3 Cache Strategy

**O que cachear:**

```
1. Tokens de Identidade Visual (event themes)
   - TTL: 24 horas
   - Invalidação: quando admin atualiza tema
   - Camada: Redis ou Memory (em Workers)

2. Pack Missions (missões pré-definidas)
   - TTL: permanente (não mudam)
   - Camada: Memory (em Workers)

3. Feed (páginas estáticas)
   - TTL: 10 segundos (soft cache)
   - Invalidação: quando novo upload confirmado
   - Camada: CDN (Cloudflare)

4. Imagens (storage)
   - TTL: permanente (immutable)
   - Camada: CDN (R2 + Cloudflare)
```

**O que NÃO cachear:**

```
❌ Dados em tempo real:
   - Reações (precisam ser instantâneas)
   - Comentários (precisam ser em tempo real)
   - Feed (quando social gate está aberto)

❌ Dados sensíveis:
   - Tokens de auth
   - Magic links
   - Sessions
```

**Implementação:**

```typescript
// packages/core/cache/index.ts (criar)

interface CacheAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl: number): Promise<void>;
  del(key: string): Promise<void>;
  flush(): Promise<void>;
}

// Memory cache (simples, para Workers)
class MemoryCache implements CacheAdapter {
  private cache = new Map<string, { value: any; expires: number }>();
  
  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    return item.value as T;
  }
  
  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    this.cache.set(key, { value, expires: Date.now() + ttl * 1000 });
  }
  
  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }
  
  async flush(): Promise<void> {
    this.cache.clear();
  }
}

// Redis (futuro, se necessário)
// class RedisCache implements CacheAdapter { ... }
```

**Deliverable:**
- `packages/core/cache/` implementado
- Cache aplicado em tokens de identidade visual
- Benchmarks: antes/depois do cache

---

### 9.4 CDN & Storage Optimization

**Cloudflare R2 + CDN:**

```
Configuração Ideal:
1. R2 bucket com acesso público (apenas leitura)
2. Cloudflare CDN na frente do R2
3. Cache-Control headers otimizados
4. Image transformations via Workers (se necessário)
```

**Headers de Cache:**

```
Imagens de Upload (immutable):
Cache-Control: public, max-age=31536000, immutable

Imagens de Cover (pode mudar):
Cache-Control: public, max-age=86400, stale-while-revalidate=3600

Assets Estáticos (Next.js):
Cache-Control: public, max-age=31536000, immutable
```

**Image Optimization:**

```
1. EXIF removal (✅ já implementado no cliente)
2. Resize no upload (client-side, antes do R2)
3. Formato moderno (WebP, AVIF) — avaliar conversão server-side
4. Lazy loading (✅ já implementado)
5. Placeholder blur (avaliar)
```

**Deliverable:**
- R2 + CDN configurado com cache otimizado
- Image transformations (se necessário)
- Benchmarks de TTFB para imagens

---

## 🔥 FASE 10: DISASTER RECOVERY & OPERAÇÃO

**Objetivo:** Preparar para o pior cenário e garantir recuperação rápida.

### 10.1 Backup Strategy

**O que fazer backup:**

```
1. Database (PostgreSQL)
   - Frequência: diário (00:00 UTC)
   - Retenção: 30 dias
   - Localização: Neon automático + export manual semanal para S3
   - Criptografia: at-rest (Neon) + in-transit (SSL)

2. Uploads (R2)
   - Frequência: síncrono (R2 já é durável)
   - Retenção: 365 dias (ver CLAUDE.md)
   - Disaster recovery: R2 multi-region (se disponível) ou backup para S3
   - Criptografia: at-rest (R2)

3. Configurações de Evento
   - Frequência: em cada alteração + backup diário
   - Retenção: 90 dias
   - Localização: snapshot do banco
```

**O que NÃO fazer backup (dados derivados):**

```
❌ Logs (mantidos por X dias no provider de logs)
❌ Métricas (mantidas por Y dias no provider de métricas)
❌ Cache (reconstruível)
```

**Backup Schedule:**

```
Diário (00:00 UTC):
- Full database backup (Neon automático)
- Incremental R2 backup (se necessário)

Semanal (domingo 00:00 UTC):
- Full database export para S3
- Validação de restore (teste)

Mensal (dia 1, 00:00 UTC):
- Full R2 backup para S3 (se necessário)
- Auditoria de backups (verificar integridade)
```

**Deliverable:**
- Script de backup: `scripts/backup/database-export.sh`
- Script de restore: `scripts/backup/database-restore.sh`
- Documentação: `docs/infra/BACKUP-RESTORE.md`

---

### 10.2 Restore Testing

**REGRA DE OURO:**
> Backup que nunca foi restaurado é apenas uma hipótese de backup.

**Cronograma de Testes:**

```
Mensal:
- Restaurar backup do banco em ambiente de teste
- Validar integridade (queries funcionam?)
- Validar dados (contagem de registros bate?)
- Documentar tempo de restore

Trimestral:
- Disaster recovery completo (do zero)
- Restaurar banco + R2 em ambiente novo
- Validar aplicação funciona
- Documentar tempo total de recuperação
```

**Deliverable:**
- Restore testado mensalmente
- Documentação de tempo de restore (RTO)
- Runbook de disaster recovery

---

### 10.3 RPO & RTO

**Definições:**

```
RPO (Recovery Point Objective):
- Quanto de dados podemos perder?
- Definição: ≤ 24 horas
- Justificativa: Backup diário, eventos não são críticos para perda de 1 dia

RTO (Recovery Time Objective):
- Quanto tempo podemos ficar fora?
- Definição: ≤ 4 horas
- Justificativa: Eventos acontecem em horários específicos, 4h é aceitável
```

**Cenários de Disaster:**

```
Cenário 1: Database corrompido
- RPO: 24h (último backup)
- RTO: 2h (restore do Neon)
- Procedimento: [ver runbook]

Cenário 2: R2 bucket deletado
- RPO: 0h (R2 é durável, versioning ativado)
- RTO: 1h (reativar versioning)
- Procedimento: [ver runbook]

Cenário 3: Código quebrado em produção
- RPO: 0h (rollback de código, sem perda de dados)
- RTO: 10 minutos (rollback automático)
- Procedimento: [ver runbook]

Cenário 4: Cloudflare Workers fora do ar
- RPO: 0h
- RTO: Dependente da Cloudflare (SLA 99.99%)
- Procedimento: Esperar ou migrar para Vercel (plano B)
```

**Deliverable:**
- `docs/infra/RPO-RTO.md` definido
- Runbooks para cada cenário

---

### 10.4 Runbooks

**Template de Runbook:**

```markdown
# RUNBOOK: [Nome do Problema]

## Sintoma
Como identificar esse problema?
- Alerta: [nome do alerta]
- Métrica: [métrica afetada]
- Sintoma visível: [o que o usuário vê?]

## Severidade
- [ ] SEV1 - CRITICAL (produção completamente fora)
- [ ] SEV2 - HIGH (funcionalidade crítica quebrada)
- [ ] SEV3 - MEDIUM (degradação de performance)
- [ ] SEV4 - LOW (bug menor)

## Diagnóstico
Como confirmar que é esse problema?

1. Verificar [X]
2. Checar logs em [Y]
3. Executar query: `SELECT ...`

## Resolução Imediata
Ação para restaurar o serviço AGORA:

1. [Passo 1]
2. [Passo 2]
3. [Passo 3]

## Resolução Definitiva
Como resolver a causa raiz (pode ser mais lento):

1. [Passo 1]
2. [Passo 2]

## Rollback (se aplicável)
Como voltar atrás se a resolução falhar?

## Prevenção
O que fazer para evitar no futuro?

## Contatos
- Responsável: [nome]
- Escalação: [quem chamar se não resolver]
```

**Runbooks a criar:**

```
✅ Tarefas:
1. RUNBOOK: Aplicação Fora do Ar
2. RUNBOOK: Database Indisponível
3. RUNBOOK: Upload Pipeline Quebrado
4. RUNBOOK: CPU/Memória Alta
5. RUNBOOK: Erro 500 Elevado
6. RUNBOOK: Latência Alta
7. RUNBOOK: Deploy Quebrado
8. RUNBOOK: Certificado SSL Expirando
9. RUNBOOK: Storage Cheio
10. RUNBOOK: Backup Falhou
```

**Deliverable:**
- `docs/runbooks/` com 10+ runbooks
- Runbooks testados em simulações

---

### 10.5 Incident Response

**Processo de Incidente:**

```
1. DETECÇÃO
   - Alerta automático OU relato de usuário
   
2. TRIAGEM (< 5 min)
   - Severidade: SEV1, SEV2, SEV3, SEV4
   - Impacto: quantos usuários afetados?
   - Responsável: quem vai investigar?
   
3. INVESTIGAÇÃO (SEV1: < 15 min)
   - Consultar runbook relevante
   - Coletar logs, métricas, evidências
   - Diagnosticar causa raiz (ou hipótese)
   
4. MITIGAÇÃO (SEV1: < 30 min)
   - Resolver imediatamente (workaround se necessário)
   - Comunicar status (usuários, time)
   - Documentar ações tomadas
   
5. RESOLUÇÃO (SEV1: < 2 horas)
   - Resolver causa raiz
   - Validar funcionamento
   - Comunicar resolução
   
6. POST-MORTEM (24-48h após resolução)
   - O que aconteceu?
   - Por que aconteceu?
   - Como detectamos?
   - Como resolvemos?
   - Como prevenir?
   - Ações de follow-up
```

**Comunicação durante Incidente:**

```
SEV1 (CRITICAL):
- Comunicar: imediatamente
- Canais: Email + Slack + Status Page (se houver)
- Frequência: update a cada 30 min

SEV2 (HIGH):
- Comunicar: em até 30 min
- Canais: Slack + Email
- Frequência: update a cada 1-2h

SEV3/SEV4:
- Comunicar: após resolução (post-mortem)
```

**Deliverable:**
- `docs/infra/INCIDENT-RESPONSE.md` — Processo completo
- Template de post-mortem
- Canal de comunicação (Slack)

---

## 💰 FASE 11: OTIMIZAÇÃO & CUSTO

**Objetivo:** Monitorar e reduzir custos sem comprometer qualidade.

### 11.1 Cost Monitoring

**Recursos a monitorar:**

```
1. Cloudflare Workers
   - Requests/dia (100k grátis, depois $0.50/1M)
   - CPU time (10ms grátis, depois $0.02/1M CPU-ms)
   
2. Neon Database
   - Storage (0.5 GB grátis, depois $0.000164/GB-hora)
   - Compute (10 compute-hours grátis, depois variável)
   - Data transfer (10 GB grátis, depois $0.09/GB)
   
3. Cloudflare R2
   - Storage (10 GB grátis, depois $0.015/GB/mês)
   - Class A ops (1M grátis, depois $4.50/1M)
   - Class B ops (10M grátis, depois $0.36/1M)
   
4. Resend
   - Emails (3k grátis, depois $20/mês para 50k)
   
5. Monitoring (Axiom, Betterstack, etc.)
   - Variável por plano
```

**Dashboard de Custo (criar):**

```
Mensal:
- Custo atual
- Custo projetado (se crescer 2x)
- Principais contribuidores de custo
- Recursos ociosos (se houver)
```

**Deliverable:**
- Planilha de custo: `docs/infra/COST-TRACKING.xlsx`
- Alertas de custo (se ultrapassar X%)

---

### 11.2 Cost Optimization

**Quick Wins:**

```
✅ Tarefas:
1. Revisar storage: deletar uploads orphans (failed, expired)
2. Revisar logs: reduzir retenção (30 dias → 14 dias)
3. Revisar backups: reduzir frequência se aceitável
4. Revisar R2: ativar lifecycle policies (delete old files)
5. Revisar Neon: otimizar queries (menos compute time)
6. Revisar CDN: aumentar TTL onde possível
```

**Long-term Optimization:**

```
1. Image Compression
   - Avaliar WebP/AVIF (menor tamanho → menos storage)
   
2. Database Archival
   - Mover eventos antigos (>1 ano) para cold storage
   
3. Serverless Optimization
   - Reduzir cold starts (bundling, tree-shaking)
   
4. CDN Optimization
   - Servir mais do CDN, menos do Workers
```

**Deliverable:**
- Otimizações implementadas
- Relatório de economia (antes/depois)

---

## 📚 FASE 12: DOCUMENTAÇÃO OPERACIONAL

**Objetivo:** Documentar tudo para que outra pessoa possa operar o sistema.

### 12.1 Documentação Obrigatória

**Arquivos a criar/atualizar:**

```
✅ Tarefas:
1. docs/infra/ARCHITECTURE.md — Arquitetura completa
2. docs/infra/SETUP-LOCAL.md — Como rodar localmente
3. docs/infra/SETUP-STAGING.md — Como configurar staging
4. docs/infra/SETUP-PRODUCTION.md — Como configurar produção
5. docs/infra/DEPLOY.md — Como fazer deploy
6. docs/infra/ROLLBACK.md — Como fazer rollback
7. docs/infra/MONITORING.md — Onde ver métricas/logs
8. docs/infra/BACKUP-RESTORE.md — Como fazer backup/restore
9. docs/infra/SECURITY.md — Principais controles de segurança
10. docs/infra/COST.md — Como custo funciona
11. docs/infra/INCIDENT-RESPONSE.md — O que fazer em incidentes
12. docs/runbooks/ — Runbooks para problemas comuns
```

**Deliverable:**
- Documentação completa em `docs/infra/`

---

### 12.2 Onboarding de Novos Desenvolvedores

**Checklist de Onboarding:**

```
Dia 1: Setup Local
- [ ] Clonar repositório
- [ ] Instalar dependências (pnpm install)
- [ ] Configurar .env.local
- [ ] Rodar database local (ou Neon dev branch)
- [ ] Rodar aplicação (pnpm dev)
- [ ] Validar: acessar localhost:3000

Dia 2: Entender Arquitetura
- [ ] Ler docs/architecture.md
- [ ] Ler CLAUDE.md (regras não negociáveis)
- [ ] Ler docs/infra/ARCHITECTURE.md (infraestrutura)
- [ ] Explorar código (features/, lib/)

Dia 3: Primeiro Deploy
- [ ] Criar branch de feature
- [ ] Fazer pequena mudança
- [ ] Rodar testes localmente
- [ ] Push e abrir PR
- [ ] Ver CI/CD rodar
- [ ] Mergear e ver deploy em staging

Dia 4: Operação
- [ ] Acessar dashboards (Axiom, Betterstack, etc.)
- [ ] Ver logs em tempo real
- [ ] Ver métricas
- [ ] Entender alertas

Dia 5: Incident Response
- [ ] Ler runbooks
- [ ] Simular incidente (staging)
- [ ] Resolver usando runbook
- [ ] Aprender rollback
```

**Deliverable:**
- `docs/ONBOARDING.md` criado

---

## 🎯 RESUMO EXECUTIVO

### Prioridades (Ordem de Execução)

```
CRÍTICO (Antes de qualquer evento real):
✅ Fase 5: Auditoria & Arquitetura (1-2 dias)
✅ Fase 6: Segurança (2-3 dias)
✅ Fase 7: Ambientes & CI/CD (2 dias)
✅ Fase 8: Observabilidade (1-2 dias)

IMPORTANTE (Antes de escalar):
✅ Fase 9: Performance & Capacity (2-3 dias)
✅ Fase 10: Disaster Recovery (1-2 dias)

RECOMENDADO (Melhoria contínua):
✅ Fase 11: Otimização & Custo (ongoing)
✅ Fase 12: Documentação (ongoing)
```

### Tempo Total Estimado

```
Setup inicial (Fases 5-8): 7-9 dias
Performance & DR (Fases 9-10): 3-5 dias
Otimização (Fases 11-12): ongoing

Total para production-ready: ~2-3 semanas
```

### Custo Estimado (MVP)

```
Infraestrutura: $0-50/mês (free tiers)
Monitoring: $0-50/mês (free tiers + Betterstack)
Outros: $0-20/mês (domínio, certificados)

Total MVP: $0-120/mês

(Pode crescer para $500-1500/mês ao escalar)
```

### Métricas de Sucesso

```
✅ Segurança:
- Sem vulnerabilidades HIGH/CRITICAL
- Secrets 100% protegidos
- Rate limiting em endpoints críticos

✅ Confiabilidade:
- Uptime ≥ 99.5% (< 3.6h downtime/mês)
- RTO ≤ 4 horas
- RPO ≤ 24 horas

✅ Performance:
- Latência p95 < 1s
- Upload success rate > 99%
- Lighthouse Performance ≥ 85

✅ Operação:
- Deploy sem downtime
- Rollback em < 10 min
- Todos os alertas têm runbook
```

---

## 🚀 PRÓXIMA AÇÃO IMEDIATA

Fases 5–12 estão no repositório. O que ainda é **fora do git**:

1. Comprar/apontar `albora.social.br` (DNS Cloudflare)
2. GitHub Environments `staging` / `production` + secrets `STAGING_` / `PROD_` + `CLOUDFLARE_API_TOKEN`
3. `STAGING_URL` / `PROD_URL` para smoke
4. Rodar `CARGA_PERFIL=gate` contra staging com R2 real e anexar o JSON
5. Primeiro restore mensal (preencher tabela em `RPO-RTO.md`)

---

## 📞 PRECISA DE DECISÃO DO USUÁRIO

As seguintes decisões precisam ser tomadas antes de prosseguir:

```
1. Qual arquitetura escolher? (Opção A, B ou C)
2. Qual orçamento mensal de infraestrutura? ($0-50, $50-150, $500+)
3. Qual é o SLA aceitável? (99%, 99.5%, 99.9%)
4. Qual é o RPO/RTO aceitável?
5. Quais secrets já existem? (DATABASE_URL, R2_ACCESS_KEY, etc.)
6. Já existe domínio? (albora.app)
7. Já existe conta Cloudflare? Neon? Resend?
```

---

**FIM DO MASTER PLAN**

**Status:** PRONTO PARA EXECUÇÃO
**Próxima Fase:** FASE 5 — AUDITORIA & ARQUITETURA
**Responsável:** DevOps/SRE/Security Agent
**Prazo Sugerido:** Iniciar imediatamente

---

*Documento criado em: 28/08/2026*
*Baseado em: MASTER PROMPT — Infrastructure, DevOps, SRE, Security, QA, Performance*
*Alinhado com: Fases 1-4 (Testes) já concluídas*
