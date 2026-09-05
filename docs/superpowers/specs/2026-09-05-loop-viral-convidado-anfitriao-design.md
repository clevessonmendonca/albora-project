# Loop viral convidado → anfitrião — design

**Data:** 2026-09-05
**Status:** Spec aprovada em design, aguardando revisão do mantenedor antes do plano
**Escopo:** Superfícies do convidado, landing, `@albora/db`, jobs, service worker, `apps/mobile`, ADRs. **Fora:** `/admin` (pertence a outra frente — RBAC), exceto uma linha de integração entregue ao dono do admin.

## 1. Contexto e decisão

Cada convidado que participa de uma festa é um futuro anfitrião. Hoje o produto não converte isso: nenhuma superfície do convidado convida a criar o próprio álbum, o álbum público não carrega atribuição, e não existem memórias que tragam o convidado de volta. A alavanca de crescimento primária definida pelo mantenedor (2026-09-05) é este loop.

### 1.1 Decisões tomadas pelo mantenedor (registradas, não derivadas)

- **Exceção ao congelamento de features.** `docs/product/congelamento-de-features.md` congela features até o casamento #1 ser medido. O mantenedor decidiu construir o loop viral agora, ciente de que o produto não rodou evento real nem está em produção. A exceção fica documentada no próprio doc de congelamento, com data e motivo.
- **Todos os canais de memória são válidos**: in-app, Web Push (PWA) e push nativo.
- **Abordagem A — loop completo agora**, sequenciado por risco em P1 → P2 → P3 (§8), não gateado por evento real.

### 1.2 O que já existe (não reconstruir)

| Peça | Estado | Onde |
|---|---|---|
| Ref outbound por evento | **pronto** | `event_share_refs`, `mintarRefDeCompartilhamento` (chamado em `criarEvento`), `refDoEvento`, `eventoDoRef` (BYPASSRLS, auditado) — `packages/db/src/share-attribution.ts` |
| CTA "crie o seu" com `?ref=` | **pronto** | `features/my-photos/components/client/recap-sheet.tsx:111` |
| Coluna `product_events.origin_ref` | **existe, nunca escrita** | migration `0039` |
| Inbound de `?ref=` (landing → cookie → evento criado) | **ausente** | — |
| Push (infra, schema, opt-in duplo, 3 triggers) | **desenhado, não migrado** | ADR 0015 |
| `navigator.share` no convidado | **pronto** | `recap-share.ts`, `invite-button.tsx`, `share-or-download.ts` |
| Consentimento versionado por sessão (entrada + externo) | **pronto** | `guest_sessions.*consent*`, `consent-db.ts` |
| Padrão de job agendado com lock e `app.event_id` | **pronto** | `retention-jobs.ts`, `retention-cron.yml` → `/api/ops/retencao` |

O loop é, em grande parte, **fechar metades que faltam**, não construir do zero.

## 2. Atribuição — fechar o inbound

Objetivo: medir **"eventos criados originados de convidado"**.

1. **Landing lê `?ref=`.** Server component da landing (`apps/web/app/landing/landing-page.tsx` ou middleware mínimo) valida o formato do token (24 chars opacos) e grava cookie `albora_ref` — `HttpOnly`, `SameSite=Lax`, `Max-Age=1800` (30 min), `Path=/`. Sem PII: é um rótulo opaco, nunca `event_id`.
2. **Sink aceita atribuição.** `recordProductEvent(pool, name, { anonId?, packHint?, originRef? })` em `packages/db/src/analytics.ts` grava `origin_ref`. A rota `/api/analytics/product` aceita `originRef` com o mesmo corte/cap dos demais campos. `product_events` **continua sem `event_id`** — é anônimo por design (migration 0032); `origin_ref` existe justamente para não reintroduzir `event_id`.
3. **A única linha do admin.** `apps/web/lib/api/handlers/admin-events.ts:202` — `recordProductEvent(getPool(), "event_created")` passa a receber `{ originRef: cookies().get("albora_ref")?.value ?? null }`. Entregue ao dono do admin como diff de 1 linha; esta frente não edita o arquivo. Sem essa linha o loop mede tudo menos a conversão final — o plano trata a entrega como dependência explícita, não como suposição.
4. **Reconciliação.** Job/consulta de agregação usa `eventoDoRef` (papel `BYPASSRLS`, auditado, já existente) para resolver `origin_ref → evento de origem` e produzir a métrica agregada. Só agregação; nunca cruza eventos fora desse caminho.
5. **`/p/[slug]` ganha ref.** `public-event-view.tsx` hoje aponta o CTA para `/admin/new?plano=free` sem ref. Passa a buscar `refDoEvento(eventoId)` server-side (como my-photos já faz) e emitir `/?ref=<token>`, para que a landing grave o cookie e a cadeia feche.

## 3. CTAs "crie o álbum da sua festa"

| Superfície | Ação |
|---|---|
| Recap-sheet (última tela) | manter; já carrega ref |
| Álbum público `/p/[slug]` | adicionar ref (§2.5) |
| Minhas-fotos / álbum do convidado | **novo** CTA discreto no rodapé do álbum, com ref |
| Confirm-screen (1ª foto) | **não recebe CTA** |

**Decisão:** o confirm-screen fica fora. O ADR 0008 já reserva essa tela para o convite do app nativo; dois convites competindo na tela mais sensível da H1 custam participação. O convite a criar o próprio álbum aparece depois da experiência completa (recap, álbum), quando o convidado já viu o valor.

Toda copy resolve pelo vocabulário do pack (`resolvePackText`). Nenhuma string de domínio em componente (guard `dominio`/`packs`).

## 4. Compartilhamento pelo convidado

Reusa o padrão de `recap-share.ts` (`navigator.share` com fallback copiar-link). Nova ação "compartilhar o álbum" em minhas-fotos/álbum compartilha `https://<host>/p/<slug>` — **sem** `?ref`: o matcher do middleware cobre só `/` e `/15-anos`, então um ref em `/p/` não gravaria cookie; a atribuição viaja no CTA do próprio álbum público (`/?ref=<token>`, §2.5), um passo depois. (Decisão ratificada em 2026-09-05 na review final de P1.) O OG do `/p/[slug]` já existe (`get-public-event-metadata.ts`). Emite `guest_share_album` (§6).

## 5. Memórias automáticas

### 5.1 Consentimento (opt-in, um toque para sair)

Espelha o padrão do consentimento externo (ADR 0009, migration 0017). Nova migration adiciona a `guest_sessions`:

- `memories_consent_version text`
- `memories_consented_at timestamptz`
- `memories_opted_out_at timestamptz`

Regras: opt-in é ativo e explícito (checkbox antes de emitir token — opt-in duplo do ADR 0015); **desligar é um toque** que grava `memories_opted_out_at = now()` **sem** invalidar a sessão; agregador `aceitesDeMemoriasPorVersao` em `consent-db.ts` (contagens por versão, sem nomes). A UI de opt-in vive na superfície do convidado (minhas-fotos/perfil), nunca no admin.

### 5.2 Canais

- **In-app:** ao reabrir o álbum dentro da janela de memória, um card "há quase um ano" destaca a foto. Funciona sem push — é a base que os outros canais apenas antecipam.
- **Web Push (PWA):** implementa a infra do ADR 0015 — migration de `guest_notification_tokens` (FK `event_id` e `guest_session_id` com `ON DELETE CASCADE`, **RLS forçada** por `event_id`, expiração 90 dias), handlers `push` e `notificationclick` em `apps/web/sw/sw.ts`, chaves VAPID/FCM em `.env.example` (nunca no repo). FCM com fallback Web Push, como o ADR define.
- **Push nativo:** `expo-notifications` em `apps/mobile`; o token é registrado na tabela acima via a ponte de pareamento existente (`app-pairing.ts` / `pair-link.ts`), plataforma `native`.

### 5.3 Trigger e ADR

`memory_anniversary` é um **quarto trigger**, não autorizado pelo ADR 0015 (que lista exatamente três). **ADR 0016** amenda o 0015: adiciona o trigger, seu payload (`{ type: "memory_anniversary", eventName, action: "Ver memória" }`), e a agenda D365-safe abaixo. Sem o ADR, não se implementa.

### 5.4 Agenda — antes do D365

Conflito: `planRetention` apaga a mídia em `d365_delete` (dia 365 após o fim do evento, +60 min de graça, fail-closed pelo export). "Há um ano" cai no mesmo dia.

**Decisão:** a memória dispara no **dia 350** após o fim do evento — antes de `d358_warn` e `d365_delete`. Copy "há quase um ano". Um `kind` novo `memory_d350` na mesma família de agendamento (`ON CONFLICT (event_id, kind) DO NOTHING`), agendado em `criarEvento` como os demais. Nunca se agenda memória para data ≥ `dueAt` de `d365_delete`. A mídia está viva no dia 350; se por qualquer motivo já foi exportada e apagada, o job faz **skip com log sem PII**, não inventa fallback.

### 5.5 Conteúdo e cardinalidade

- **Uma memória por sessão de convidado**, não por foto — evita spam e mantém a memória especial.
- O conteúdo é **uma foto do próprio convidado** (upload daquela sessão). Nunca se empurra mídia de terceiros para o aparelho de alguém: é a leitura mais segura da LGPD e da regra "mídia de convidado nunca vira material" — aqui ela volta só para quem a fez.
- Seleção: a foto com mais reações daquela sessão; empate → a primeira publicada. Determinística, testável.

### 5.6 O job

Segue `processRetentionJob` byte a byte no que é invariante:

- Payload carrega `event_id`; o worker faz `SET LOCAL app.event_id` (via `comEvento`) **antes de qualquer consulta**; **sem `event_id` falha alto**.
- `pg_advisory_xact_lock(hashtext('memories:' || event_id))` — xact-scoped, nunca de sessão.
- Lista devidos com `listDue*` em pool `BYPASSRLS` (mesmo motivo documentado em `retention-jobs.ts:50`: sem isso o JOIN devolve zero em silêncio).
- Para cada sessão com opt-in ativo e sem opt-out: escolhe a foto (§5.5), grava a memória (tabela `guest_memories(event_id, session_id, upload_id, fired_at)`, RLS forçada), envia push para tokens válidos (FCM → fallback Web Push), marca o job.
- Falhas de envio degradam (log agregado, sem PII); nunca bloqueiam o restante.

Runner: rota `/api/ops/memorias` com `Authorization: Bearer $CRON_SECRET`, workflow `memories-cron.yml` diário — irmão exato de `retention-cron.yml`.

### 5.7 Fecha o loop

O `notificationclick` (e o card in-app) abre `/e/<slug>?memoria=<id>`: o álbum com a foto em destaque e, abaixo, o CTA "crie o álbum da sua festa" com ref. A memória é o gatilho de retorno; o CTA é a conversão.

## 6. Analytics `guest.*`

Novos nomes em `PRODUCT_EVENT_NAMES` e no CHECK do banco (**migration forward-only**, mesmo padrão da `0052`: drop + re-add do `product_events_name_check`):

- `guest.cta_criar_click` — clique em qualquer CTA "crie o seu"; `originRef` = ref do evento de origem
- `guest.share` — compartilhamento do álbum
- `guest.memory_open` — abertura de memória (push ou card)

Todos anônimos, com `originRef` opaco. **Eventos ligados a sessão** (opt-in/opt-out de memórias) **não** vão para `product_events`: ficam nas colunas de consentimento de `guest_sessions` (§5.1) e, se precisar de série temporal, em `funnel_events(event_id, session_id, name)`, que é event-scoped e sob RLS. Nada de PII em nenhum dos dois.

## 7. Dados — migrations (todas forward-only)

1. `guest_sessions` + colunas `memories_consent_version`, `memories_consented_at`, `memories_opted_out_at`.
2. `guest_notification_tokens` conforme ADR 0015 (RLS forçada, cascade, expiração).
3. `guest_memories(id, event_id NOT NULL FK, session_id FK, upload_id FK, fired_at)` — RLS forçada; índice `(event_id, session_id)`.
4. `product_events_name_check` recriado com os `guest.*`.
5. `retention_jobs.kind` (ou tabela irmã) aceita `memory_d350` — verificar se há CHECK/enum em `kind`; se houver, migration.

Todas passam pelo guard `isolamento` (toda tabela com dado de evento tem `event_id` NOT NULL + RLS forçada com `NULLIF`).

## 8. Fases de entrega

| Fase | Entrega | Critério de aceite |
|---|---|---|
| **P1 — Loop medível** | §2 inbound + §3 CTAs + §4 share + §6 `guest.*` + entrega da 1 linha ao admin | E2E: `/?ref=X` → cookie → `product_events.origin_ref = X` em `landing_cta`; `/p/[slug]` emite ref; `guest.cta_criar_click`/`guest.share` gravados; guards e testes verdes |
| **P2 — Memória in-app** | §5.1 consentimento + card in-app + `guest_memories` + job (sem push) + §5.4 agenda | Job unitário: agenda < `d365_delete`; falha alto sem `event_id`; lock xact; skip loud; agregador de consentimento; opt-out em 1 toque preserva sessão |
| **P3 — Push** | ADR 0016 + migration 0015 + sw `push`/`notificationclick` + FCM/Web Push + `expo-notifications` + `memories-cron.yml` | Token só após opt-in duplo; RLS na tabela; expiração 90d; `notificationclick` abre `/e/<slug>?memoria=`; envio degrada sem bloquear |

Cada fase é uma MR para `stable`. P1 não depende de push; P2 não depende de P3.

## 9. Segurança e LGPD

- Convidado continua sem login, e-mail, SMS ou senha. O único canal de saída é o token do aparelho, com opt-in duplo.
- `product_events` permanece anônimo; atribuição é rótulo opaco.
- Memória só devolve ao convidado a própria mídia.
- Sair das memórias é um toque, sem retenção, sem fricção (regra não negociável).
- Consentimento de memórias é versionado e datado por sessão.
- Logs de job e de envio: agregados, sem nome/telefone/e-mail (não existem para convidado, mas a regra vale para qualquer campo).
- Exclusão do evento cascateia tokens e memórias.

## 10. Testes

- **Atribuição (P1):** unit para leitura/validação do `?ref=` e do cookie; unit para `recordProductEvent` com `originRef`; E2E `landing?ref → cookie → origin_ref`.
- **Job de memórias (P2):** agenda estritamente antes de `d365_delete`; sem `event_id` lança; lock por evento; idempotência (`ON CONFLICT`); seleção determinística da foto; skip sem PII quando mídia ausente; respeita `memories_opted_out_at`.
- **Consentimento (P2):** agregador por versão; opt-out não invalida sessão.
- **Push (P3):** handler `push` renderiza notificação a partir do payload do ADR 0016; `notificationclick` abre a URL correta; token só emitido após opt-in; expiração; fallback FCM → Web Push.
- **Guards:** `isolamento` nas 3 tabelas novas; `tokens`/`dominio`/`packs` nos componentes novos.
- Cobertura mantém os gates da fase (≥60% global no MVP; o job não é caminho de upload).

## 11. Dependências e handoffs

| Dependência | Dono | Observação |
|---|---|---|
| 1 linha em `admin-events.ts:202` (`originRef` do cookie) | dono do admin (frente RBAC) | sem ela a métrica final não fecha |
| Chaves VAPID / projeto FCM | mantenedor | GitHub Actions secrets, nunca no repo |
| GitHub Actions cron (`memories-cron.yml`) | mantenedor | Actions está **sem rodar** desde 02/09 (nenhum run em push/PR/reopen); o cron de memórias herda isso até ser resolvido em Settings → Actions/Billing |
| ADR 0016 aceito | mantenedor | pré-condição de P3 |

## 12. Riscos

- **Construir antes do evento #1** (decisão do mantenedor): o loop pode ser medido só quando houver convidados reais; até lá, P1 valida-se por E2E e P2/P3 por testes.
- **Retenção × memória:** mitigado pelo dia 350; se `planRetention` mudar, o teste "agenda < d365" quebra alto.
- **Regulador e opt-in duplo:** risco herdado do ADR 0015; opt-out em um toque e conteúdo próprio reduzem exposição.
- **Cron via Actions parado:** o job pode ser disparado manualmente pela rota bearer enquanto o Actions não volta; não é bloqueio de design.

## 13. Fora de escopo

- Qualquer edição em `/admin` além da linha do §2.3.
- UI de "quem eu indiquei" para o anfitrião (é admin).
- Memória de mídia de terceiros; memória por foto; janelas além do dia 350.
- E-mail/SMS/WhatsApp para convidado (proibido por regra).
- Novos packs (corporativo, aniversário) — melhoria de landing, outra spec.

## 14. ADRs e docs a produzir

- **ADR 0016 — Memórias automáticas como quarto trigger de push** (amenda 0015; agenda D350; consentimento; conteúdo próprio; uma por sessão).
- `docs/product/congelamento-de-features.md` — seção "Exceção: loop viral (2026-09-05)", com a decisão e o motivo.
- `docs/architecture.md` — inbound de atribuição; job de memórias; tabelas novas na lista de RLS.
