# Álbora — Console do operador (admin CEO / staff) — guia de implementação

> **Para o agente/dev que vai implementar.** Traduz o redesign do **console interno do operador** (staff Álbora — não é o anfitrião, não é o fornecedor) do protótipo `prototipos/console.html` para o código atual. Companion de [`REFATORACAO.md`](./REFATORACAO.md), [`painel.md`](./painel.md), [`telao.md`](./telao.md), [`kit.md`](./kit.md), [`identidade.md`](./identidade.md).

## 0. Como usar

- `prototipos/console.html` é referência **visual e de interação**. **Não porte o JS** (estado fake, dados inline).
- **O backend do console já existe** — e é bom. Ele vive na branch **`feat/ceo-backoffice`** (não em `main`/`stable`/nesta branch). Capabilities, reautenticação, auditoria append-only, `security_events`, DSAR, impersonação com 2ª aprovação e retenção já estão implementados. **O redesign é de UI/UX sobre esse backend**, não de infraestrutura. Antes de editar, faça checkout/rebase de `feat/ceo-backoffice` e confirme os caminhos (`git grep`).
- **Não confundir três superfícies distintas:**
  - `apps/web/app/console/**` (branch `feat/ceo-backoffice`) — **este** console de staff (capabilities, LGPD, impersonação, auditoria). É o alvo.
  - `apps/web/app/admin/**` — painel do **anfitrião/fornecedor** (outro doc: [`painel.md`](./painel.md)).
  - `apps/web/app/ops/**` — console de ops antigo e simples (`isPlatformOperator`, cookie `HOST_COOKIE`; sem capabilities/papéis). **Não é o alvo**; não misturar.
- Fonte da verdade de design: [`design-system-v3.md`](./design-system-v3.md). Console é **tema claro fixo, densidade alta** — nunca se repinta com a identidade do casal.

## 1. A virada de conceito

O console de hoje **mostra informação**. O redesign faz três coisas a mais, nesta ordem de importância:

1. **Deixa claro o que exige atenção agora.** A Visão geral separa **ação** (o que precisa de você: SLA estourado, DSAR vencido, retenção falhada, inadimplência, pico de segurança) de **monitoramento** (eventos ao vivo). Ação primeiro; saúde depois; ao-vivo por último.
2. **Dá contexto suficiente para decidir.** Cada linha abre um **drawer rico**: a conta com trilha, o evento com saúde/uploads/erros/funil de uso, a assinatura com histórico e IDs do provedor, o ticket com contexto técnico do dispositivo, a falha de retenção com log e tentativas, o alerta de segurança com IPs e contas afetadas.
3. **Torna difícil executar uma ação perigosa por engano.** Toda ação sensível passa por um **modal forte**: contexto do alvo + **motivo obrigatório** + aviso de **reautenticação (step-up)** + **palavra digitada** para as irreversíveis + **linha de auditoria** explícita. E **"Excluir conta" abre um pedido DSAR** — nunca apaga direto.

Princípio único: *o console não deve só mostrar; deve tornar óbvio o que exige atenção, dar contexto pra decidir e tornar difícil errar caro.*

## 2. Não-negociáveis (CLAUDE.md)

- **Isolamento por evento.** As telas de agregação (cross-evento) usam o pool `albora_agregador` (`BYPASSRLS`) **só para leitura**; toda mutação vai por `getPool()` normal com `SET LOCAL app.event_id`. Este é o único caminho autorizado de query cross-evento e é auditado. Não introduzir novos caminhos cross-evento fora desse padrão.
- **PII mascarada por padrão.** Contato/telefone/e-mail vêm mascarados; revelar é uma **ação com capability + auditoria** (`accounts.pii.reveal`), visível por tempo curto. Nunca logar PII crua.
- **Autorização por capability, não por papel na UI.** Cada ação some quando o papel não tem a capability — nunca aparece desabilitada "clicável". A UI reflete `hasCapability`, não hardcode de papel.
- **Ações irreversíveis pedem step-up.** `lgpd.delete_account` e `staff.manage` já exigem reauth ≤ 900s por política; a UI **coleta motivo antes** e mostra que vai reautenticar.
- **Auditoria é append-only.** A UI nunca oferece editar/apagar registro de auditoria. Toda ação sensível grava ator, ação, alvo, IP, request-id e motivo.
- **Retenção é por job, não por botão.** A tela de retenção é **só-leitura** por design. Investigar falha é permitido; executar/reprocessar manualmente **não** (fica pra onda futura, e mesmo então via `executeCommand` + auditoria).
- **Zero hex em componente.** Tema do console via `adminVars()` (claro fixo), tokens do DS v3.

## 3. Código atual (ponto de partida) — branch `feat/ceo-backoffice`

> Confirme os caminhos antes de editar (`git grep`). Tudo abaixo é dessa branch; **não existe** no worktree atual.

- **Shell/rotas.** Route group `apps/web/app/console/(shell)/` com `layout.tsx` (resolve actor → redirect login, monta `ConsoleShell`, carrega impersonação ativa + pedidos pendentes) e páginas: `page.tsx` (overview), `accounts/page.tsx` + `accounts/[id]/page.tsx`, `events/page.tsx` + `events/[id]/page.tsx`, `subscriptions/page.tsx`, `support/page.tsx`, `lgpd/page.tsx`, `retention/page.tsx` (só-leitura), `audit/page.tsx`, `security/page.tsx`. Fora do shell: `console/login/page.tsx`, `console/reauth/page.tsx`. Componentes em `apps/web/features/console/components/{server,client}/*` (nav, shell, accounts-table, audit-table, delete-account-danger, dsar-*, events-table, impersonation-*, reauth-form, reveal-pii-button, subscription-actions, support-queue, ticket-detail, console-search, login-form). Server actions em `apps/web/features/console/actions.ts` (envelope `executeCommand`).
- **Auth de staff.** Cookie `albora_staff`, **TTL absoluto 12h + idle 30min**, rotação na metade do TTL (`rotated_from`). `apps/web/lib/console/staff-session.ts` (`resolveActor`, constantes) + `packages/db/src/staff.ts` (`resolveStaffSession`, `revokeSessionChain`). Reuso de sessão revogada → revoga a cadeia inteira + grava `security_events` kind `session.reuse`. Tabelas `staff_users/staff_magic_links/staff_sessions/staff_role_assignments` (migration `0059_staff_identidade.sql`).
- **Autorização por capability.** `packages/core/src/authorization/`: `types.ts` (`Capability`, `StaffRole = owner|support|finance|compliance|engineering`, `Actor`), `roles.ts` (`ROLE_CAPABILITIES`, owner completo em compile-time), `capabilities.ts` (`hasCapability`), `policies.ts` (`authorize`, `POLICIES`: reauth em `lgpd.delete_account`/`staff.manage`; reembolso exige aprovação acima de `REFUND_APPROVAL_THRESHOLD_CENTS = 50_000`; `REAUTH_MAX_AGE_SECONDS = 900`).
- **Dados/queries.** Comandos em `packages/application/src/**` (accounts, subscriptions, lgpd, retention, audit, security, impersonation, search) via envelope `executeCommand` (`envelope/command.ts`) que faz autorização + auditoria **dentro** do comando. Leitura cross-evento via `getAggregatorPool()` (`apps/web/lib/infrastructure/database/client.ts`, role `albora_agregador` com `BYPASSRLS`, migration `0002_papeis.sql`).
- **Ações sensíveis já implementadas.** Revelar PII (`accounts.pii.reveal`); impersonação `request→approve/deny→start→end` com 2ª aprovação (tabela `impersonation_requests`, migration `0062`, `host_sessions.impersonation_id`); DSAR + excluir conta (`deleteAccountAction` devolve `reauthRequired`); mudar plano / cortesia / cancelar / reembolso; ticket (responder/atribuir/status/prioridade). Step-up: `requestReauthAction`/`completeReauthAction` + `staff_sessions.reauthenticated_at`. Auditoria: tabela `audit_log` append-only (`REVOKE UPDATE,DELETE,TRUNCATE`, migration `0060`). `security_events` (mesma migration): kinds `login.failed|magic_link.abuse|capability.denied|rate_limit.exceeded|session.reuse|reauth.failed`.
- **Retenção.** Kinds `plus_48h|d330_drive|d358_warn|d365_delete` (`packages/core/src/retention.ts`). Runner `apps/web/lib/application/use-cases/admin/process-retention-jobs.ts`; queries `packages/db/src/retention-jobs.ts`; cron `apps/web/cloudflare/retention-cron.ts` + `.github/workflows/retention-cron.yml`; endpoint `app/api/ops/retencao/route.ts`. UI `console/(shell)/retention/page.tsx` **só-leitura** ("nenhum botão de propósito").
- **Tipografia/tema.** Classes `.tipo-den-{metrica,titulo,corpo,dado,rotulo}` em `apps/web/app/tipografia.css`. `console-shell.tsx` usa `adminVars()` **sem** override de background: console sempre claro, nunca repinta com a identidade do evento.

### Gaps que o redesign preenche

- **Tela "Equipe" (`/console/staff`)**: o nav item existe (`console-nav.tsx`, capability `staff.manage`) mas **`staff/page.tsx` não existe**. Criar.
- **Tela "Sistema"**: **não existe** (nem nav, nem página). Net-new.
- **Ações "Revogar sessão de staff" e "Bloquear IP"**: **não implementadas** como ação manual (revogação só acontece via detecção de reuso). O protótipo as mostra — no build, ou implementam-se (comando + capability + auditoria) ou ficam atrás de flag até existirem. Não desenhar botão que não faz nada.
- **Command palette**, **tooltip do H1**, **período por-tela** e **split ação/monitoramento** na overview: puramente UI.

## 4. Alvo por tela

### 4.1 Shell + navegação
- Sidebar em 3 grupos: **Negócio** (Visão geral, Contas, Eventos, Assinaturas), **Operação** (Suporte, LGPD, Retenção), **Governança** (Auditoria, Segurança, Equipe, **Sistema**). Badges de contagem só onde há pendência real. Responsivo: sidebar vira drawer off-canvas com hambúrguer + scrim ≤ 820px.
- **Busca vira command palette** (`/` ou ⌘/Ctrl+K): navega telas e salta pra conta/evento/ticket. Substitui o campo de busca estático.
- **Seletor de período (Hoje/7d/30d) só onde afeta dado** — Visão geral e Assinaturas. Escondido nas telas que não são série temporal (evita sugerir filtro que não faz nada).
- Cada item reflete `hasCapability`: some pra quem não tem a capability, não aparece desabilitado.

### 4.2 Visão geral — atenção-primeiro
Três blocos, nesta ordem:
- **Precisa de você agora** (ação): só itens crítico/atenção que cruzam SLA (suporte), DSAR (LGPD), retenção falhada, inadimplência (financeiro) e pico de segurança. Cada linha leva à tela dedicada. Toggle "tudo em dia" mostra estado vazio honesto. **Eventos ao vivo não entram aqui.**
- **Saúde da plataforma** (monitoramento): H1 média + sparkline, MRR, churn≈, eventos ativos, convidados; **funil de ativação comercial** (Contas→Eventos→Checkout→Pago, maior perda destacada). O **H1 tem tooltip** explicando o cálculo (% de convidados esperados que enviaram ≥1 foto; meta ≥40%; **mesmo cálculo em toda tela do console** — coerência de métrica).
- **Acontecendo agora** (monitoramento): eventos ao vivo, como cartões — separado da lista de ação.
- **Separar contextos de funil**: o funil comercial (aquisição→conversão) vive aqui; o **funil de uso do evento** (QR→sessão→foto) vive no **detalhe do Evento**, não misturado.

### 4.3 Ações sensíveis — o coração do redesign
Um componente de confirmação forte (`confirmDanger` no protótipo) para toda ação sensível, com:
- **Contexto do alvo** (conta/fornecedor/valor/efeito) no topo.
- **Motivo obrigatório** (textarea; habilita o botão só com ≥ 3 chars). Vira o `motivo` na auditoria.
- **Aviso de reautenticação** quando a política exige (`lgpd.delete_account`, `staff.manage`) — a UI **coleta o motivo antes** e mostra que vai pedir senha/2FA; o backend já força reauth ≤ 900s.
- **Palavra digitada** para as irreversíveis (`EXCLUIR` / `CANCELAR` / `REEMBOLSAR`).
- **Linha de auditoria** explícita: "registrado: ator, ação, alvo, IP, request-id, motivo".

Mapeamento ação → comando existente:
- **Excluir conta → abre DSAR de exclusão** (`deleteAccountAction`; nunca apaga direto — inicia pedido reversível até a execução, prazo legal). Roteia pra tela LGPD.
- **Revelar PII** (`revealAccountPii`), **Impersonar** (fluxo `request→approve` com 2º operador), **Mudar plano/cortesia/cancelar/reembolso** (reembolso acima de R$ 500 = `50_000` centavos exige aprovação — a UI mostra isso).
- **Revogar sessão / Alterar papel** (Equipe) e **Bloquear IP / Abrir incidente** (Segurança/Retenção): **net-new** (§3 gaps) — só desenhar o botão junto do comando+capability+auditoria que o sustenta.

### 4.4 Drawers ricos (contexto pra decidir)
- **Conta**: identidade (contato mascarado, consentimentos), atividade (eventos, plano, status), trilha de auditoria; ações sensíveis com caption de capability.
- **Evento**: saúde (H1 vs meta, status, uploads, erros de upload), **funil de uso do evento** (QR→sessões→≥1 foto), configuração (plano, telão, gate de interação, "há menores"), timeline (1º scan → pico → última foto). Abrir painel read-only.
- **Assinatura**: plano/status/valor/próxima cobrança/próxima tentativa, **IDs do provedor (Asaas)** (customer/subscription/última fatura), **histórico de cobrança**, ações.
- **Suporte**: conversa + **contexto técnico** (conta, evento, plano, dispositivo/build, último erro) + toggle **resposta ao cliente vs nota interna** (a nota interna o cliente não vê — cor distinta).
- **Retenção**: job, status, **tentativas** (3/3 esgotou), **log da última tentativa**; só-leitura reforçado; "abrir incidente" (net-new) notifica on-call.
- **Segurança**: transforma alerta em investigação — origem (IPs, geo≈, user-agent), contas afetadas (tentadas/comprometidas/bloqueadas), eventos relacionados; bloquear IPs (net-new).
- **Equipe**: membro com papel, **MFA/2FA**, último acesso, **capabilities efetivas**, **sessões ativas**; forçar reauth / revogar sessões / alterar papel (net-new).
- **Auditoria**: ator, ação, alvo, IP, request-id, motivo e **antes→depois** quando aplicável (plano/reembolso); registro imutável.

### 4.5 Sistema (net-new)
Saúde da plataforma em tempo real, em cartões com status (Operacional/Degradado/Fora): API (uptime/p95), uploads (presign/confirm), processamento de fotos (fila), fila drive-export, storage (R2), e-mail (magic link), pagamentos (Asaas), integrações (Google Drive), **cron de retenção**. Alerta crítico no topo (ex.: "cron de retenção fora há 2 dias") leva à tela de Retenção. Nota: alertas críticos fora do horário vão pro on-call.

## 5. Copy (pt-BR, usar)
"Precisa de você agora" · "Atenção-primeiro" · "Excluir conta abre um pedido LGPD — não apaga direto" · "Motivo (obrigatório)" · "Vamos pedir sua senha/2FA de novo antes de concluir (step-up)" · "Digite EXCLUIR para confirmar" · "Registrado na auditoria: ator, ação, alvo, IP, request-id e motivo" · "Somente leitura · jobs rodam por cron. Aqui você investiga falhas, não executa." · "Registro imutável (append-only). Não pode ser editado nem apagado." · "H1 = % de convidados esperados que enviaram ≥1 foto. Meta ≥40%. Mesmo cálculo em toda tela." · Dado honesto: **"—"** quando falta, **"≈"** em aproximação.

## 6. Estados de borda
Nada pendente (estado "tudo em dia" honesto na overview) · conta sem contato (`—`, não vazio) · reembolso acima do limiar (mostra que exige aprovação) · impersonação aguardando 2º operador · job de retenção que esgotou tentativas (abre incidente, não reprocessa) · staff sem MFA (aviso no drawer) · operador sem a capability (ação some) · pico de segurança sem conta comprometida (deixa claro "0 comprometidas") · período aplicado onde não afeta (escondido) · mobile (sidebar off-canvas, tabelas com scroll-x próprio).

## 7. Ordem de implementação sugerida
1. **Rebase sobre `feat/ceo-backoffice`** e confirmar o mapa (§3).
2. **Shell + nav 3-grupos responsivo** + command palette + período por-tela.
3. **Visão geral atenção-primeiro** (split ação/monitoramento, H1 tooltip, funil comercial separado do funil de uso).
4. **`confirmDanger`** como componente compartilhado (motivo obrigatório + reauth + palavra + linha de auditoria), religando as ações **já existentes** (PII, impersonação, plano/cortesia/cancelar/reembolso) e o **Excluir→DSAR**.
5. **Drawers ricos** (Conta, Evento, Assinatura, Suporte, Auditoria) sobre os comandos existentes.
6. **Segurança como investigação** e **Retenção com log/tentativas/incidente** (incidente = net-new).
7. **Tela Equipe** (`/console/staff` — hoje é link morto) e **tela Sistema** (net-new).
8. **Ações net-new** (revogar sessão, alterar papel, bloquear IP, abrir incidente): só com comando+capability+auditoria; até lá, atrás de flag.
9. Estados de borda + a11y AA + mobile real.

## 8. Definition of Done
[ ] rebase em `feat/ceo-backoffice`, caminhos confirmados · [ ] shell 3-grupos responsivo + command palette + período só onde afeta · [ ] overview separa ação de monitoramento; H1 com tooltip e mesmo cálculo em toda tela · [ ] funil comercial separado do funil de uso do evento · [ ] `confirmDanger` com motivo obrigatório + reauth + palavra + linha de auditoria em toda ação sensível · [ ] Excluir conta abre DSAR (não apaga) · [ ] drawers ricos (Conta/Evento/Assinatura/Suporte/Retenção/Segurança/Equipe/Auditoria) · [ ] Auditoria com ator/ação/alvo/IP/request-id/motivo + antes→depois · [ ] tela Equipe existe · [ ] tela Sistema existe · [ ] ações net-new só com comando+capability+auditoria (senão atrás de flag) · [ ] PII mascarada por padrão, revelar auditado · [ ] retenção só-leitura preservada · [ ] tema claro fixo, zero hex · [ ] a11y AA, mobile real · [ ] guards de CI verdes.

## 9. Gates (CLAUDE.md)
Guards de isolamento (cross-evento só via `albora_agregador`/`BYPASSRLS` em leitura, mutação por `SET LOCAL`) e de tokens bloqueantes. Auditoria append-only preservada. Migrations forward-only (telas novas são aditivas; ação net-new que precise de tabela/campo é migration nova, nunca reescrita). Nunca commitar segredo. Nada de rebaixar gate.

---

### Anexos
- `prototipos/console.html` — console completo (10 telas + Sistema, `confirmDanger`, command palette, drawers ricos). **Referência visual; não porte o JS.** Onde ele mostra ação net-new (revogar sessão, bloquear IP, incidente), é intenção de UI — depende do comando correspondente existir.
- Backend: branch `feat/ceo-backoffice`. Autorização em `packages/core/src/authorization/`, comandos em `packages/application/src/**`, auditoria/segurança migration `0060`, staff `0059`, impersonação `0062`.
- `painel.md` / `telao.md` / `kit.md` / `identidade.md` / `REFATORACAO.md` — as outras superfícies do redesign.
