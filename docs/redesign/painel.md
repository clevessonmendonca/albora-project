# Álbora — Refatoração do Painel do Anfitrião (guia de implementação)

> **Para o agente/dev que vai implementar.** Traduz o redesign do **painel do anfitrião (admin)** — shell + Home por ciclo de vida + telas admin — do protótipo `prototipos/painel-anfitriao.html` para o código atual. Companion de [`REFATORACAO.md`](./REFATORACAO.md), [`telao.md`](./telao.md), [`kit.md`](./kit.md), [`identidade.md`](./identidade.md).

## 0. Como usar

- `prototipos/painel-anfitriao.html` é referência visual/interação. **Não porte o JS.**
- **O painel não re-especifica os fluxos já fechados.** Telão, Kit/QR e Identidade têm docs próprios ([`telao.md`](./telao.md), [`kit.md`](./kit.md), [`identidade.md`](./identidade.md)); o painel **lança** cada um (abre a tela dedicada), nunca embute uma versão paralela/defasada. Onde o protótipo mostrar uma versão antiga desses, ela é só placeholder — a fonte é o doc de cada fluxo.

## 1. A virada de conceito

O admin de hoje é uma **pilha fixa de cards** (`LiveSummary` + `EventControls` + `PreEventPromo` + `EventTeamPanel`) que não sabe em que momento a festa está. O redesign gira em torno de:

1. **Ciclo de vida Antes / Durante / Depois.** A Home muda com a fase e mostra **uma coisa agora**, não um dashboard de KPIs.
2. **O anfitrião também é usuário do feed.** A rede social do casal (feed, stories, lightbox social, perfil, Reviver) é de primeira classe — o anfitrião vive a festa, não só a administra. Ver [ADR 0009](../adr/0009-app-social-do-convidado.md).
3. **Nav enxuta + hub por intenção.** 4 abas (Início · Fotos · Convidados · Evento); o resto agrupa no **hub Evento** por intenção (Experiência / Na festa / Segurança), não uma lista plana de 11 abas.
4. **Controles perigosos são protegidos.** Pânico/pausar tudo, "há menores", modo endurecido pedem confirmação; nada de switch solto.

## 2. Não-negociáveis (CLAUDE.md)

- **Isolamento por evento** em tudo que o painel lê/escreve; papéis (owner/couple/planner) gateiam ações sensíveis.
- **Nunca logar PII crua**; nomes/telefone/e-mail mascarados em log.
- **Retenção é cumprida por job, não por promessa** — mas **precisa ser visível** no painel (contagem até export/delete). Excluir apaga de verdade; memórias automáticas são opt-in.
- **O caminho crítico degrada, nunca falha** — o painel nunca bloqueia a festa; controles ao vivo são otimistas com rollback.
- Zero hex em componente; zero string de domínio no core (o painel é anfitrião, mas segue os guards).

## 3. Código atual (ponto de partida)

> Confirme os caminhos antes de editar (`git grep`).

- **Shell/rotas**: `apps/web/app/admin/page.tsx` (multi-evento), `app/admin/e/[eventId]/page.tsx` (Home = `LiveSummary`+`EventControls`+`PreEventPromo`+`EventTeamPanel`), `features/admin/components/server/event-page-layout.tsx` (`EventPageLayout` + `AdminShell` + `EventNav`), `event-nav.tsx` (abas: ao-vivo, pre-event, moderation | guests, album, insights | missions, identity, guestbook, qrcode, consent).
- **Estado do evento (o gap)**: coluna `status` (`draft|active|ended`) em `packages/db/src/moderation-event.ts` — **`ended` nunca é escrito** hoje; badge vivo/agendado/encerrado é derivado só na listagem `/admin` por data (`admin/page.tsx` `statusDoEvento`); countdown só dentro do checklist (`pre-event-promo.tsx`). **Não há `eventPhase` unificado.** Datas: `starts_at`/`ends_at`. Gate social: `interacaoAbreEm` (`packages/core/src/interacao.ts`).
- **Dados ao vivo**: `LiveSummary` (`features/admin/components/client/live-summary.tsx`, poll 30s `GET /api/admin/events/{id}`): participação %, meta 40% (`decideThesis`), `sessoesComUpload/expectedGuests`, `totalFotos`, `filaRevisao`, "chegando agora". Query: `lib/application/use-cases/admin/get-guest-metrics.ts`.
- **Ações (Home)**: `event-controls.tsx` (`PATCH /api/admin/events/{id}`): publicar (draft→active), pausar/retomar telão (`panico`), "há menores", modo endurecido, abrir/agendar/fechar interação, links moderação/convidados, suporte, assinar Completo (`POST /api/billing/checkout`), música, peças/QR, copiar links (convidado/WhatsApp/telão), equipe.
- **Moderação**: `moderation-page.tsx` — `ReviewQueue` (liberar/ocultar/remover, contador de denúncias), `CommentModeration`. Álbum: `host-album.tsx` (grade, **ocultar**; sem "destacar"), export/livro.
- **Convidados/equipe**: `guests/page.tsx` → `GuestFunnel`; `EventTeamPanel` (`GET/POST /api/admin/events/{id}/members`, papéis `owner|couple|planner`, `roleForAccountOnEvent`, `canManageCoupleOnly`).
- **Checklist**: `features/admin/lib/pre-event-checklist.ts` (7 dias antes / Dia D; `localStorage`, sem backend). Usado em `pre-event-promo.tsx` (Home) e `/pre-event`.
- **Pós/retenção**: `HostExport` (ZIP com step-up), `HostDriveExport`, livro PDF (`GET /api/admin/events/{id}/book/pdf`) — todos em `/album`. Retenção `process-retention-jobs.ts` (cron `plus_48h`/`d330_drive`/`d358_warn`/`d365_delete`) — **só e-mail, sem UI**. **Reviver não existe** no código.
- **Sem tour/onboarding, sem toast compartilhado** (só um ad-hoc em `live-summary.tsx`).

## 4. Alvo por tela

### 4.1 Shell
- 4 abas: **Início · Fotos · Convidados · Evento**. O **hub Evento** agrupa por intenção: **Experiência** (Identidade, Missões, Recado, Música), **Na festa** (Telão, Kit/QR, gate da interação), **Segurança** (Moderação, Consentimento, "há menores", equipe, privacidade). Cada item **lança o fluxo fechado** correspondente quando existe.
- Seletor de evento (multi-evento) no topo; papel do usuário respeitado (planner não vê ações couple-only).
- **Tour** de primeiro acesso (descartável, some pra sempre) + **toast/autosave** compartilhado (hoje inexistente).

### 4.2 Home por ciclo de vida (o coração)
Derivar a fase de `starts_at`/`ends_at` (+ `status`), e **escrever `status='ended'`** quando passar de `ends_at` (fechar o gap). Cada fase prioriza:
- **Antes**: contagem regressiva + **uma coisa agora** (próximo passo do checklist: testar telão / imprimir kit / gravar recado) + "Ver como convidado" + checklist compacto + hub de ajustes. Métricas ao vivo escondidas (vazias).
- **Durante**: pulso ao vivo (participação vs meta 40%, convidados com foto, fotos, "chegando agora") + **alerta priorizado** (fila de moderação, ou "abrir interação" pós-cerimônia) + **controles rápidos** (telão, interação, missão no telão, pânico protegido) + "olha ali no telão".
- **Depois**: "a festa acabou" + **entregar pro casal** (ZIP/Drive/livro) + **Reviver** (net-new) + **retenção visível** (guardado até dia 330/365, "baixar agora", aviso antes de apagar) + memórias opt-in.

### 4.3 Telas admin (as sub-telas do painel)
- **Fotos / Álbum + Moderação** — **spec detalhada em `prototipos/fotos.html`** (rodada fechada). Resumo: uma tela só, **álbum vivo que o anfitrião cura primeiro, moderação em segundo plano**. Abas **Todas · Revisar · Destaques** (comentários denunciados entram **dentro de Revisar** com filtro Fotos·Comentários — não são aba própria). **Destacar** é a peça net-new (curadoria positiva): um sinal global que **prioriza a foto no telão, no Reviver e na criação do álbum** (não é "vira capa"). Lightbox: **★ Destacar + Ver pessoa** primários; Ocultar/Remover no **•••** (remover é destrutivo, avisa quem enviou). **Modo de revisão** é uma **escolha de comportamento** ("Como as fotos entram no álbum?" — Aparecem na hora / Eu aprovo antes), não um toggle técnico. Denúncias na miniatura e no lightbox; **Desfazer** no ocultar; seleção em lote (remover com confirmação forte). Descoberta leve em Todas (buscar + Momentos·Pessoas·Mais recentes), sem IA. "Ver pessoa" liga com **Convidados/Pessoas**.
- **Convidados / Pessoas** — **spec detalhada em `prototipos/convidados.html`** (rodada fechada). Menos CRM (o convidado não tem conta): duas facetas — **Participação** (o número que decide o negócio: % vs meta 40% + funil Esperados→Entraram→Com foto) e **Pessoas** (quem participou, por avatar + primeiro nome + nº de fotos + hora de entrada, ordenável). **Descobertas** só com dado real (quem mais registrou, primeira foto, ficou até o fim). **Perfil da pessoa** é o destino de "Ver pessoa" (da Fotos): header + grade de tudo que ela registrou (★ nos destaques). Sem telefone/e-mail — identidade é foto + primeiro nome.
- **Evento (hub)**: lança Identidade / Missões (config) / Recado (gravar) / Música / Telão / Kit·QR / Consentimento / Equipe / Privacidade.
- **Reviver** (net-new): narrativa em capítulos ("a festa pelos olhos de todos") pra tela cheia / telão pós-evento.
- **Equipe**: cards de membros, convite por e-mail, papéis couple/planner (existe) — ações couple-only gateadas.

## 5. Copy (pt-BR)
"Uma coisa agora" · "Ver como convidado" · "Olha ali no telão ✨" · "A festa acabou 🤍" · "Entregue as fotos pro casal" · "Reviver — a festa pelos olhos de todos" · "Suas fotos ficam guardadas até {data}. A gente avisa antes de apagar." · "Pausar tudo" (protegido) · "Abrir interação" · checklist "7 dias antes"/"Dia D" (reusar os textos do código).

## 6. Estados de borda
Evento em rascunho (empurra publicar), sem convidados ainda, participação abaixo da meta (nudge sem alarme), fila de moderação com denúncia (alerta), gate fechado vs aberto, plano free (gate de Completo sem travar a festa), planner sem permissão couple-only, evento encerrado (muda a Home pra "Depois"), retenção próxima do prazo (aviso no painel), offline (painel degrada, controles com rollback).

## 7. Ordem de implementação sugerida
1. **Modelo de ciclo de vida**: derivar fase de datas + escrever `status='ended'`; um `eventPhase` único que a Home consome.
2. **Home por fase** (Antes/Durante/Depois) sobre `LiveSummary`+`EventControls` atuais, com "uma coisa agora".
3. **Shell 4-nav + hub Evento por intenção**, lançando os fluxos fechados.
4. **Fotos/Moderação** (adicionar "destacar"; reusar ReviewQueue/álbum).
5. **Convidados** (funil + pessoas com dado real).
6. **Depois/entrega + retenção visível** (UI sobre export/Drive/livro + os jobs de retenção) + **Reviver** (net-new).
7. Tour + toast/autosave compartilhado.
8. Estados de borda.

## 8. Definition of Done
[ ] fase derivada de datas, `ended` escrito · [ ] Home muda por fase, "uma coisa agora" · [ ] 4-nav + hub por intenção lançando fluxos fechados · [ ] controles perigosos protegidos (confirmação) · [ ] papéis (couple/planner) gateando ações · [ ] retenção visível no painel · [ ] Reviver · [ ] moderação com destacar · [ ] mobile real (anfitrião usa no celular na festa) · [ ] zero hex · [ ] a11y AA · [ ] guards de CI verdes.

## 9. Gates (CLAUDE.md)
Guards de isolamento e de tokens bloqueantes. Migrations forward-only (novo campo/derivação de fase é aditivo). Nunca commitar segredo. Nada de rebaixar gate.

---

### Anexos
- `prototipos/painel-anfitriao.html` — painel completo (Home por fase, feed/stories/lightbox, Reviver, hub Evento, equipe, tour, controles).
- `telao.md` / `kit.md` / `identidade.md` / `REFATORACAO.md` — fluxos que o painel **lança**.
