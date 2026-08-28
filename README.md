# Albora

**O álbum coletivo da sua festa.**

[![CI](https://github.com/clevessonmendonca/albora-project/actions/workflows/ci.yml/badge.svg)](https://github.com/clevessonmendonca/albora-project/actions/workflows/ci.yml)
[![E2E Tests](https://github.com/clevessonmendonca/albora-project/actions/workflows/e2e.yml/badge.svg)](https://github.com/clevessonmendonca/albora-project/actions/workflows/e2e.yml)
[![Lighthouse CI](https://github.com/clevessonmendonca/albora-project/actions/workflows/lighthouse-ci.yml/badge.svg)](https://github.com/clevessonmendonca/albora-project/actions/workflows/lighthouse-ci.yml)

> O fotógrafo profissional cobre o oficial. Ninguém cobre o espontâneo — e existem 100 a 200 câmeras na festa cujo material se perde em 200 rolos diferentes.

---

## Sobre o Projeto

O Albora coleta, organiza e devolve as fotos tiradas pelos convidados durante uma festa, usando **missões** fotográficas para aumentar a participação e a **identidade visual do evento** para dar coerência estética ao resultado.

**A hipótese que decide tudo:** ≥ 40% dos convidados presentes enviam ao menos uma foto. Se falhar, nada mais importa.

O núcleo é genérico (`event`, `host`, `guest`, `challenge`, `upload`). Casamento e 15 anos são **packs**, não o núcleo — a mesma plataforma serve qualquer vertical de festa sem tocar uma linha do core.

### Problema que resolve

Numa festa com 150 convidados existem 100–200 câmeras, cada uma capturando ângulos únicos que o fotógrafo oficial não viu. Esse material se perde em 200 WhatsApps diferentes. O Albora resolve o problema de **coleta, curadoria e coerência visual** sem exigir que o convidado baixe um app, crie conta ou espere SMS.

### Superfícies

| Superfície | Rota | Quem |
|---|---|---|
| Landing e planos | `/` | Público |
| Entrada do convidado | `/e/[slug]` | QR / WhatsApp / link |
| Hub, feed, câmera, missões, álbum | `/e/[slug]/cover`, `/feed`, `/photo`, `/missions`, `/album` | Convidado com sessão |
| Admin | `/admin`, `/admin/e/[eventId]/…` | Anfitrião com conta |
| Telão | `/wall-display` (fullscreen) | Salão |

### O que o Albora não é

- **Não é rede social entre eventos.** Feed, reações e comentários vivem dentro de um evento e morrem com ele.
- **Não é editor de canvas.** Diagramação é por slots, nunca posicionamento livre.
- **Não é site de casamento.** RSVP, lista de presentes e convite estão fora do escopo atual.
- **Não é armazenamento ilimitado.** Retenção cumprida por job: export no dia 330, delete no dia 365.

---

## Stack Tecnológica

| Camada | Escolha | Versão |
|---|---|---|
| Framework web | Next.js (App Router) | 15.5.x |
| UI | React + TailwindCSS | 19.x / 4.x |
| Linguagem | TypeScript | 5.8.x |
| Hospedagem | Cloudflare Workers (OpenNext) | — |
| Banco de dados | Neon (PostgreSQL 16) | 16 |
| Object storage | Cloudflare R2 | — |
| App nativo | Expo (React Native) | — |
| Package manager | pnpm workspaces | 10.32.x |
| Runtime local | Node.js | ≥ 20.9.0 |

**Testes:**

| Ferramenta | Uso |
|---|---|
| Vitest | Unit + contract tests |
| Playwright | E2E tests |
| Lighthouse CI | Performance audits |

**CI/CD:** GitHub Actions

---

## Arquitetura

O Albora segue **Clean Architecture** com separação explícita de responsabilidades:

```
packages/core/src/
├── domain/          # Entidades, tipos, regras de negócio puras
├── application/     # Use cases (57 use cases, zero dependência de infra)
└── infrastructure/  # Adaptadores de banco, storage, e serviços externos

apps/web/
├── app/             # Rotas Next.js (App Router) — somente orquestração
├── features/        # Módulos por superfície (admin, guest, feed, wall…)
│   ├── [feature]/
│   │   ├── application/    # Use cases específicos da feature
│   │   ├── components/     # Componentes React (client + server)
│   │   └── *.test.ts(x)    # Testes colocalizados
└── lib/             # Utilitários compartilhados, adapters de infra
```

### Princípios que não negociamos

1. **O evento é a fronteira de isolamento** — imposta no banco por Row Level Security forçado, não na aplicação. Toda tabela com dado de evento tem `event_id` UUID NOT NULL.
2. **O convidado não tem login, e nunca terá.** A primeira foto nunca passa por app store nem por tela de autenticação.
3. **O servidor nunca toca nos bytes de mídia.** Upload é PUT presigned direto no R2.
4. **O caminho de upload depende de exatamente dois sistemas:** object storage + Postgres. Todo o resto degrada, nunca falha.
5. **Nenhum hex hardcodado em componente.** Toda cor, fonte, raio e espaçamento sai de token. Um hex fixo é um lugar onde a identidade do casal não propaga.

### Packs (verticais)

Dependência unidirecional: `pack → core`, nunca o contrário (guard bloqueante no CI). Trocar o pack de um evento muda toda a UI sem tocar uma linha do núcleo.

---

## 🧪 Suite de Testes

541 testes, 100% do caminho crítico coberto.

```
┌─────────────────────────────────────────────────────────────┐
│                   PIRÂMIDE DE TESTES                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Unit Tests        344 testes   Vitest (node + jsdom)       │
│  Contract Tests    169 testes   Zod schemas + Vitest        │
│  E2E Tests          28 testes   Playwright (Chromium)       │
│  Performance          ∞         Lighthouse CI               │
│                                                             │
│  TOTAL             541 testes   ~5s (unit + contract)       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Unit Tests — 344 testes

Cobrindo 57 use cases em 3 domínios:

| Domínio | Use Cases | Testes |
|---|---|---|
| Admin | 35 | 230 |
| Guest | 16 | 104 |
| Wall | 6 | 20 |

**Caminho crítico blindado:**
- Upload de fotos: 18 testes
- LGPD / Retenção: 16 testes
- Autenticação / sessão: 16 testes

Dois environments distintos: `node` para lógica pura (rápido, sem DOM) e `jsdom` para render de componentes `.test.tsx`. Executados em paralelo com `maxWorkers: 50%`.

### Contract Tests — 169 testes

Validação dos contratos entre schemas Zod e use cases. Garante que o que a API aceita é exatamente o que o use case processa.

| Domínio | Schemas | Testes |
|---|---|---|
| Guest | 6 | 94 |
| Admin | 9 | 65 |
| Wall | 1 | 10 |

### E2E Tests — 28 testes (Playwright)

8 specs cobrindo os fluxos críticos do convidado:

| Spec | Testes |
|---|---|
| `landing-page.spec.ts` | 3 |
| `guest-upload-flow.spec.ts` | 3 |
| `guest-upload-flow-offline.spec.ts` | 3 |
| `guest-upload-flow-slow.spec.ts` | 4 |
| `guest-multi-mission.spec.ts` | 4 |
| `guest-upload-isolation.spec.ts` | 3 |
| `guest-exif-removal.spec.ts` | — |
| `guest-story-degradation.spec.ts` | — |

Modo smoke (padrão): landing, admin sign-in, telão. Modo full (`E2E_FULL=1`): fluxo completo do convidado com banco semeado.

### Performance — Lighthouse CI

Auditoria de Core Web Vitals nas rotas do convidado. Budget de First Load JS monitorado por `tools/bundle/orcamento-convidado.mjs`. Roda em PR e em push para `main`.

### Testes de Isolamento entre Eventos

Suíte dedicada (`pnpm test:isolamento`) contra Postgres real — nunca mock. Testa que nenhum evento acessa dados de outro. Reprova automaticamente se uma nova tabela sem RLS for adicionada.

---

## Getting Started

**Pré-requisitos:** Node ≥ 20.9.0, pnpm, Docker

```bash
# Instalar dependências
pnpm install

# Subir Postgres local (porta 55432)
pnpm db:up

# Semear banco com evento demo
pnpm db:semear

# Dev server (Next.js)
pnpm dev
```

```bash
# Build de produção
pnpm build

# Testes unit + contract
pnpm test

# Cobertura de testes
pnpm test:coverage

# Testes E2E (Playwright)
pnpm test:e2e

# Testes E2E modo completo (requer banco semeado)
pnpm test:e2e:full

# Testes de isolamento entre eventos (requer Postgres real)
pnpm test:isolamento

# Auditoria de performance (Lighthouse)
pnpm --filter @albora/web lighthouse

# Guards de arquitetura
pnpm guards

# Orçamento de bundle (convidado)
pnpm bundle:budget

# Teste de carga (150 uploads / 20 min)
pnpm carga
```

**Deploy para Cloudflare Workers:**

```bash
# Preview local via Wrangler
pnpm --filter @albora/web cf:preview

# Deploy
pnpm --filter @albora/web cf:deploy
```

---

## Estrutura do Monorepo

```
albora/
├── apps/
│   ├── web/               # Next.js 15 — convidado, admin, telão, landing
│   │   ├── app/           # Rotas (App Router)
│   │   ├── features/      # Módulos por superfície
│   │   ├── lib/           # Infra compartilhada
│   │   └── e2e/specs/     # Testes Playwright
│   └── mobile/            # Expo (React Native) — app instalável do convidado
│
├── packages/
│   ├── core/              # Domain + use cases (zero deps de framework)
│   ├── db/                # Schema Postgres + migrations
│   ├── tokens/            # Design tokens (resolvidos em runtime)
│   ├── packs/             # Verticais (wedding, quinceanera…)
│   ├── ui-web/            # Componentes React compartilhados
│   └── ui-native/         # Componentes React Native compartilhados
│
├── e2e/                   # Smoke tests (raiz)
├── tools/
│   ├── guards/            # Guards de arquitetura (isolamento, tokens, packs…)
│   ├── bundle/            # Orçamento de bundle por rota
│   ├── carga/             # Arnês de teste de carga (150 uploads / 20 min)
│   └── db/                # Scripts de seed e migração
│
├── docs/                  # Documentação
└── .github/workflows/     # GitHub Actions
```

---

## CI/CD

### Workflows

| Workflow | Gatilho | O que faz |
|---|---|---|
| **CI** (`ci.yml`) | Push para `main`/`homol`/`stable`, PR | Guards, isolamento, typecheck, lint, testes, build |
| **E2E Tests** (`e2e.yml`) | PR para branches principais, push `main` | Testes Playwright completos com Postgres |
| **Lighthouse CI** (`lighthouse-ci.yml`) | PR para branches principais, push `main` | Auditoria de performance, Core Web Vitals, comentário no PR |
| **Teste de carga** (`carga.yml`) | Manual ou agendado (domingo 06h UTC) | 150 uploads em 20 min (portão MVP) |

### Jobs do CI principal

O CI tem jobs separados por propósito — um job `guards` separado do job de testes não é estética, é que uma falha de isolamento perdida em "testes falharam" deixa de parecer o que é.

```
guards           → isolamento, tokens, domínio, packs, sessão, features, api-routes
isolamento       → testes contra Postgres real (nunca mock)
verificar        → typecheck + lint + testes + cobertura + budget de bundle
e2e-smoke        → fluxo completo do convidado (Playwright + banco semeado)
build            → build de produção Next.js
```

### Ladder de deploy

```
stable (teste) → homol (homologação) → main (prod)
```

MR de feature vai para `stable` por padrão. Promoção entre branches só a pedido explícito do mantenedor. Produção sai de tag em `main`, nunca de branch de feature.

---

## Documentação

| Documento | Conteúdo |
|---|---|
| [`docs/README.md`](./docs/README.md) | Índice, mapa de rotas, tabela de precedência entre documentos |
| [`docs/architecture.md`](./docs/architecture.md) | Fronteiras, isolamento, caminho crítico de upload, propagação de identidade |
| [`docs/flows.md`](./docs/flows.md) | Fluxos detalhados com cada nuance e o porquê dela |
| [`docs/security.md`](./docs/security.md) | Modelo de ameaça, controles por camada, LGPD |
| [`docs/adr/`](./docs/adr/README.md) | Architectural Decision Records (14 ADRs) |
| [`docs/refactoring/`](./docs/refactoring/) | Histórico das fases de refatoração e testes |
| [`DESIGN.md`](./DESIGN.md) | Sistema de design, legível por agentes |
| [`CLAUDE.md`](./CLAUDE.md) | Regras não negociáveis para quem escreve código aqui |

### ADRs relevantes

| ADR | Decisão |
|---|---|
| [0002](./docs/adr/0002-event-as-tenancy-boundary.md) | Evento como fronteira de isolamento (RLS) |
| [0004](./docs/adr/0004-anonymous-guest-session.md) | Sessão anônima do convidado |
| [0005](./docs/adr/0005-runtime-stack.md) | Stack runtime (Next.js + TypeScript) |
| [0006](./docs/adr/0006-hosting-platform.md) | Plataforma de hospedagem (Cloudflare) |
| [0007](./docs/adr/0007-ai-policy-luts-not-generation.md) | IA generativa fora da mídia do convidado |
| [0008](./docs/adr/0008-app-nativo-como-segunda-porta.md) | App nativo como segunda porta (nunca a primeira) |
| [0009](./docs/adr/0009-app-social-do-convidado.md) | Social dentro do evento, gate configurável |

---

## Contribuindo

### Rodando localmente

```bash
git clone https://github.com/clevessonmendonca/albora-project
cd albora-project
pnpm install
pnpm db:up
pnpm db:semear
pnpm dev
```

### Rodando os testes

```bash
pnpm test              # Unit + contract (rápido, ~5s)
pnpm test:coverage     # Com relatório de cobertura
pnpm test:isolamento   # Isolamento entre eventos (requer Postgres)
pnpm test:e2e          # E2E smoke
pnpm test:e2e:full     # E2E completo
pnpm guards            # Guards de arquitetura
```

### Padrões de commit

[Conventional Commits](https://www.conventionalcommits.org/) com escopo obrigatório:

```
feat(upload): adicionar retry automático na fila offline
fix(telao): corrigir enquadramento de foto vertical em layout 4-up
docs(adr): registrar decisão sobre retenção de dados
refactor(core): extrair use case de sessão para módulo próprio
test(guest): cobrir fluxo de missão com exif removal
```

### Gates de qualidade

| Fase | Cobertura | E2E | Performance |
|---|---|---|---|
| MVP | ≥60% global, **≥90% upload pipeline** | Smoke do fluxo do convidado | 150 uploads em 20 min |
| Pós-H1 | ≥80% | Fluxo QR→consentimento→upload→confirmação | Budget de bundle na rota do convidado |
| Escala | ≥90% | + telão, moderação, export | LCP/INP com budget bloqueante |

Rebaixar um gate para deixar o CI verde é violação não negociável.

---

Sea Tecnologia · documentação em português por decisão de equipe. Identificadores de código em inglês ficam em `backticks`.
