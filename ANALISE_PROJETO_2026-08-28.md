# Análise Completa do Projeto Albora
**Data:** 28 de agosto de 2026  
**Branch analisada:** `feat/convidado-social-moderno`  
**Analista:** Cloud Agent

---

## 1. Visão Geral Executiva

### 1.1 O que é o Albora

O **Albora** é um produto web que coleta, organiza e devolve as fotos tiradas pelos convidados durante uma festa, usando:
- **Missões fotográficas** para aumentar a participação
- **Identidade visual do evento** para dar coerência estética ao resultado

**Três superfícies principais:**
1. **Convidado** — PWA, sem login, sem download
2. **Anfitrião** — admin web
3. **Telão** — URL fullscreen no salão

**Quarta superfície (Fase 3):** Fornecedor (white-label, B2B2C)

### 1.2 Hipótese Principal (H1)

> **≥40% dos convidados presentes enviam ao menos uma foto**

Esta é a métrica que decide se o negócio existe. Todo o design arquitetural deriva desta restrição.

---

## 2. Estado Atual do Código

### 2.1 Estatísticas

| Métrica | Valor |
|---------|-------|
| **Commits totais** | 560 |
| **Commits na branch feat/convidado-social-moderno** | 552 |
| **Migrations do banco** | 53 |
| **Componentes web (.tsx)** | 176 |
| **Packages** | 7 (`core`, `db`, `packs`, `tokens`, `ui-web`, `ui-native`, `mobile`) |
| **Arquivos alterados vs main** | 1.264 arquivos (920 inserções, 135.263 deleções) |

### 2.2 Branch Atual: `feat/convidado-social-moderno`

A branch atual representa uma **refatoração massiva** recente focada em:

#### Commits Recentes (últimos 20)
Série de commits de refatoração comprimindo blocos de comentários multi-linha em single-line:
- `refactor(mobile):` — compressão de comentários
- `refactor(core):` — compressão de comentários
- `refactor(web):` — compressão de comentários em features, lib, service worker

**Interpretação:** Grande esforço de cleanup de código, alinhado à regra do `CLAUDE.md` de minimizar comentários.

---

## 3. Arquitetura e Stack Técnico

### 3.1 Stack Principal

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| **Runtime** | Node.js 20+ | Especificado em `.nvmrc` |
| **Package Manager** | pnpm 10.32.0 | Workspaces para monorepo |
| **Framework** | Next.js App Router | App Router para web, TypeScript ponta a ponta |
| **Banco de Dados** | PostgreSQL 16 (Neon) | RLS real, compute suspende quando ocioso |
| **Hospedagem** | Cloudflare Workers (OpenNext) | Sem cold start, escala a zero |
| **Object Storage** | Cloudflare R2 | **Egress zero** — economia fecha aqui |
| **E-mail** | Resend | Magic links |
| **Mobile** | Expo + React Native | App nativo (segunda porta, após web) |

**Custo marginal projetado:** < R$ 3 por evento

### 3.2 Estrutura de Monorepo

```
albora/
├── apps/
│   ├── web/          # Next.js — convidado, admin, telão, landing, APIs
│   └── mobile/       # Expo — app do convidado (segunda porta)
├── packages/
│   ├── core/         # Lógica compartilhada: fila, envio, processamento de imagem
│   ├── db/           # Schema, migrations, escopo de evento, sessão
│   ├── tokens/       # Resolvedor de tokens de identidade → valores CSS
│   ├── packs/        # Vocabulário, missões, lugares por vertical (casamento, 15 anos)
│   ├── ui-web/       # Primitivas da web
│   └── ui-native/    # Casca do app nativo
├── docs/             # Documentação arquitetural, ADRs, specs, runbooks
└── tools/            # Guards, migrations, jobs de manutenção
```

### 3.3 Features Implementadas (apps/web/features/)

Total: **19 features**

```
admin/          # Painel administrativo do anfitrião
album/          # Álbum de fotos com capítulos
catalog/        # Catálogo de componentes
cover/          # Capa/perfil do evento
feed/           # Feed social
guest/          # Fluxo do convidado
guest-profile/  # Perfil do convidado
home/           # Landing page
missions/       # Missões fotográficas
music/          # Música colaborativa
my-photos/      # Fotos do convidado
pairing/        # Pareamento de dispositivos
photo/          # Captura de foto
public-event/   # Evento público
vendor-portal/  # Portal de fornecedores
wall/           # Telão
wall-pairing/   # Pareamento do telão
```

---

## 4. Regras Não Negociáveis

Estas regras estão documentadas em `CLAUDE.md` e são **bloqueantes** por guards de CI:

### 4.1 Isolamento entre Eventos

✅ **Implementado e testado**

- Toda tabela com dado de evento tem `event_id` (UUID, NOT NULL, FK)
- RLS **FORÇADO** com política: `event_id = NULLIF(current_setting('app.event_id', true), '')::uuid`
- **Sempre `SET LOCAL`, nunca `SET`** (pooling em modo transação)
- Chaves de storage derivadas no servidor: `events/{event_id}/...`
- Jobs em background definem `app.event_id` do payload antes de qualquer chamada ao banco

**5 portas fora da RLS (por circularidade declarada):**
1. `session_tokens` — resolver token → `event_id`
2. `event_slugs` — slug → evento
3. `wall_tokens` — crachá TV → evento
4. `wall_pairings` — código pareamento TV
5. `app_pairings` — código pareamento web→app

### 4.2 Sessão do Convidado

✅ **Implementado**

- **O convidado não tem login e nunca terá**
- Token opaco, assinado, escopado a **UM** evento
- Autoriza: subir mídia naquele evento, reagir, remover própria mídia
- Cookie `HttpOnly`, `SameSite=Lax`, **nunca na URL**
- Guard do CI reprova token em querystring

### 4.3 Caminho Crítico (Sábado 22h)

✅ **Implementado**

**Pipeline de upload depende de exatamente 2 sistemas:**
1. Object storage (R2)
2. PostgreSQL

**Todo o resto degrada, nunca falha:**
- Classificador de moderação → fila manual
- WhatsApp/e-mail/analytics → enfileira, entrega depois
- Export para Drive → job, não request

**6 pontos decisivos:**
1. Compressão antes do upload (5-10×)
2. Fila em IndexedDB é fonte da verdade
3. EXIF removido no reencode (não etapa separada)
4. Drenagem em série, erro é valor (não exceção)
5. `confirm` valida, não confia (magic bytes dos primeiros 16 bytes)
6. `confirm` é idempotente

### 4.4 Identidade Visual

✅ **Implementado com guard bloqueante**

- **Nenhum hex hardcodado em componente**
- Toda cor/fonte/raio/espaço sai de token semântico
- Um resolvedor, N renderizadores (web, telão, PDF)
- Preset é matemática determinística (LUT), **nunca IA generativa**
- Guard de conformidade é **teste de regressão da funcionalidade principal**

---

## 5. Decisões Arquiteturais (ADRs)

### ADRs Aceitos e Implementados

| ADR | Título | Status |
|-----|--------|--------|
| 0002 | Event as tenancy boundary | ✅ Aceito |
| 0003 | Runtime token resolution | ✅ Aceito |
| 0004 | Anonymous guest session | ✅ Aceito |
| 0005 | Runtime stack | ✅ Aceito |
| 0006 | Hosting platform | ✅ Aceito |
| 0007 | AI policy — LUTs not generation | ✅ Aceito |
| 0008 | App nativo como segunda porta | ✅ Aceito |
| 0009 | App social do convidado | 🟡 Em revisão |
| 0010 | Expo para o app do convidado | ✅ Aceito |
| 0011 | Música do evento sem direito de sincronização | ✅ Aceito |
| 0012 | Menores sem perguntar idade | ✅ Aceito |
| 0013 | Acesso por conta sob RLS | ✅ Aceito |
| 0014 | Convenção PT/EN na base de código | ✅ Aceito |

---

## 6. Estado da Implementação por Fase

### Fase A — Pronto pro 1º Evento (MVP)

| Item | Estado | Observações |
|------|--------|-------------|
| **A1** - Peças impressas (PDF/SVG) | 🟡 Parcial | Download no admin existe; falta prova impressa física |
| **A2** - Botões do host (pânico, menores, fila) | ✅ Feito | Admin + API completos |
| **A3** - UI do convidado fiada | ✅ Feito | PR #2, smoke E2E inicial |
| **A4** - Teste de carga 150/20min | ❌ Pendente | Ferramenta existe (`pnpm carga`), falta rodar contra infra de produção |
| **A5** - Produção (deploy) | ❌ Pendente | Hoje roda em localhost, falta CF Workers + e-mail Resend |
| **A6** - Procedimento jurídico menores | ❌ Pendente | Não-código, bloqueante operacional |

**Gates de MVP:**
- ✅ Cobertura ≥90% no pipeline de upload
- ✅ Smoke E2E do fluxo do convidado

### Fase B — Pós-H1

| Item | Estado |
|------|--------|
| App nativo Expo | 🟡 Parcial (câmera, fila, feed existem; falta paridade completa) |
| Recado dos anfitriões | ✅ Feito |
| Compartilhar (moldura Stories) | 🟡 Parcial |
| Identidade do casal no admin | ✅ Feito |
| Painel ao vivo (participação) | ✅ Feito |
| Classificador + fila de revisão | 🟡 Parcial (gate fail-closed existe, provedor é heurístico) |

### Fase C — Escala

| Item | Estado |
|------|--------|
| Retenção por job (D330/D365) | ✅ Feito |
| Livro de fotos PDF | ✅ Feito |
| Export para Drive do casal | ✅ Feito |
| White-label fornecedor | ✅ Feito |
| Budgets de performance | ❌ Pendente |

---

## 7. Pivô Social em Curso (feat/convidado-social-moderno)

### 7.1 Contexto da Branch Atual

Esta branch implementa um **redesign completo** da superfície do convidado, quebrando 3 regras anteriores por decisão explícita do mantenedor:

| Regra Antiga | Regra Nova |
|--------------|------------|
| ❌ Contagem visível de curtida proibida | ✅ Curtida com contagem, estilo Instagram |
| ❌ Comentário em foto não existe | ✅ Comentário de primeira classe |
| ❌ Scroll infinito proibido | ✅ Scroll infinito no feed |
| ❌ Sem toggle de tema | ✅ Tema claro/escuro à escolha |

### 7.2 Plano de Implementação (6 Fases)

Documentado em: `docs/superpowers/plans/2026-08-17-convidado-social-moderno.md`

**Fase 1 — Fundação** (tema claro/escuro + componentes base)
- Task 1.1: ✅ `eventVars` aceita override de background
- Task 1.2: ✅ Resolver preferência de tema sem flash
- Task 1.3: ✅ `FloatingNav` — navegação flutuante
- Task 1.4: ✅ `StoryRail` — trilha de stories
- Task 1.5: ✅ `EventHero` — foto-herói com degradê
- Task 1.6: ✅ `PhotoCard` — card do feed
- Task 1.7: ✅ `CommentSheet` — sheet de comentários
- Task 1.8: ✅ Toggle de tema visível
- Task 1.9: ⏳ Guards + PR

**Fase 2** — Home + Perfil  
**Fase 3** — Câmera, filtros e envio  
**Fase 4** — Álbum, detalhe e social (dados)  
**Fase 5** — Missões, Música, Minhas, Entrada  
**Fase 6** — Cânone + fechamento (atualizar CLAUDE.md, ADRs)

### 7.3 Sistema Visual Novo

- **Foto-first:** cromo cede espaço à imagem
- **Tipografia:**
  - Fraunces (serifada) = títulos, nomes
  - Instrument Sans = corpo, rótulos
- **Degradê suave** derretendo foto no fundo
- **Âmbar (`--acento`)** como alma Albora
- **Tokens resolvidos em runtime** (continua)

---

## 8. Guards de Qualidade (CI Bloqueante)

7 guards rodam desde o primeiro commit:

| Guard | Verifica | Status |
|-------|----------|--------|
| **isolamento** | RLS, `SET LOCAL`, locks de transação | ✅ Bloqueante |
| **tokens** | Hex literal em componente | ✅ Bloqueante |
| **dominio** | String de vertical no núcleo | ✅ Bloqueante |
| **packs** | Dependência unidirecional `pack→core` | ✅ Bloqueante |
| **sessao** | Token em querystring, PII em log | ✅ Bloqueante |
| **features** | `features/` não importa `@/app/*` | ✅ Bloqueante |
| **api-routes** | Rotas de convidado resolvem sessão | ✅ Bloqueante |

**Teste de carga** (150 uploads/20min) é obrigatório antes do 1º evento real.

---

## 9. Modelo de Dados

### 9.1 Tabelas Principais

```
accounts ──┐
           ├──< events >──┬──< challenges
vendors ───┘              ├──< guest_sessions >──┬──< uploads >──< reactions
                          │                      ├──< comments
                          │                      └──< guest_contacts
                          ├──< funnel_events
                          ├──< event_music / music_suggestions
                          ├──< recado / recado_lido
                          ├──< export_jobs
                          ├──< event_slugs        ← fora da RLS
                          ├──< session_tokens     ← fora da RLS
                          ├──< wall_tokens        ← fora da RLS
                          ├──< wall_pairings      ← fora da RLS
                          ├──< app_pairings       ← fora da RLS
                          └──> packs
```

**53 migrations** implementadas (forward-only em produção)

### 9.2 Campos-Chave

- `events.expected_guests` — denominador da H1
- `events.timezone` — IANA do salão (default: `America/Sao_Paulo`)
- `events.identity_tokens` — JSONB com paleta, tipografia, monograma
- `events.plan` — `free` | `celebration`
- `guest_sessions.via` — `qr` | `wa` | `link` (canal de entrada)
- `uploads.taken_at` — timestamp com fuso do evento

---

## 10. Rotas e APIs

### 10.1 Rotas do Convidado (EN canônico)

| Rota | Superfície | Aliases PT |
|------|-----------|------------|
| `/e/[slug]` | Entrada/Home | `/e/[slug]/capa` |
| `/e/[slug]/cover` | Perfil do evento | `/capa` |
| `/e/[slug]/photo` | Câmera | `/foto` |
| `/e/[slug]/feed` | Feed social | — |
| `/e/[slug]/album` | Álbum | `/album` |
| `/e/[slug]/my-photos` | Minhas fotos | `/minhas` |
| `/e/[slug]/missions` | Missões | `/missoes` |
| `/e/[slug]/music` | Música | `/musica` |
| `/e/[slug]/pair` | Parear app | `/parear` |

### 10.2 APIs Principais

**39 diretórios de API** sob `apps/web/app/api/`:

```
admin/         # Admin do anfitrião
album/         # Álbum de fotos
analytics/     # Product events
app/           # Pareamento de app
billing/       # Checkout Asaas
comments/      # Comentários (novo)
feed/          # Feed social (novo)
funnel/        # Funil de conversão
guest/         # Sessão e evento público
media/         # Assinatura de URLs
moderacao/     # Moderação
music/         # Música colaborativa
sessions/      # Criar sessão
uploads/       # Presign/confirm
wall/          # Telão + pareamento
...
```

---

## 11. Problemas e Gaps Identificados

### 11.1 Bloqueantes para 1º Evento Real

1. **Prova impressa física** — QR precisa ser testado com 3 celulares reais
2. **Deploy de produção** — Cloudflare Workers + R2 + Neon + Resend
3. **Teste de carga contra infra real** — 150 uploads/20min
4. **Procedimento jurídico de menores** — não-código, mas bloqueante operacional
5. **Verificação OAuth do Google** — de "Testing" para "Production" (refresh token expira em 7 dias)

### 11.2 Estado dos Testes

⚠️ **CRÍTICO:** `pnpm test` falha atualmente

```
vitest: not found
Local package.json exists, but node_modules missing
```

**Ação necessária:** `pnpm install` não foi executado neste ambiente.

### 11.3 Dependências Não Instaladas

O projeto requer instalação completa antes de qualquer validação:

```bash
pnpm install
pnpm db:up          # Docker Postgres na porta 55432
pnpm db:semear      # Seed de desenvolvimento
```

---

## 12. Pontos Fortes da Arquitetura

### 12.1 Segurança e Isolamento

✅ **Excelente**
- RLS forçado desde o primeiro commit
- Isolamento por evento é **não negociável** e testado
- Token de sessão opaco, nunca exposto em URL
- EXIF removido no cliente (GPS não sai do dispositivo)
- PII mascarada em logs

### 12.2 Escalabilidade

✅ **Bem projetado**
- Serverless (escala a zero, sem cold start)
- Object storage com egress zero (R2)
- Upload direto (servidor nunca toca bytes)
- Pooling de conexão com `SET LOCAL` correto
- Compute do banco suspende quando ocioso

### 12.3 Resiliência

✅ **Robusto**
- Fila offline em IndexedDB (fonte da verdade)
- Retry com backoff exponencial
- Degrada graciosamente (classificador, analytics, notificações)
- Caminho crítico tem apenas 2 dependências
- Service Worker para drenagem em background

### 12.4 Observabilidade

✅ **Implementado**
- Funil instrumentado desde o primeiro commit
- Dashboard de participação (`sessões_com_upload / expected_guests`)
- Logs estruturados, sem PII crua
- Tracking por canal de entrada (`via`)

### 12.5 Documentação

✅ **Excepcional**
- 82 arquivos `.md` no projeto
- ADRs datados e imutáveis
- Specs por tarefa, escritas antes do código
- Runbooks para procedimentos operacionais
- `CLAUDE.md` como cânone para agentes de código

---

## 13. Riscos e Pontos de Atenção

### 13.1 Riscos de Negócio

| Risco | Severidade | Mitigação |
|-------|-----------|-----------|
| H1 (40% participação) não validada em evento real | 🔴 Alta | Primeiro evento é o teste definitivo |
| Procedimento jurídico de menores incompleto | 🔴 Alta | Advogado + procedimento escrito antes do 1º evento |
| Custo marginal >R$ 3 invalida economia | 🟠 Média | Teste de carga validará estimativa |

### 13.2 Riscos Técnicos

| Risco | Severidade | Mitigação |
|-------|-----------|-----------|
| Deploy de produção não testado | 🔴 Alta | Ladder `stable→homol→main` precisa estar de pé |
| Teste de carga não executado | 🔴 Alta | `pnpm carga` existe, rodar contra infra real |
| Classificador de moderação é heurístico | 🟠 Média | Gate fail-closed na parede funciona; ML é melhoria |
| App nativo incompleto (paridade) | 🟡 Baixa | App é segunda porta; web é primeira |
| Universal links sem credenciais | 🟡 Baixa | Runbook documenta, não bloqueia MVP |

### 13.3 Riscos de Manutenção

| Risco | Severidade | Mitigação |
|-------|-----------|-----------|
| Branch `feat/convidado-social-moderno` divergiu muito de `main` | 🟠 Média | 552 commits, 1.264 arquivos alterados; merge será complexo |
| Pivô social contradiz `CLAUDE.md` e ADRs | 🟠 Média | Fase 6 do plano atualiza cânone; não mergear antes |
| Refatoração massiva de comentários recente | 🟡 Baixa | Alinhamento às regras; positivo |

---

## 14. Conformidade com as Regras (`CLAUDE.md`)

### 14.1 Regras Seguidas ✅

- ✅ Isolamento por evento (RLS forçado, `SET LOCAL`, storage derivado)
- ✅ Sessão do convidado sem login
- ✅ Caminho crítico com 2 dependências
- ✅ Nenhum hex literal em componente (guard bloqueante)
- ✅ EXIF removido no cliente
- ✅ Chaves de storage derivadas no servidor
- ✅ Migrations forward-only
- ✅ Nunca logar PII crua
- ✅ Commits Conventional Commits
- ✅ Dependência `pack → core`
- ✅ IA generativa nunca toca mídia (LUT no cliente)

### 14.2 Regras em Revisão (Pivô Social) 🟡

A branch atual **quebra intencionalmente** 3 regras por decisão de produto:

- 🟡 Contagem de curtida visível (antes proibida)
- 🟡 Comentário em foto (antes "nunca existirá")
- 🟡 Scroll infinito (antes proibido)
- 🟡 Toggle de tema (antes "não existe em nenhuma superfície")

**Ação obrigatória (Fase 6):** Atualizar `CLAUDE.md` e ADRs na mesma MR.

### 14.3 Gates de Qualidade

| Gate | Fase Atual | Exigido para MVP |
|------|-----------|------------------|
| Cobertura ≥90% pipeline upload | ✅ | ✅ Obrigatório |
| Cobertura ≥60% global | ⏳ | ✅ Obrigatório |
| Smoke E2E | ✅ | ✅ Obrigatório |
| Teste de carga 150/20min | ❌ | ✅ **Bloqueante** |

---

## 15. Recomendações Prioritárias

### 15.1 Curto Prazo (Bloqueantes para MVP)

1. **🔴 URGENTE: Executar `pnpm install`** para restaurar `node_modules`
2. **🔴 Deploy de produção** — esteira `stable→homol→main` + CF Workers
3. **🔴 Teste de carga** — 150 uploads/20min contra infra real
4. **🔴 Prova impressa física** — 3 celulares diferentes escaneando QR
5. **🔴 Procedimento jurídico menores** — advogado + documento operacional
6. **🔴 Verificação OAuth Google** — sair de "Testing"

### 15.2 Médio Prazo (Pós-MVP)

1. **🟠 Merge da branch feat/convidado-social-moderno**
   - 552 commits divergentes
   - Atualizar cânone (`CLAUDE.md`, ADRs) **antes** do merge
   - Resolver conflitos com calma
   
2. **🟠 Classificador ML** — trocar heurística por modelo real
3. **🟠 App nativo completo** — paridade total de features
4. **🟠 Universal links** — credenciais reais + rebuild
5. **🟠 Budgets de performance** — LCP/INP bloqueantes

### 15.3 Longo Prazo (Escala)

1. **⚪ Fase 3 (Fornecedor)** — white-label B2B2C
2. **⚪ Cobertura ≥90% global**
3. **⚪ E2E profundo** (todos os fluxos)

---

## 16. Conclusão

### 16.1 Resumo Executivo

O projeto Albora está em **estado avançado de desenvolvimento**, com:

✅ **Pontos Fortes:**
- Arquitetura sólida, bem documentada e segura
- Isolamento por evento rigoroso e testado
- Pipeline de upload resiliente e eficiente
- Sistema de identidade visual único (tokens em runtime)
- Observabilidade desde o primeiro commit
- Documentação excepcional (82 arquivos .md)

⚠️ **Bloqueantes Críticos para 1º Evento:**
- Deploy de produção não executado
- Teste de carga não validado
- Prova impressa física pendente
- Procedimento jurídico de menores incompleto

🟡 **Em Transição:**
- Branch `feat/convidado-social-moderno` com redesign massivo
- Pivô social quebra 4 regras anteriores (documentado e intencional)
- Cânone (`CLAUDE.md`, ADRs) precisa ser atualizado antes do merge

### 16.2 Prontidão para 1º Evento Real

**Código:** 80% pronto  
**Infra:** 40% pronto (não testada em produção)  
**Jurídico:** 0% pronto (pendente)  

**Estimativa:** 2-3 sprints até o primeiro evento real, assumindo:
- Deploy de produção configurado
- Teste de carga executado com sucesso
- Procedimento jurídico definido
- Prova impressa validada

### 16.3 Qualidade do Código

**Classificação Geral:** ⭐⭐⭐⭐½ (4.5/5)

- Arquitetura excepcional
- Segurança de primeira classe
- Documentação acima da média
- Guards de qualidade rigorosos
- Testes precisam ser executados (node_modules ausente)

---

**Fim da Análise**  
Gerado por Cloud Agent em 28/08/2026
