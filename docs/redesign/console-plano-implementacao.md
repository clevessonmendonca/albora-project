# Console do operador — plano de implementação

Branch: `feat/console-redesign` (de `feat/ceo-backoffice` @ 2b87e438). Worktree dedicada
`~/orca/workspaces/albora-project/console-redesign`, Node 22, pnpm 10.32.

Spec: [`console.md`](./console.md). Referência visual: [`prototipos/console.html`](./prototipos/console.html)
(v5, commit `ba458c69`) — extração verbatim em
[`prototipos/_extract-console-shell-overview.md`](./prototipos/_extract-console-shell-overview.md).

## 0. Baseline medido nesta worktree

`pnpm guards` 9/9 · testes do console 25 arquivos / 138 testes verdes.

## 1. Correções ao mapa da spec §3

A spec descreve a branch com um atraso. Confirmado por leitura do código:

| Spec §3/§4 diz | Realidade em `feat/ceo-backoffice` |
|---|---|
| command palette é "puramente UI" a fazer | **já existe** e funciona (`console-search.tsx` + `CommandPalette`, ⌘/Ctrl+K real, `searchConsoleAction`). Falta só o atalho `/`. |
| shell precisa de nav 3 grupos responsivo | **já existe** (`console-nav.tsx`: grupos, `hasCapability`, badge some com zero, rail só-ícone 900–1279px, gaveta + scrim ≤899px) |
| "período por-tela" | hoje há um `<select>` **fixo no header**, decorativo — não filtra nada |

O que falta de verdade no shell: logo, sidebar recolhível, menu de perfil, período que
realmente pertence à tela, item Sistema, canvas de painéis flutuantes.

## 2. Fontes de dado — o que existe, o que é derivado, o que é novo

Auditado em `packages/application/src/**`. Nada de dado inventado.

**Existe pronto:** `getPlatformOverview` (H1 + série + funil da espinha + `openTickets`),
`getPlatformRevenue` (MRR, `overdueCount`, churn≈), `listTicketQueue` (rows com `slaDueAt`,
já ordenado por SLA), `listDsarRequests` (rows com `legalDueAt`), `listRetentionJobs`
(rows com `attempts`/`lastError`, falhados primeiro), `listSubscriptions({status:"overdue"})`,
`listSecurity` + `groupSecurityEvents` (contagem por kind).

**Derivado no server component** (não existe query de contagem; as listas bastam):
SLA estourado, DSAR vencido, jobs de retenção falhados. Comparação contra `now()` sobre
`slaDueAt` / `legalDueAt`; contagem sobre as rows já buscadas.

**Net-new mínimo, sinalizado:**

1. `listLiveEvents` em `packages/application/src/events/` — `listEvents({status:"active"})`
   **não serve**: `status` é ciclo de vida (`draft|active|ended`, setado no publicar), não
   janela de tempo; evento fica `active` dias antes da festa. O predicado real de "ao vivo"
   já existe em `packages/db` (`listOpenEventIdsForSnapshots`: `starts_at <= now AND
   ends_at + 48h > now`), só não é exposto pela camada application. Mesmo padrão de
   `listEvents`: `withPlatformAggregation` + capability `events.read` + auditoria.
2. `funilComercial()` em `@albora/core` — ver §3.

## 3. O funil está trocado hoje

`PlatformOverview.funnel` é a **espinha do convidado**
(`qr_scan → page_open → consent → capture → upload_start → upload_ok`). Isso é o funil de
**uso do evento**, que a spec §4.2 manda viver no **detalhe do Evento**, "não misturado".
A Visão geral deve mostrar o funil **comercial** (aquisição→conversão).

Esse dado existe e já vem buscado: `collectPlatformLiveMetrics` devolve
`productEventsByName`, e `product_events` tem exatamente os cinco degraus do protótipo —
`account_created → event_created → qr_downloaded → checkout_started → checkout_paid`
(Contas → Eventos → QR baixado → Checkout → Pago). Ou seja: **derivação pura, zero SQL novo**.

- `funilComercial(byName)` em `@albora/core` devolve `DegrauDoFunil[]`;
- `maiorPerda()` já existe e calcula a maior queda de verdade;
- a espinha sai da Visão geral (fica disponível no payload para o detalhe do Evento).

> Bug do protótipo, não copiar: ele fixa `worst` em `Pago` (`f[0]==='Pago'`) e escreve
> "Maior perda: Checkout → Pago (−20%)", enquanto a maior queda real dos números dele é
> Contas → Eventos (−28%). A implementação usa `maiorPerda()`.

## 4. H1: a invariante está quebrada no código

Spec exige "mesmo cálculo em toda tela". Hoje `sessoesComUpload / expectedGuests` está
**triplicado**, e divergente:

1. `taxaDeParticipacao` em `@albora/core` (`funnel.ts:234`) — **lança** em denominador zero;
2. `participationRateOrNull` inline em `analytics/platform-overview.ts:28` — devolve `null`;
3. inline de novo em `packages/db/src/platform-analytics.ts:58` (série diária) — devolve `null`.

(2) e (3) não chamam o core. Correção: `taxaDeParticipacaoOuNula` em `@albora/core`, os três
pontos passam a chamá-la. Sem mudar comportamento observável — só remove a divergência.

## 5. Cor de severidade — decisão tomada, aberta a revisão

O protótipo v5 traz `--warn:#A96F18`, `--ok:#28744E`, `--info:#3265B5`. **Não são cor de
marca** — `brand/LEIA-ME.md` (canônico) só define papel, tinta, noite, âmbar `#D46632`,
brasa `#BB3D18`. Inventar verde e âmbar-de-alerta na escala é decisão de identidade, não de
tela, e o CLAUDE.md proíbe hex em componente.

Decisão para esta rodada, dentro dos tokens que existem: crítico = `--critico`,
atenção = `--acento`, "tudo em dia" = neutro + ícone de check. A severidade nunca depende só
da cor — o texto sempre diz. Se o dono quiser a escala de status na marca, é MR no
`packages/tokens` (`marca.ts` + `types.ts` + `escalas.ts` + `outputs.ts`), não um hex solto.

## 6. Ordem de entrega

Uma MR por linha, cada uma com teste, guards verdes.

| # | Escopo | Estado |
|---|---|---|
| 1 | Shell: canvas flutuante, marca, barra recolhível, menu de perfil, período por-tela, atalho `/` | **feito** |
| 2 | Visão geral atenção-primeiro: 3 blocos, tooltip do H1, funil comercial, ao vivo | **feito** |
| 3 | Anatomia v5 nas nove telas; `DataTable` vira a moldura (`.tblwrap`) das seis telas de lista | **feito** |
| 4 | `confirmDanger` compartilhado (motivo + reauth + palavra + linha de auditoria), religando PII / impersonação / plano / cortesia / cancelar / reembolso e Excluir→DSAR | a seguir |
| 5 | Drawers ricos: Conta, Evento, Assinatura, Suporte, Auditoria | |
| 6 | Tela Equipe (`/console/staff` é link morto hoje — o item de nav existe, a página não) | |
| 7 | Tela Sistema (net-new; o item de nav só entra junto com a página) | |
| 8 | Ações net-new (revogar sessão, alterar papel, bloquear IP, abrir incidente) — só com comando + capability + auditoria; até lá, ausentes | |
| 9 | a11y AA e mobile real | |

### Achado que a rodada 3 herdou

`Excluir conta` **não abre DSAR** — `deleteAccountOnRequest` apaga de verdade
(purga linhas e enfileira remoção de objetos no R2). A spec §4.3 assume que
`deleteAccountAction` inicia um pedido reversível; o backend não faz isso. A
UI hoje descreve corretamente o que o comando faz ("irreversível"), então não
há mentira na tela — mas a invariante do CLAUDE.md ("excluir conta abre um
pedido DSAR, nunca apaga direto") **está quebrada no backend**, não na
interface. Religar o botão da tela de Contas para `createDsarRequestAction`
com `kind: "deletion"` e deixar a purga só como execução de um pedido aberto
é trabalho da rodada 4, e é mudança de comportamento — não de UI.

## 8. Ferramenta de conferência visual

`tools/preview/montar.mjs` + `apps/web/features/console/preview-harness.test.tsx`
(atrás de `PREVIEW=1`) renderizam os componentes reais com o CSS realmente
compilado, sem Docker nem Postgres:

```
PREVIEW=1 pnpm vitest run apps/web/features/console/preview-harness.test.tsx
node tools/preview/montar.mjs
```

Foi essa ferramenta que pegou os dois erros que nenhum teste pegaria:
`tipo-den-rotulo` (CAIXA ALTA) usado em frase inteira, e um `fill` de SVG
apontando para variável de tema inexistente, que renderizou preto sólido.

Item de nav só nasce com a página atrás dele: "Sistema" entra na MR 7, não antes.

## 7. Invariantes que esta implementação não pode quebrar

PII mascarada por padrão · Excluir conta abre DSAR · irreversível pede step-up com motivo
coletado antes · auditoria append-only, nunca editável na UI · retenção só-leitura ·
tema claro fixo, zero hex em componente · cross-evento só leitura por `withPlatformAggregation`
(`albora_agregador`/`BYPASSRLS`), mutação por `getPool()` + `SET LOCAL app.event_id` ·
H1 com o mesmo cálculo em toda tela.
