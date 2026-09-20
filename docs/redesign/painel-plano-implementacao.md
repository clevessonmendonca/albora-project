# Painel do anfitrião — plano de implementação

Branch: `feat/painel-anfitriao-prototipo` (de `stable` @ PR #80 mergeada). Worktree dedicada
`~/orca/workspaces/albora-project/painel-fiel`, Node 22, pnpm.

Spec: [`painel.md`](./painel.md). Referência visual: [`prototipos/painel-anfitriao.html`](./prototipos/painel-anfitriao.html).
Fluxos que o painel **lança** (não re-especifica): [`telao.md`](./telao.md), [`kit.md`](./kit.md),
[`identidade.md`](./identidade.md), [`prototipos/posevento.html`](./prototipos/posevento.html),
[`prototipos/fotos.html`](./prototipos/fotos.html), [`prototipos/convidados.html`](./prototipos/convidados.html).

## 0. Baseline medido nesta worktree

`pnpm guards` 9/9 · `tsc --noEmit` limpo (`@albora/web` e `@albora/db`) · 84 testes de
`features/admin` + `moderation-event` verdes · verificado no navegador em desktop e mobile
(fases **antes** e **hoje**).

## 1. Correções ao mapa da spec §3

A spec §3 descreve o código anterior à PR #81. Confirmado por leitura:

| Spec §3 diz | Realidade nesta branch |
|---|---|
| Home = `LiveSummary`+`EventControls`+`PreEventPromo`+`EventTeamPanel` | **já não**: Home é `EventHome` por fase; `PreEventPromo` e `EventNav` foram **removidos** (sem uso) |
| `EventPageLayout` + `AdminShell` + `EventNav` (11 abas) | **já não**: variante `nav="primary"` (sidebar desktop + bottom-bar mobile, 4 abas) e `nav="detail"` (back "← Evento") |
| "Não há `eventPhase` unificado" | **já existe**: `features/admin/data/load-home-state.ts` deriva 8 fases (`recem`, `distante`, `aproximando`, `semana`, `vespera`, `hoje`, `aovivo`, `depois`) |
| checklist só em `localStorage`, sem backend | **parcial**: os 6 essenciais da Home vêm de estado real; migration `0074` guarda os marcos sem sinal próprio **no evento**. O checklist operacional de `/pre-event` segue em `localStorage` (correto: é runbook do dia, não estado do evento) |
| "sem toast compartilhado" | `ToastContainer`/`showToast` **existem** em `@albora/ui-web`; o admin é que não usa |
| hub Evento a fazer | **já existe**: rota `/evento` + `event-hub.tsx` (Experiência · Na festa · Segurança) |

**Descoberta que muda o plano da nova rodada:** `@albora/ui-web` já exporta, com testes,
`Dialog`, `ConfirmDialog`, `DangerDialog`, `BottomSheet`, `ToastContainer`, `Notice`,
`Skeleton`, `EmptyState`, `DataTable`, `FilterBar`, `MetricCard`, `PageHeader`, `StatusBadge`,
`ProgressBar`, `AnimatedCounter`, `Chart`, `CommandPalette`, `LiveAnnouncer`, `SkipLink`.
O admin usa quase nada disso — mantém `adminClasses` (strings de botão próprias) e classes
soltas. **Não falta Design System: falta adoção.**

## 2. Divergências conscientes

Registradas para não parecerem descuido:

| Decisão | Por quê |
|---|---|
| Admin **claro/editorial**, não o escuro do protótipo | decisão do mantenedor; coerente com o criar-evento já em `stable` e com o DESIGN.md |
| "Semana **da festa**", não "do casamento" | guard de domínio: o núcleo serve 8 packs; linguagem de casamento vem do pack |
| Sem pontos/níveis/badges | um casal, um evento, poucas semanas: gamificação vira pressão artificial. Fica **progresso + marcos** |
| Sem "fotos nos últimos 15 min" | não existe métrica de janela de tempo no produto; não inventar número |
| Marcos gravados só pela **ação real** (salvar identidade, baixar QR, abrir prévia) | visitar a tela não é ter feito; senão o progresso mente |

## 3. Etapas

Ordem alinhada à spec §7, com as etapas já concluídas marcadas.

- [x] **1. Ciclo de vida** — fase derivada de datas + `status`. **Pendente**: escrever `status='ended'` ao passar de `ends_at` (gap da spec §3 ainda aberto; hoje a UI trata por data, o banco não).
- [x] **2. Home por fase** com "uma coisa agora", progresso real e prévia do convidado.
- [x] **3. Shell 4-nav + hub por intenção.** **Pendente**: incluir **Música** (Experiência) e **gate da interação** (Na festa); seletor multi-evento no topo.
- [x] **4. Adoção do Design System** — `adminClasses` virou alias de `buttonVariants` (55 usos em 23 arquivos servidos pelo DS sem serem tocados); classes de botão à mão caíram de 19 para 4; `SavedBadge` substituiu o mesmo selo copiado em 4 editores; upload usa `ProgressBar`. Ganhos no DS: variante `danger` (faltava, com botões destrutivos já em uso), `no-underline` na base e `buttonVariants` exportado para `<a>`/`<Link>`.
  - **Lacunas do DS registradas**: não há variante *flutuante opaca* (botão "Ver prévia" do wizard) nem *texto discreto* (o "Voltar" do wizard). Ficaram com classe local de propósito — inventar variante para dois casos é pior. Decidir se viram variante quando aparecer o terceiro caso.
- [ ] **5. Controles perigosos protegidos** — "pausar tudo", "há menores" e modo endurecido passam por `ConfirmDialog`/`DangerDialog`; quebrar o monólito `EventControls` por contexto. Critério: nenhum switch destrutivo sem confirmação; papéis couple-only gateados.
- [ ] **6. Estados de borda** (spec §6) — rascunho, sem convidados, participação abaixo da meta, fila com denúncia, gate aberto/fechado, plano free, planner sem permissão, offline. Critério: toda tela do evento com vazio/carregando/erro.
- [ ] **7. Fotos/Moderação** — uma tela, abas Todas · Revisar · Destaques; **Destacar** é net-new. Spec fechada em `prototipos/fotos.html`.
- [ ] **8. Convidados/Pessoas** — participação + pessoas com dado real; perfil da pessoa. Spec em `prototipos/convidados.html`.
- [ ] **9. Depois + retenção visível** — hero de payoff, "Novas para você", Momentos, Favoritas, Guardar, **timeline de retenção** (não-negociável do CLAUDE.md, hoje só e-mail) e cápsula opt-in. Spec em `prototipos/posevento.html`.
- [ ] **10. Reviver** (net-new) — narrativa em capítulos para tela cheia/telão.
- [ ] **11. Tour de primeiro acesso** — os **6 passos do protótipo** (não inventar), descartável e retomável, progresso em `setup_marks`. Acessível por teclado e leitor de tela.
- [ ] **12. Performance** — code-splitting das telas secundárias, virtualização onde houver lista longa, skeletons sem salto de layout.

## 4. Riscos e decisões pendentes

- **`status='ended'`** precisa de um gatilho (job ou escrita preguiçosa na leitura). Job é mais correto; escrita na leitura é mais barata e suficiente para a UI. **Decisão de produto.**
- **Reviver** e **Cápsula de memória** são features novas com custo alto; podem sair desta PR.
- **Escopo**: existem três painéis (anfitrião, portal do fornecedor, console de staff). Este plano cobre **só o do anfitrião**.
- A migration `0074` é aditiva e forward-only, mas é a primeira mudança de schema desta PR.

## 5. Definition of Done (spec §8)

`[x]` fase derivada de datas · `[ ]` `ended` escrito · `[x]` Home muda por fase, "uma coisa agora" ·
`[x]` 4-nav + hub por intenção · `[ ]` controles perigosos protegidos · `[~]` papéis gateando ações
(existe em `EventControls`, revisar no resto) · `[ ]` retenção visível · `[ ]` Reviver ·
`[ ]` moderação com destacar · `[x]` mobile real · `[x]` zero hex · `[~]` a11y AA (foco e
navegação por teclado a auditar) · `[x]` guards verdes.

## 6. Gates (CLAUDE.md)

Guards de isolamento e de tokens bloqueantes. Migrations forward-only. Testes e `tsc` verdes
antes de cada push. Sem merge sem pedido explícito.
