# Inventário A — Painel do anfitrião

Base: worktree `merganser`, branch `feat/telao-conectar-por-link` (leitura do código em 2026-10-24). Escopo: `apps/web/app/admin/**` (exceto `admin/vendor/**`), `apps/web/features/admin/**` e o que essas telas puxam (wall-pair, wall-link, wall-display no que toca o anfitrião). Tudo abaixo foi lido no código; o que não foi lido ou não pôde ser confirmado está marcado **não verificado**. Os dois documentos de contexto (`inv-repo.md`, `matriz-de-funcionalidades.md`) foram cruzados com o código; divergências estão na seção final.

Convenção: cada funcionalidade tem um ID (`INI-01`, `FOT-03`…) para o redesign poder citar. "Papel" = `owner | couple | planner` (`loadEventPage` → `canManageCoupleOnly = owner || couple`). "Fase" = `FaseDoEvento` de `load-home-state.ts` (`recem, distante, aproximando, semana, vespera, hoje, aovivo, depois`) mais `status` (`draft | active | ended`).

---

## 1. Tabela-resumo de telas

| # | Rota | Arquivo da rota | Nome na navegação | Título (h1) na tela | Shell | Estado |
|---|---|---|---|---|---|---|
| 1 | `/admin` | `app/admin/page.tsx` | — | "Seu painel" | AdminShell simples (sem rail) | ativa |
| 2 | `/admin/sign-in` | `app/admin/sign-in/page.tsx` | — | "Entrar no painel" / "Verifique seu e-mail" / "Confirmar acesso" | tela cheia própria | ativa |
| 3 | `/admin/new` | `app/admin/new/page.tsx` | — | wizard 5 etapas + tela "Pronto" | tela própria | ativa |
| 4 | `/admin/billing` | `app/admin/billing/page.tsx` | — (nenhum link na UI) | "Cobranças" | AdminShell simples | ativa, órfã |
| 5 | `/admin/e/[id]` | `.../[eventId]/page.tsx` | Início | nome do evento (herói) | primary (rail/bottom-bar) | ativa |
| 6 | `/admin/e/[id]/ao-vivo` | `.../ao-vivo/page.tsx` | Ao vivo | "Dia do evento" + headline "O dia acontece. Você acompanha." | primary | ativa |
| 7 | `/admin/e/[id]/album` | `.../album/page.tsx` | Fotos | "Álbum" + headline "Uma história contada por muitas pessoas." | primary | ativa (absorve moderação) |
| 8 | `/admin/e/[id]/guests` | `.../guests/page.tsx` | Convidados | "Convidados" + headline "As memórias são feitas juntos." | primary | ativa (absorve insights) |
| 9 | `/admin/e/[id]/comunidade` | `.../comunidade/page.tsx` | Comunidade | "Comunidade" | primary | ativa, dados de conta |
| 10 | `/admin/e/[id]/comunidade/[postId]` | `.../comunidade/[postId]/page.tsx` | Comunidade | "Comunidade" (thread) | primary | ativa |
| 11 | `/admin/e/[id]/inspiracao` | `.../inspiracao/page.tsx` | Inspiração | "Inspiração" | primary | ativa, sem conteúdo semente |
| 12 | `/admin/e/[id]/identity` | `.../identity/page.tsx` | Experiência | "Identidade" (subtítulo `/slug · Identidade`) | **detail** (sem rail) | ativa |
| 13 | `/admin/e/[id]/missions` | `.../missions/page.tsx` | (absorvida por Experiência) | "Missões" | detail | ativa |
| 14 | `/admin/e/[id]/guestbook` | `.../guestbook/page.tsx` | (absorvida por Experiência) | "Recado" | detail | ativa |
| 15 | `/admin/e/[id]/qrcode` | `.../qrcode/page.tsx` | Compartilhar | "QR Code" + headline "Um convite. Todos os olhares." | **detail** (sem rail) | ativa |
| 16 | `/admin/e/[id]/evento` | `.../evento/page.tsx` | Ajustes | "Evento" | primary | ativa |
| 17 | `/admin/e/[id]/consent` | `.../consent/page.tsx` | (absorvida por Ajustes) | "Consentimento" | detail | ativa |
| 18 | `/admin/e/[id]/team` | `.../team/page.tsx` | (absorvida por Ajustes) | "Equipe" | detail | ativa; vazia para `planner` |
| 19 | `/admin/e/[id]/pre-event` | `.../pre-event/page.tsx` | (absorvida por Início) | "Pré-evento" | detail | ativa, só alcançável pelo hub de Ajustes |
| 20 | `/admin/e/[id]/insights` | `.../insights/page.tsx` | (absorvida por Convidados) | "Insights" | detail | ativa, **sem nenhum link na UI do anfitrião** (só no portal do fornecedor) |
| 21 | `/admin/e/[id]/moderation` | `.../moderation/page.tsx` | (absorvida por Fotos) | — | — | **redirect** → `/album?aba=revisar` |
| 22 | `/admin/error` | `app/admin/error.tsx` | — | "Erro no painel" | tela cheia | boundary |
| 23 | `/admin/loading` | `app/admin/loading.tsx` | — | spinner | tela cheia | boundary |
| 24 | `/admin/not-found` | `app/admin/not-found.tsx` | — | "Página não encontrada" | tela cheia | boundary |
| 25 | `/wall-display` | `app/wall-display/page.tsx` | (link "Abrir telão") | tela da TV, fora do shell | fora do painel | ativa (não auditada a fundo) |
| 26 | `/wall-pair` | `app/wall-pair/page.tsx` | — | "Ligar o telão" / "Telão ligado" | fora do painel | ativa |
| 27 | `/wall-link` | `app/wall-link/page.tsx` (cliente `wall-link-client.tsx`) | — | "Conectando o telão…" / "Este link não vale mais" | fora do painel | ativa, nova (branch atual) |

Totais: 21 `page.tsx` + 3 boundaries em `app/admin` (24 arquivos, confere com `find`), mais 3 superfícies do telão tocadas pelo anfitrião = **27 telas/estados**. Menu: 9 destinos de navegação (`navegacao.ts`) em 3 grupos; 8 rotas "detail" sem rail; 1 redirect; 1 rota órfã (`/billing`).

---

## 2. Navegação, shell, menus (transversal à seção 3)

### 2.1 `features/admin/lib/navegacao.ts`
- 9 destinos (`DESTINOS`): ao-vivo `/ao-vivo`; inicio `""` (absorve `/pre-event`); fotos `/album` (absorve `/moderation`); convidados `/guests` (absorve `/insights`); experiencia `/identity` (absorve `/missions`, `/guestbook`); compartilhar `/qrcode`; comunidade `/comunidade`; inspiracao `/inspiracao`; ajustes `/evento` (absorve `/consent`, `/team`).
- `GRUPOS_DE_DESTINO` (rail desktop): **Seu evento** = Início, Ao vivo, Fotos, Convidados; **Descobrir** = Comunidade, Inspiração; **Personalização** = Experiência, Compartilhar, Ajustes.
- `destinoAtivo(pathname, base)` marca o destino ativo, inclusive nas rotas absorvidas. Só tem efeito nas telas `nav="primary"`: as rotas absorvidas e duas das próprias (Experiência, Compartilhar) renderizam em shell "detail" sem rail, onde o destaque nunca é exibido (ver problema P-02).

### 2.2 Shell "primary" (`event-page-layout.tsx` com `nav="primary"`)
- `SkipLink`, `<style>` anti-flash de tema, `<main id=main-content>` com classe de tema do painel e `data-tema` do cookie.
- Cabeçalho da página: migalha "{nome do evento} / {seção}" **só ≥lg**; `h1` = `section`; no mobile, legenda "{nome} · {contagem}"; à direita `MenuDaConta` (engrenagem).
- Rail lateral (`event-sidebar.tsx`, ≥lg, sticky 100dvh): logo `LogoAlbora`; bloco do evento (iniciais, nome truncado, rótulo de contagem: "Faltam N dias" / "É amanhã" / "É hoje" / "Acontecendo agora" / "Evento encerrado"); grupos de navegação (rótulo em versalete, ícone Lucide + texto, `aria-current`); bloco de conta (inicial, e-mail truncado, rótulo do plano: "Plano Essencial" / "Plano Completo" / "Pelo fornecedor"); botão Recolher/Expandir (largura 4,5rem só ícones; preferência em cookie `RAIL_COOKIE`, `title` e `aria-label` no modo recolhido). O `aside` recebe `style={adminVars("dark")}` inline (ver problema P-14).
- Bottom-bar (`app-nav.tsx`, <lg, fixa): Início, Ao vivo, Fotos, Convidados + botão "Mais" que abre `BottomSheet` "Mais do evento" com Experiência, Compartilhar, Comunidade, Inspiração, Ajustes (nessa ordem, derivada da ordem de `DESTINOS`).
- `ModerationCountProvider` envolve o conteúdo, mas só escreve contagem (LiveSummary, ReviewQueue); **nenhum componente lê** `count` (não há badge de pendências no rail nem na bottom-bar). Verificado por grep.
- `CoupleFollowMode`: se `allowFollowMode` (só a Home) e papel === `couple`, a Home é substituída por um resumo "Acompanhar" (ver 3.5).

### 2.3 Shell "detail" (`event-page-layout.tsx` com `nav="detail"` → `AdminShell`)
- Coluna centrada, padding fluido, **sem rail e sem bottom-bar**; link "← Evento" apontando para `/admin/e/{id}/evento` (Ajustes), `h1` = nome do evento, subtítulo `/slug · Seção`; `MenuDaConta`.
- Usado por: identity, qrcode, missions, guestbook, consent, team, pre-event, insights.

### 2.4 Shell simples (`admin-shell-root.tsx`, `AdminShell` sem `email`)
- Usado por `/admin` e `/admin/billing`. Cabeçalho com `back` opcional, `h1`, subtítulo e **`SignOutButton`** ("Sair", um clique, sem confirmação), em vez de `MenuDaConta`. Nessas telas não há tema (claro/escuro/sistema) nem Ajuda.

### 2.5 Menu da conta (`menu-da-conta.tsx`, só nas telas de evento)
- Botão engrenagem (`aria-label="Conta e configurações"`) → `BottomSheet` "Conta e configurações" com: avatar + "Conectado como {e-mail}"; **Aparência** (`TemaDoPainelToggle`: rádio Claro / Escuro / Sistema, grava cookie); **Ajuda** (`AjudaDoPainel`: botão "Ajuda" abre outro `BottomSheet` "O que cada palavra quer dizer" com glossário de 7 termos: Moderação, Consentimento, Telão, Missões, Gate de interação, Modo endurecido, Retenção); **Sessão** → "Sair desta conta" → `ConfirmDialog` ("Para voltar você precisa de um novo link de acesso, enviado por e-mail.") → `POST /api/admin/sair` e `window.location.assign("/admin/sign-in")`.
- Dois sheets empilhados (conta → ajuda) para chegar ao glossário.

### 2.6 Command palette, atalhos globais
- `CommandPalette` existe em `packages/ui-web/src/command-palette.tsx` mas **só é usada no console interno** (`features/console/.../console-search.tsx`). O painel do anfitrião não tem paleta de comandos nem busca global (verificado por grep).
- Atalhos de teclado no painel: wizard (Enter/Backspace/Esc/1..9); tour de primeiro acesso (setas ←/→); Reviver (←, →, Espaço); Missões (Enter confirma/adiciona, Esc cancela edição). **Nenhum atalho global de navegação.** A moderação não tem atalho A/R (matriz marca como decisão de produto em aberto).

### 2.7 Estados globais
- `error.tsx`: "Erro no painel", "Tentar de novo" (reset), "Ir ao painel". `not-found.tsx`: "Este evento não existe ou você não tem acesso a ele." + "Ir ao painel". `loading.tsx`: spinner em tela cheia. Os três usam `adminVars()` sem identidade do evento e sem shell.
- `loadEventPage`: sem sessão → redirect `/admin/sign-in` (sem `next` — o caminho de volta se perde; a tela `/admin/new` e `/admin/billing` preservam `next`, as telas de evento não); sem papel/evento → `notFound()`.

---

## 3. Telas, uma a uma

### 3.1 `/admin` — lista de eventos (`app/admin/page.tsx`)
**Propósito.** Porta da conta: lista os eventos do anfitrião e leva à criação.
**Dados.** `listarEventosDoHost` → por evento: `eventoId, slug, packId, comecaEm, terminaEm`. **Não carrega `title`**: o nome mostrado é `slugParaNome(slug)` (troca "-" por espaço e capitaliza), diferente do nome usado dentro do painel (`adminEventDisplayName`: título ou nome do pack).
**Funcionalidades.**
- `LST-01` Estado vazio: três barras de acento, "Bem-vindo ao Albora", texto "em três minutos", botão "Criar meu primeiro evento" → `/admin/new`.
- `LST-02` Contador "N eventos" + botão "+ Novo evento" → `/admin/new`.
- `LST-03` Cartão de evento (link inteiro) → `/admin/e/{id}`: nome-do-slug, "{tipo do pack} · {data curta, ano só se ≠ atual}", badge de status: "ao vivo" (pulsante), "agendado", "encerrado" (derivado de `comecaEm/terminaEm` vs agora; ignora o `status` draft/active/ended).
- `LST-04` Sugestão de segundo evento: se algum evento ativo/futuro tem pack com `sugereAntes` e a conta ainda não tem evento desse pack, mostra cartão com título/lede/CTA do pack sugerido → `/admin/new` (não carrega o pack na URL; **não verificado** se o CTA muda o tipo pré-selecionado, a URL é só `/admin/new`).
- `LST-05` Rodapé: "Cerimonialista ou espaço de festas? Crie o portal do fornecedor" → `/admin/vendor/new`.
- `LST-06` `SignOutButton` "Sair" no cabeçalho (sem confirmação).
**Ordenação/filtro/busca.** Nenhum (ordem vem do banco; não verificado qual).
**Estados.** vazio; lista; sem estado de erro/carregamento próprio (server component; usa `loading.tsx`). Sem sessão → `redirect("/admin/sign-in")` (sem `next`).
**APIs.** Nenhuma (consulta direta no servidor).
**Componentes.** `AdminShell`, `AdminSection`, `adminClasses`, `Badge`.
**Problemas.** Nome do evento ≠ nome no painel (P-08). Sem cobranças, ajuda, tema ou perfil acessíveis daqui (`/admin/billing` sem link). Sem arquivo/duplicar/excluir evento (grep: nenhuma ocorrência de excluir/arquivar/duplicar no painel).

### 3.2 `/admin/sign-in` (`sign-in/page.tsx` + `sign-in-form.tsx`)
**Propósito.** Entrada sem senha por link mágico ou Google.
**Funcionalidades.**
- `ENT-01` Pedir link: campo "Seu e-mail" (regex simples, botão desabilitado se inválido), "Enviar link" → `POST /api/admin/entrar` `{email, next?}`; preserva `next` (só caminhos `/admin…`, bloqueia `//`, `://`, `\`).
- `ENT-02` Estado "Verifique seu e-mail" ("Se houver uma conta associada…"), botão "Reenviar ou trocar e-mail"; em dev mostra link "Abrir link (dev)" (quando a API devolve `link`).
- `ENT-03` "Entrar com Google" → `/auth/google/start?surface=host[&returnTo=next]`.
- `ENT-04` Confirmar acesso (quando `?m=token`): botão "Entrar no painel" → `POST /api/admin/sessao {token}` → redireciona a `next` ou `/admin` (token só é gasto no clique, para o prefetch do e-mail não consumi-lo).
- `ENT-05` Erro de link: "Este link está inválido ou expirou. Solicite um novo link."; erro de envio: "Não conseguimos enviar agora…".
**Estados.** editing, sending, sent, error; ready, signingIn, error. Fallback Suspense "Carregando…".
**Problemas.** Conta nova e conta existente usam o mesmo fluxo (criação implícita); copy "Se houver uma conta associada" não explica que a conta é criada ao confirmar (**não verificado** no handler).

### 3.3 `/admin/new` — criar evento (`new/page.tsx` + `create-event-wizard.tsx`, 877 linhas + `onboarding/*`)
**Propósito.** Wizard de 5 etapas + tela "Pronto". Sem sessão → redireciona a sign-in preservando `plano`, `nome`, `vendor`, `vendorSlug`, `vendorPlan` (mesmo alvo de `next`).
**Casca.** `ProgressHeader`, `StepRail` clicável, rodapé fixo `NavBar` (voltar/avançar; na revisão o botão cria), logo link `/admin` (aria-label "Álbora — início"), `LivePreview` do convidado (coluna lateral sticky no desktop; no mobile botão "Ver prévia" abre modal).
**Atalhos.** Enter avança; Backspace/Esc volta (fora de campo); 1..9 escolhe tipo (etapa 0) ou estilo (etapa 2).
**Funcionalidades.**
- `NEW-01` Etapa 1 "Tipo de evento": cards de `packsDeCriacao()` (casamento, aniversário, formatura, corporativo, celebração, outro) com ícone, foto, textos `evento.preparo`/`evento.posse`; padrão = primeiro; trocar tipo zera missões desligadas; link "editar missões" abre `MissionSheet`.
- `NEW-02` Etapa 2 "Detalhes": Nome (obrigatório, máx. 60, contador), Data e hora (`datetime-field`; data obrigatória; hora opcional, sem hora = 18:00), Convidados esperados (1–999, opcional), Local (texto até 80) + campo CEP que preenche o local via **ViaCEP chamado direto do navegador** (degrada sem bloquear).
- `NEW-03` Se a conta tem fornecedores (`GET /api/admin/vendors`): select "Criar sob" (Minha conta | fornecedor) e e-mail obrigatório de quem recebe o painel; validação `EMAIL_RE`; erros só após a primeira tentativa (`showErrors`, `aria-invalid`, `role=alert`).
- `NEW-04` Fuso e idioma detectados por `Intl` (padrão `America/Sao_Paulo`), **não editáveis aqui**.
- `NEW-05` Etapa 3 "Identidade": botão de capa (upload; `paletteFromImage` sugere cores), 5 estilos (editorial, minimal, contemporâneo, fotográfico, classic), par de cores `cor`/`cor2` com 6 combos + sugeridas + personalizada, `CapaFocoField` (enquadramento vertical/horizontal 25/50/75).
- `NEW-06` Etapa 4 "Participação": missões do pack (todas ligadas por padrão) + livres; botão "Escolher missões" → `MissionSheet`.
- `NEW-07` Etapa 5 "Revisão": lista Tipo, Nome, Data e hora, Identidade, Participação, cada uma com "editar" que volta à etapa; nota "Depois de criar, você pode compartilhar o link…".
- `NEW-08` Criar: `POST /api/admin/events` (`packId, title, comecaEm, terminaEm = +6h, timezone, expectedGuests, identityTokens, missoes, telaoModelos, vendorId?, coupleEmail?`); 422/403/429 tratados; erro: "Não deu para criar agora. Confira os dados e tente de novo."; missões livres via `PUT /api/admin/events/{id}/challenges` (best effort).
- `NEW-09` Tela "Pronto" (`ReadyStep`): herói "{título} está pronto." + data; ações "Ir para meu evento" → `/admin/e/{id}`, "Ver como convidado" (`eventEntryUrl`), "Compartilhar" (link WhatsApp), upload silencioso da capa (`CoverImageEditor compact`: `POST/…/cover-image` + `confirm`); `AccessEmailStep` opcional (flag `delayedAuth`); se veio de fornecedor "Abrir portal do fornecedor"; se `plano=celebration` "Ativar o Completo, R$ 199" (`POST /api/billing/checkout`; em stub chama `/api/billing/simulate` e vai a `/admin/e/{id}?pago=1`); atalhos "Configure quando quiser": Missões, Telão (`/identity`), QR, Equipe.
**Estados.** validação por etapa; criando; erro de API; sucesso. Rascunho **não** persiste entre recargas (matriz: "Depois").
**Observações do código vs. inventário.** `ReadyStep` foi descrito em `inv-repo.md` sem QR inline; a matriz diz "QR inline Existe (#109)" — **não verificado** (não reli o `ReadyStep`, só as etapas; a divergência está registrada na seção 6).
**APIs.** `/api/admin/vendors`, `/api/admin/events` (POST), `/api/admin/events/{id}/challenges` (PUT), `/api/admin/events/{id}/cover-image` (+`confirm`), `/api/billing/checkout`, `/api/billing/simulate` (dev), ViaCEP (externo).
**Componentes.** `type-step`, `details-step`, `appearance-step`, `color-field`, `datetime-field`, `live-preview`, `mission-sheet`, `convite-card`, `access-email-step`, `glyph`, `CapaFocoField`, `CoverImageEditor`.

### 3.4 `/admin/billing` — Cobranças (`billing/page.tsx` + `billing-history.tsx`)
**Propósito.** Histórico de pagamentos da conta lido do Asaas ao vivo.
**Funcionalidades.**
- `COB-01` Texto introdutório ("Cada evento pago aparece aqui…").
- `COB-02` Lista: data, forma (Pix/Cartão/Boleto), descrição, valor BRL, badge de status traduzido (Pendente, Confirmada, Recebida, Vencida, Estornada…; tom accent/crítico/neutro), link "Ver fatura" (`invoiceUrl`, nova aba).
**Estados.** carregando (3 skeletons), erro ("Não foi possível carregar…"), vazio ("Nenhuma cobrança ainda"), lista. Sem sessão → redirect sign-in com `next`.
**API.** `GET /api/admin/billing`.
**Problemas.** Rota **órfã**: nenhum link na UI aponta para ela (grep: só o redirect de sign-in). Texto cita "Asaas" (fornecedor interno) ao anfitrião. Sem filtro, paginação, nem vínculo ao evento da cobrança além da descrição.

### 3.5 `/admin/e/[id]` — Início (`page.tsx` → `EventHome`)
**Propósito.** "Assistente do evento, não dashboard" (comentário do código): o conteúdo muda com a fase.
**Dados.** `loadHomeState`: `fase`, `dias`, itens de preparo (capa, identidade, recado, missões, prévia do convidado, QR), `proxima` (um item destacado; ordem muda perto da festa), `payoff` (fotos, pessoas, destacadas, novas desde a última visita, horas) e capítulos do Reviver (só `depois`), marcos de retenção. Falha de leitura de recado/missões **remove o item** em vez de marcá-lo como não feito (símbolo `FALHOU`). Capa real assinada (R2, 900 s) ou foto do pack.
**Funcionalidades (todas as fases).**
- `INI-01` `TourDePrimeiroAcesso` (Dialog, 6 passos: criado, QR, entra sem app, envia foto, telão, depois é só viver; progresso gravado no evento via `POST setup-marks {tour}`; "Continuar"/"Começar"/"Pular"; setas ←/→; foco no título a cada passo; `passoDoTour` decide se abre).
- `INI-02` `HeroDoEvento`: capa em tela cheia + scrim, kicker por fase ("Seu álbum começa aqui", "Sem pressa", "Falta pouco", "Semana da festa", "Quase lá", "É hoje", "Acontecendo agora", "A festa acabou"), nome, "{data · hora} · {local}", cartão opaco à direita com contagem regressiva viva (dias/horas/min/seg, só antes) ou destaque textual ("É amanhã", "Hoje", "Ao vivo", "As memórias ficaram").
- `INI-03` Ações do herói por fase — antes: botão da próxima ação (`proxima.cta`) + "Ver como convidado"; ao vivo: "Abrir o telão" (nova aba `/wall-display`) + "Ver como convidado" + "Copiar link · /e/{slug}"; depois: "Ver o álbum" + "Copiar link". "Copiar link" usa `navigator.share` quando existe, senão clipboard (`CopiarLinkEvento`). "Ver como convidado" marca o preparo `previaConvidado` ao clicar.
- `INI-04` `NumerosDoEvento` (fora de `depois`): 3 cartões-link (fotos no álbum → `/album`, convidados → `/guests`, destacadas → `/album?aba=destaques`); some se fotos==0 e pessoas==0.
- `INI-05` Aviso de rascunho (status draft): "Seus convidados ainda não entram" + "Publicar evento" (âncora `#controle-publicar`).
- `INI-06` "Decidir agora" (`EventControls` filtrado): rascunho → `publicar`; ao vivo/hoje → `interacao`, `telao`, `moderacao`; depois → `entrega`; antes (ativo) → nada.
- `INI-07` Rodapé "Todos os ajustes do evento →" `/evento`.
**Fase antes da festa** (`!aoVivo && !depois`), duas colunas a partir de `xl`:
- `INI-08` `ProximaAcao` ("Vale a pena agora"): item principal com título, "porque" e CTA + até 2 atalhos secundários (os outros pendentes).
- `INI-09` `Preparo` (não aparece em `recem`): barra de progresso "N de 6 essenciais prontos" + lista de 6 itens em duas colunas (feito = riscado; pendente = link); título muda para "Conferência final" em semana/véspera.
- `INI-10` `IdeiasParaSuaFesta`: 3 cartões fixos (missão, personalizar álbum, equipe).
- `INI-11` `AcessoRapido` (Meu QR, Álbum, Telão→`/ao-vivo`), `NoDiaDaFesta` (texto + "Abrir central do evento"), `PreviaDoConvidado` (moldura de celular com capa, nome, data e "Entrar na festa" estático + "Experimentar").
**Fase ao vivo/hoje.**
- `INI-12` `LiveSummary` (ver 3.6) + bloco "Durante a festa": "Revisar fotos" (`/moderation`, que redireciona), "QR das mesas", "Álbum ao vivo".
**Fase depois.**
- `INI-13` `Payoffdepois`: números (fotos, pessoas, favoritas), bloco "N fotos que você ainda não viu" + "Ver o que chegou", `CartaoReviver` (porta do player; só com capítulos), "Momentos da noite" (carrossel de capítulos), cartão "N fotos que vocês destacaram" → `/album?aba=destaques`, "Guardar suas fotos": "Baixar tudo" → `/album` e "Quem esteve lá" → `/guests`.
- `INI-14` `Reviver` (Dialog em tela cheia, player de capítulos): barra de progresso por capítulo, pausar/continuar, anterior/próximo, setas e Espaço, tela final com "Ver todas as fotos", "Ver de novo", "Copiar link".
- `INI-15` `AvisoDeRetencao`: "As fotos são de vocês" com linha do tempo (marcos reais dos jobs ou datas calculadas; dia 330 export, dia 365 apagar), urgência por cor, botão "Baixar tudo agora" → `/album`.
- `INI-16` `CapsulaDeMemoria`: `Switch` "Guardar meus destaques para a lembrança anual" → `PATCH /api/admin/events/{id}/album {acao:"capsula", ligada}`; otimista com rollback e "Não salvou agora".
**Modo "Acompanhar" (papel `couple`).**
- `INI-17` `CoupleFollowMode` substitui a Home inteira por: `Switch` "Ver painel completo" (liga/desliga), cartão destacado (participação %, "N de M convidados", "fotos na festa", frase do veredito), "Chegando agora" (miniaturas) e Atualizar; polling 30 s em `GET /api/admin/events/{id}`. A Home completa só aparece com o switch ligado (padrão desligado). Só o papel `couple` entra nesse modo (owner e planner veem a Home completa).
**Estados.** rascunho / ativo × 8 fases; sem capa (foto do pack); storage fora do ar (capa cai no exemplo); leituras que falham (itens somem); contagem some quando já passou.
**APIs.** server: `loadHomeState` (guestbook, desafios, marcos de retenção, mídia do álbum, R2); client: `POST /api/admin/events/{id}/setup-marks` (tour, marco), `PATCH …/album`, `GET /api/admin/events/{id}` (LiveSummary/Follow), mais as de `EventControls` (3.16).
**Componentes.** `HeroDoEvento`, `ProximaAcao`, `Preparo`, `PreviaDoConvidado`, `AcessoRapido`, `NoDiaDaFesta`, `NumerosDoEvento`, `IdeiasParaSuaFesta`, `Payoffdepois`, `CartaoReviver`, `Reviver`, `AvisoDeRetencao`, `CapsulaDeMemoria`, `ContagemRegressiva`, `LiveSummary`, `EventControls`, `TourDePrimeiroAcesso`, `CopiarLinkEvento`.
**Problemas vistos no código.**
1. O item de preparo "Ver como convidado / Abrir prévia" tem `href: base` (a própria Home): quando é a "próxima ação", o botão primário do herói e o da `ProximaAcao` **recarregam a mesma página** em vez de abrir a prévia (`load-home-state.ts`, `montarItens`).
2. Itens de checklist apontam para âncoras inexistentes na Home antes da festa: `#controle-interacao` e `#controle-menores` (no `/pre-event`) só existem quando `EventControls` renderiza essas seções (interação só ao vivo; proteções só em Ajustes).
3. O mesmo "próximo passo" aparece em quatro lugares: botão do herói, `ProximaAcao`, lista do `Preparo` e `AcessoRapido`/`IdeiasParaSuaFesta` repetem destinos (missões, identidade, equipe, QR).
4. `couple` vê, por padrão, um resumo de participação ("0%", veredito em vermelho "Poucas fotos por enquanto") **antes** da festa — o modo Acompanhar não considera a fase.
5. `Preparo` conta 6 "essenciais", enquanto o `/pre-event` tem 21 itens (11 + 10) e outra métrica (N/total): duas definições de "pronto".
6. A Home é a única tela cujo `h1` é o nome do evento (as demais usam a seção); no modo `couple` (`CoupleFollowMode`) esse herói some.

### 3.6 `/admin/e/[id]/ao-vivo` — Ao vivo (`ao-vivo/page.tsx`)
**Propósito.** "Central operacional" do dia: números, fila de revisão, telão, QR, controles.
**Funcionalidades.**
- `AOV-01` Cabeçalho: headline "O dia acontece. Você acompanha.", nome do evento, botão "Abrir QR" → `/qrcode`.
- `AOV-02` `EventControls secoes=["telao"]`: cartão Telão com badge Ativo/Pausado e `Switch` (pausar pede `ConfirmDialog` "Pausar o telão?"; retomar não pede).
- `AOV-03` `LiveSummary`: badge "festa" pulsante; `AtualizadoHa` + `RefreshButton`; toast "🎉 A primeira foto chegou!" (uma vez por sessão do navegador, `sessionStorage`; emoji no texto); alerta crítico de denúncias com link "Ver agora →"; estados sem foto ("Ninguém entrou ainda" / "N pessoas entraram, nenhuma foto ainda"); com foto: 4 estatísticas (participação %, fotografaram/esperados, fotos enviadas, na fila de revisão), barra com meta 40 %, frase do veredito, "Chegando agora" (até 6 miniaturas). Polling 30 s.
- `AOV-04` Coluna esquerda "Fotos que chegaram" + "Ver álbum" + `ReviewQueue` (ver 3.7 — mesma fila, mesmos botões).
- `AOV-05` Coluna direita "Na TV ou no projetor": 3 passos em lista numerada, botão "Abrir telão" (nova aba `/wall-display`), nota "O convite continua disponível pelo QR…", `WallLinkSender`.
- `AOV-06` `WallLinkSender` ("Mandar o telão por link"): "Gerar link do telão" → `POST /api/admin/events/{id}/wall-link`; mostra campo readonly com o link, "Copiar link", "Enviar" (Web Share, se existir), "Vale até {hora}"; 403 → "O telão entra no plano Completo."; 401 → sessão expirada; botão desabilitado se `!podeUsarTelao(plan)` (sem explicação visível até o erro). Depois de gerado **não há botão "Gerar novo link"** na UI (o commit recente fez o novo link invalidar o anterior, mas a tela só oferece gerar uma vez por montagem).
- `AOV-07` Seção "Mais gente, mais olhares." + "Ver convite e QR" (repete o botão do cabeçalho).
- `AOV-08` `<details>` "Moderação e horário de participação": `EventControls secoes=["moderacao","interacao"]` = cartão com "Abrir moderação" (primário) e "Ver convidados" (secundário) + "Interação social" (ver 3.16).
**Estados.** carregando (skeleton), erro sem dado ("Painel indisponível agora. Recarregue a página"), vazio por falta de convidados/fotos, plano free (WallLinkSender desabilitado), denúncias, gate aberto/fechado.
**APIs.** `GET /api/admin/events/{id}` (30 s), `GET/PATCH /api/admin/events/{id}/review` (30 s), `PATCH /api/admin/events/{id}`, `POST …/wall-link`.
**Problemas.**
- Três nomes para a mesma tela: nav "Ao vivo", `h1` "Dia do evento", headline "O dia acontece…" (e `h2` "Ao vivo" dentro do `LiveSummary`).
- O "Modo endurecido" e o "Há menores" (seção `protecoes`) **não estão** na central ao vivo — só em Ajustes; a seção `moderacao` aqui é um cartão de links, não um controle.
- "Abrir QR" + "Ver convite e QR" duplicados; "Ver álbum" + `ReviewQueue` que já está em Fotos > Revisar.
- Dois pollers de 30 s na mesma tela (LiveSummary e ReviewQueue) e o `EventControls` instanciado duas vezes (estados locais independentes).
- "Abrir telão" abre `/wall-display`, que é a tela da TV (precisa estar no computador da TV); o anfitrião no celular não consegue "abrir" nada útil — o caminho certo é parear por código em `/wall-pair`, mas essa rota não é linkada daqui (só pelo QR exibido na TV).

### 3.7 `/admin/e/[id]/album` — Fotos (`album/page.tsx` + `fotos-page.tsx`)
**Propósito.** Álbum do anfitrião, moderação e entrega, numa tela com 3 abas.
**Dados.** `?aba=revisar|destaques|todas` (padrão todas); contagem da fila para o badge da aba (uma leitura no mount).
**Funcionalidades.**
- `FOT-01` Cabeçalho: headline "Uma história contada por muitas pessoas.", texto, botão "Como receber fotos" → `/qrcode`.
- `FOT-02` Abas (`Abas`: Todas / Revisar [badge com a fila; vermelho só se há denúncia] / Destaques). `role=tablist/tab` sem `tabpanel`/`aria-controls`.
- `FOT-03` Aba Todas/Destaques (`HostAlbum`): grade 2/3/4 colunas de miniaturas 4:5 (alt vazio; rótulo "Foto N de M, hh:mm · N curtidas, destacada"), selo de estrela, badge com total de fotos, `RefreshButton`, texto de ajuda por aba, estados vazios com instrução. Marca visita ao entrar em Todas (`PATCH album {acao:"visto"}`, alimenta "novas" da Home).
- `FOT-04` Seleção de uma foto abre painel abaixo da grade (miniatura 64 px + "Foto destacada/Foto do evento"): **Destacar / Tirar destaque** (`destacar|desdestacar`), **Ocultar** (some, aparece barra "Foto oculta. Ninguém mais vê." + **Desfazer** que recoloca na posição original), **Remover** (`ConfirmDialog` "Remover esta foto de vez?", sem desfazer), **Ver pessoa** (link `<a>` para `/guests?pessoa={sessaoId}`), **Fechar**.
- `FOT-05` Aba Revisar (`ModerationPage`): cartão "Revisão de conteúdo" com badge "Tudo revisado / N itens aguardando"; `ReviewQueue`; cartão "Comentários publicados" com `CommentModeration`.
- `FOT-06` `ReviewQueue`: itens de mídia (miniatura 3:4, autor, hora, badges "N denúncias", "remoção pedida", "aguardando" [modo endurecido], "filtro auto" [classificador]) com **Aprovar** (`liberar`) e **Ocultar**; comentários pendentes com **Manter** e **Remover**; barra em lote **Aprovar todas (N)** / **Ocultar todas (N)** quando >1 foto (dispara N PATCHs em paralelo, **sem confirmação**); polling 30 s; estado vazio "Fila limpa".
- `FOT-07` `CommentModeration`: lista de comentários publicados (autor, texto, badges de denúncia e "filtro auto") com "Remover comentário" (DELETE direto, sem confirmação), `RefreshButton`.
- `FOT-08` `<details>` "Baixar e guardar as fotos" (só Todas e só se `canExport`, papel owner/couple): **O livro** (texto sobre PDF A4 216×303 mm, sRGB, aviso de prova CMYK, link "Baixar PDF do livro" → `GET …/book/pdf`); **Baixar tudo** (ZIP) e **Álbum curado** (`HostExport`: `POST …/export/reauth` → link de confirmação por e-mail; "Baixar ZIP · N arquivos" ao ficar pronto; em dev mostra "confirmar agora"); **Exportar para o Google Drive** (`HostDriveExport`: Conectar → reauth por e-mail → `…/drive/connect`; Exportar; progresso N/M com polling 4 s; Desconectar; estados indisponível ("Disponível depois que a festa terminar"), parcial, sem espaço, erro).
- `FOT-09` Rodapé "Cada evento tem seu próprio álbum." + "Compartilhar convite" → `/qrcode`.
**Ordenação/filtro/busca.** Nenhum (sem busca por autor/hora/missão; sem seleção múltipla; sem visualização ampliada da foto — a miniatura é a única imagem; sem paginação aparente na API: não há limite em `album/route.ts`).
**Estados.** carregando (skeleton), erro com lista vazia, erro com dado antigo, vazio por aba, desfazer pendente, export em 10 fases.
**APIs.** `GET /api/admin/events/{id}` (badge), `GET album?aba=`, `PATCH album` (`visto, ocultar, reexibir, remover, destacar, desdestacar`), `GET/PATCH …/review`, `GET/DELETE …/comments`, `GET …/book/pdf`, `GET/POST …/export` (+`?modo=curated`), `POST …/export/reauth`, `GET …/export/arquivo`, `GET/DELETE …/drive`, `POST …/drive/reauth`, `GET …/drive/connect`, `POST …/export/drive`.
**Componentes.** `FotosPage`, `Abas`, `HostAlbum`, `ModerationPage`, `ReviewQueue`, `CommentModeration`, `HostExport`, `HostDriveExport`, `RefreshButton`, `ConfirmDialog`, `Badge`.
**Problemas.**
- Ocultar tem 3 caminhos com semânticas diferentes (Revisar: "Ocultar"; Todas: "Ocultar" com Desfazer; lote "Ocultar todas" sem confirmação nem desfazer).
- "Ocultar nome", "Ocultar todas" e "Remover comentário" não pedem confirmação, enquanto "Remover" foto pede.
- Fotos sem rótulo útil ("Foto 3"): não há autor, missão ou momento visível apesar de `Item` trazer `missaoId`/`lugarId`; moderar sem ver a foto grande/autor é limitado (o autor só aparece na fila de revisão).
- Aba "Revisar" e a fila da Ao vivo são a mesma `ReviewQueue` em duas telas; o badge de fila nunca aparece fora da aba.
- Área de download escondida num `<details>` fechado, com 4 seções de peso igual; texto técnico (sangria, sRGB prepress, CMYK) dirigido a um leigo.
- Cabeçalho com `h1` "Álbum", headline decorativa e CTA de QR + rodapé repete CTA de QR: três elementos antes da primeira foto.

### 3.8 `/admin/e/[id]/guests` — Convidados (`guests/page.tsx` + `convidados-page.tsx`)
**Propósito.** Quem entrou e quanto participou; funil de participação.
**Dados.** `?pessoa={sessaoId}` abre direto o perfil de uma pessoa; `GET …/guests` devolve lista de pessoas e o resumo de funil.
**Funcionalidades.**
- `CON-01` Faixa de abertura: headline "As memórias são feitas juntos." + "Compartilhar convite" → `/qrcode`.
- `CON-02` Abas: **Sua lista** (padrão) / **Participação**.
- `CON-03` Sua lista (`Pessoas`): "Descobertas da festa" (até 3 medalhas derivadas: "Quem mais registrou" [só >1 foto], "Primeira foto da festa", "Ficou até o fim", uma por pessoa; clicáveis); busca "Buscar pessoa" (sem acento/caixa); ordenar "Mais fotos"/"Menos fotos"; lista com inicial, nome, "N fotos · entrou às HHhMM", medalha; vazio "Ninguém entrou ainda… antes mesmo da primeira foto"; sem resultado "Ninguém com esse nome".
- `CON-04` Perfil da pessoa: "← Pessoas", cabeçalho (inicial, nome, contagem, hora de entrada, medalha), grade de miniaturas (`GET album?sessaoId=`), "Entrou no álbum, mas ainda não fotografou."
- `CON-05` Participação (`GuestFunnel`): "Participação ao vivo" (5 números: presentes/esperados, fotografaram, participação %, fotos no ar, compartilhamentos; veredito "meta ≥40%"; alerta de intenção frustrada); "Confirmar quem apareceu" (campo numérico + "Confirmar presença" → `PATCH …/config {actualGuests}`; badge Confirmada/Estimada); "Onde os convidados param" (6 degraus da espinha: QR escaneado, Abriu o evento, Consentiu, Tirou foto, Começou envio, Foto no ar, com barra e retenção %); "Canais de entrada" (QR impresso, WhatsApp, link copiado, código digitado); "Efeito do feed social" (antes/depois da abertura do feed); `GuestDisplayNames`; "Chegando agora". Polling 30 s, `AtualizadoHa`, `RefreshButton`.
- `CON-06` `GuestDisplayNames` "Nomes no telão": por sessão com foto, **Trocar** (formulário inline, máx. 40, contador regressivo, Salvar/Cancelar) e **Ocultar nome** (`PATCH …/guests {acao:"ocultar"|"renomear"}`), sem confirmação.
- `CON-07` Coluna lateral (≥xl): "Convide para participar" + "Ver convite e QR Code" (→ `/qrcode`); "Permissões" + "Ver consentimentos" (→ `/consent`).
**Estados.** carregando, erro com "Tentar de novo", vazio, perfil vazio, denominador estimado/confirmado.
**APIs.** `GET/PATCH /api/admin/events/{id}/guests`, `GET …/album?sessaoId=`, `PATCH …/config`.
**Problemas.**
- Linguagem de analista no meio do produto do casal: "espinha cumulativa", "fricção", "Efeito do feed social", "meta (≥40%)", "intenção frustrada" (`guest-funnel.tsx`). A Home já traduz o mesmo veredito; aqui não.
- Três cartões laterais/superiores levam ao QR/consent; o botão "Compartilhar convite" aparece duas vezes na mesma tela (faixa + lateral).
- "Participação" repete quase integralmente `/insights` (degraus, canais, feed) e o resumo de Ao vivo/Home; três versões do mesmo funil.
- "Nomes no telão" (moderação de nomes) mora dentro de "Participação", longe de "Sua lista" onde as pessoas aparecem.
- `Trocar` usa estilo primário e `Ocultar nome` estilo perigo, lado a lado, ambos sem confirmação.
- Sem como adicionar/convidar nomes: "Sua lista" é só quem entrou (ver o título "Sua lista" sugere lista de convidados do casal; **não verificado** se há intenção de lista de convidados pré-evento).

### 3.9 `/admin/e/[id]/comunidade` e `/comunidade/[postId]` (`descobrir.tsx`, `comunidade-acoes.tsx`)
**Propósito.** Conversa entre anfitriões; dado é da conta, não do evento (ADR 0023): a URL carrega `eventId` só para o shell.
**Funcionalidades.**
- `COM-01` Texto "Entre anfitriões".
- `COM-02` Chips de assunto (`TOPICOS` + "Tudo") como links `?filtro=`; `aria-current`.
- `COM-03` "Começar uma conversa" → formulário inline: Assunto (select), Título (máx. 160), Mensagem (máx. 4000), Publicar/Cancelar (`POST /api/admin/comunidade`, `router.refresh()`).
- `COM-04` Lista de conversas: tópico, título (link), corpo com `line-clamp-3`, autoria ("Você"/outro, `autoria(meu)`), tempo, nº de respostas; vazio com e sem filtro; "Conversas mais antigas" (paginação por cursor `?antes=`).
- `COM-05` Thread (`/comunidade/[postId]`): "← Comunidade", conversa + respostas, "Apagar conversa"/"Apagar resposta" (só do autor; confirmação inline "Apagar mesmo/Manter"), formulário "Sua resposta" (`POST …/respostas`).
**Estados.** vazio por filtro/geral; erro inline; `notFound` na thread (**não verificado** como `carregarConversa` se comporta com id inexistente).
**APIs.** `POST /api/admin/comunidade`, `POST /api/admin/comunidade/{postId}/respostas`, `DELETE /api/admin/comunidade/{postId}`, `DELETE /api/admin/comunidade/respostas/{respostaId}`; leituras server `carregarFeed`/`carregarConversa`.
**Problemas.** Não há denunciar, bloquear ou editar; autoria anônima ("Você" vs. outro) sem identidade; sem busca; sem nenhum item semente (moldura vazia por decisão). A porta de entrada (nav "Descobrir" → Comunidade) não explica privacidade (as respostas são de outras contas).

### 3.10 `/admin/e/[id]/inspiracao`
**Funcionalidades.**
- `INS-01` Texto "Para se inspirar"; chips de tema (`TEMAS`) por `?filtro=`.
- `INS-02` Cartões de ideia (tema, título, corpo) com botão "Salvar" (toggle, `aria-pressed`, `PUT/DELETE /api/admin/inspiracao/{id}`, otimista com rollback).
- `INS-03` Vazio: "Nada publicado neste tema ainda" + "Criar uma missão" → `/missions`.
**Problemas.** Há "Salvar" mas **nenhuma visão de "ideias salvas"** nem filtro por salvas (a tela só filtra por tema) — o que se salva não tem onde ser relido. Sem ação "aplicar à minha festa" ligando a ideia a missão/identidade.

### 3.11 `/admin/e/[id]/identity` — Experiência/Identidade (`identity/page.tsx`)
**Propósito.** Aparência do evento, capa, telão e dados básicos. Shell **detail**.
**Funcionalidades (`IdentityEditor`).**
- `IDE-01` Campos: "Como vocês querem aparecer?" (título, máx. 120), "Quantas pessoas vocês esperam?" (1–999, obrigatório, erro inline), `TimezoneField` (select de fusos).
- `IDE-02` "Qual combina mais com vocês?": rádio entre 4 presets (`IDENTITY_MODELS`: Amanhecer, Linho, Meia-noite, Jardim) — vocabulário **diferente** do wizard (5 estilos + 6 combos + `cor2`).
- `IDE-03` "Cor da festa" (color picker nativo, "Da paleta"/"Personalizada", "Usar cor da paleta") + aviso de contraste ("Contraste baixo…" abaixo de 4,5; "Boa leitura…").
- `IDE-04` `CapaFocoField` (Vertical/Horizontal 25/50/75).
- `IDE-05` "Jeito de escrever" (Serifa clássica / Sem serifa), "Clima da noite" (Escuro/Claro).
- `IDE-06` Prévia: `PhoneFrame` "Ficou assim" (capa fictícia, "Missão · …", "Tirar foto", "Ver álbum") + cartão com título na cor do evento; atualiza a cada escolha.
- `IDE-07` "Como as fotos aparecem no telão": checkbox por modelo (polaroide, mural, colagem, dump) com validação (`wallDisplayChoiceProblems`); o rótulo é `modelLabel` (capitaliza o id).
- `IDE-08` "Salvar identidade" → `PATCH …/config {expectedGuests, timezone, identityTokens, title}`; `SavedBadge` "Salvo"; marca o preparo `identidade`.
- `IDE-09` `CoverImageEditor` (seção separada abaixo): zona de arrastar/clicar (JPEG/PNG/WebP, ≤5 MB), preview 16:9, "Remover imagem" (imediato, sem confirmação), barra de progresso, "Imagem salva"; presign → PUT (XHR) → confirm.
**Estados.** pack não encontrado, salvando, erro, salvo; upload (idle/uploading/erro/pronto).
**APIs.** `PATCH /api/admin/events/{id}/config`, `POST/DELETE …/cover-image`, `POST …/cover-image/confirm`.
**Problemas.**
- Nav "Experiência" ≠ título "Identidade"; a tela não leva a Missões nem a Recado (que a navegação diz absorver).
- Mistura conceitos: nome do evento, convidados esperados e fuso (dados do evento) junto de cor/fonte/telão.
- Dois modelos de salvar: tudo por "Salvar identidade", mas a capa é imediata; o enquadramento da capa fica longe da imagem que ele enquadra (editor acima, imagem abaixo) e sem prévia do recorte.
- Data, hora e local do evento **não são editáveis em nenhuma tela** após criar (config PATCH só aceita `expectedGuests, actualGuests, timezone, identityTokens, title`).
- Preset "Jardim" coexiste com a matriz que o classifica como "Não portar" (sage). Se salvar um preset sobrescreve `eventCores`/estilo escolhidos no wizard: **não verificado** (o editor faz `...restoInicial` mas depois `...preset.camada`).

### 3.12 `/admin/e/[id]/missions`
**Propósito.** Escolher, ordenar e criar missões.
**Funcionalidades (`MissionsEditor`).**
- `MIS-01` "Missões do pack": lista numerada das ativas (subir/descer, arrastar e soltar, desligar) + "Disponíveis no pack" (ligar); modo livre quando vazio ("o convidado fotografa o que quiser").
- `MIS-02` Prévia "Na câmera" com `MissionBanner` (primeira missão, total).
- `MIS-03` "Missões personalizadas": editar inline (emoji, título ≤120, prazo opcional datetime-local, "Remover prazo"), subir/descer, remover; "Nova missão personalizada" (emoji ≤4 chars, título, prazo; Enter adiciona).
- `MIS-04` "Salvar missões" → `PUT …/challenges {titleKeys, customMissions}`; badge "Salvo"; erro "Não foi possível salvar."
**Estados.** pack inexistente; sujo/salvo (alterações só valem após salvar); modo livre.
**Problemas.** Alterações pendentes sem aviso ao sair; remover missão personalizada é imediato (só vale ao salvar); "Disponíveis no pack" não mostra descrição; **sem ligação com Inspiração** além do link de vazio; sem prévia de como o convidado vê a lista completa.

### 3.13 `/admin/e/[id]/guestbook` — Recado
**Funcionalidades (`GuestbookEditor`, `GuestbookAudioField`).**
- `REC-01` Textarea "Texto" (contador N/`MAX_TEXT_CHARACTERS`, placeholder do pack).
- `REC-02` Áudio opcional (≤`MAX_AUDIO_SECONDS`): checkbox de aceite ("é da sua voz"), Gravar/Parar (cronômetro) ou enviar arquivo, "Remover áudio"; erro do gravador.
- `REC-03` "Aparece a partir de" (datetime-local; sem horário nenhum convidado vê).
- `REC-04` "Criar recado"/"Salvar recado" e "Salvar e publicar agora" (`PUT …/guestbook`; áudio via `…/guestbook/audio` + `confirm`).
- `REC-05` Prévia `PhoneFrame` "Como o convidado vê" (texto, chip de áudio, "Aparece em …" ou "Ainda sem horário — some até vocês publicarem").
**Estados.** carregando (skeleton), vazio, salvo (`SavedBadge`), erros (texto longo, áudio sem aceite, falha).
**Problemas.** "Criar recado" e "Salvar e publicar agora" são o mesmo ato com e sem horário (rótulos não explicam); "Remover áudio" só vale ao salvar; a prévia usa estilo neutro e não a identidade do evento (comentário no código admite).

### 3.14 `/admin/e/[id]/qrcode` — Compartilhar (`qrcode/page.tsx` + `qr-code-print.tsx`)
**Propósito.** Convite: QR, link, impressão.
**Funcionalidades.**
- `QR-01` Headline "Um convite. Todos os olhares." + texto.
- `QR-02` Aviso de rascunho com botão "Ir para publicação" (`/admin/e/{id}#controle-publicar`).
- `QR-03` Cartão do QR (SVG gerado no servidor, nível M, 400 px): nome do evento, QR, URL em mono, instrução.
- `QR-04` "Link da página do convidado": campo readonly (seleciona ao focar) + "Copiar link" (feedback "Link copiado" + `role=status`), `VerComoConvidado` "Testar como convidado".
- `QR-05` Capa do evento (figure) + nome + data + texto fixo "As melhores memórias são feitas juntos…" (**imagem = foto do pack**, ver problemas).
- `QR-06` "Leve o convite para a festa": **Imprimir** (`window.print()` com CSS de impressão que esconde o cromo), **Baixar PNG** (`svgToPngBlob`), **Baixar PDF** (`GET …/pieces?formato=placa-a4&tipo=pdf`); PNG/PDF marcam o preparo `qr`.
**Estados.** rascunho, ocioso, gerando, erro.
**APIs.** `GET …/pieces`.
**Problemas.**
- O `if (evento.coverImageKey) {}` em `qrcode/page.tsx` está vazio: a capa real nunca é assinada e a página mostra sempre a foto de exemplo do pack (bug).
- Esta tela oferece só a placa A4 em PDF/PNG; os formatos "Card de mesa", "Card de missão", ZIP e SVG vivem em Ajustes ("Peças para imprimir") — a pessoa que veio para imprimir não os encontra aqui.
- Link do convidado aparece também em Ajustes ("Links do evento") e como "Copiar link" na Home; o telão no mesmo quadro de links.
- Página `detail` sem rail, apesar de ser destino de navegação (Compartilhar).

### 3.15 `/admin/e/[id]/evento` — Ajustes (`evento/page.tsx` + `event-hub.tsx` + `EventControls` completo)
**Propósito.** Hub de atalhos + todos os controles do evento.
**Funcionalidades.**
- `AJU-01` `EventHub`: "Tudo do seu evento num lugar." + 8 cartões em 3 grupos — **Como o convidado vê**: Aparência (`/identity`), Recado (`/guestbook`), Missões (`/missions`); **Na festa**: QR e compartilhamento (`/qrcode`), Abrir o telão (`/wall-display`), Equipe (`/team`); **Segurança e controle**: Privacidade (`/consent`), Conferir o preparo (`/pre-event`). (3+3+2).
- `AJU-02` "Controles do evento" = `EventControls` sem filtro, na ordem: Publicar (só rascunho), Telão, Proteções, Interação social, Entrega das fotos, Moderação e convidados, Preciso de ajuda, Assinar Completo (só owner/couple e plano free), Música do casal, Peças para imprimir, Links do evento (detalhes na seção 3.16).
**Problemas.** O hub repete 5 destinos já na navegação (Aparência/Experiência, QR/Compartilhar, Missões, Recado, Telão) e os controles repetem outros 3 (telão, moderação, QR/links). Não há ajustes de dados do evento (nome, data, local), conta, notificações, nem encerrar/excluir. "Ajustes" mistura configuração (proteções, música) com ações de operação (entrega, ajuda, plano).

### 3.16 `EventControls` (`event-controls.tsx`) — secções, uma a uma (usado em Início, Ao vivo e Ajustes)
- `CTL-01` **Publicar** (draft): botão "Publicar evento" → `PATCH …/ {status:"active"}`; âncora `#controle-publicar`.
- `CTL-02` **Telão**: badge Ativo/Pausado + `Switch`; pausar abre `ConfirmDialog` (descrição assimétrica: só confirma o que tira proteção/interrompe) → `PATCH {panico}`.
- `CTL-03` **Proteções** (`#controle-menores`): "Há menores" (switch; só owner/couple edita, outros veem Sim/Não; desligar pede confirmação; ao ligar mostra 3 efeitos: denúncias para segurar, compartilhar fora, gate) → `PATCH {haMenores}`; "Modo endurecido" (switch, desligar pede confirmação) → `PATCH {modoEndurecido}`.
- `CTL-04` **Interação social** (`#controle-interacao`): aberta → "Aberta desde {data}" + "Fechar interação"; fechada → "Abrir interação agora" (`{abrirInteracao:true}`) ou "Ou agendar" (`datetime-local`, **dispara PATCH no `onChange`**, sem botão de confirmar) + "Agendada para …".
- `CTL-05` **Entrega das fotos** (`DeliveryControls`): `Switch` "Liberar entrega das fotos" (`PATCH …/entrega {deliveryOpensAt}`), botão "Enviar agora" (`POST …/entrega/disparar`, habilitado só com o gate aberto), resultado "N enviadas, M pendentes".
- `CTL-06` **Moderação e convidados**: links "Abrir moderação" (→ `/moderation` → redirect) e "Ver convidados".
- `CTL-07` **Preciso de ajuda** (`SupportHelpButton`): "Abrir chamado" → formulário Assunto, "O que aconteceu", Prioridade (P0 festa ao vivo, P1 esta semana, P2 quando der), Enviar/Cancelar → `POST /api/support/tickets`; sucesso substitui o bloco por "Pedido enviado. A gente responde no e-mail da conta." (sem número de chamado nem histórico).
- `CTL-08` **Assinar Completo** (owner/couple, plano free): "Pagar R$ 199" → `POST /api/billing/checkout` → redirect `invoiceUrl` (ou simulação em stub + reload); erro "Não salvou agora".
- `CTL-09` **Música do casal** (`EventMusic`): campo "Link da faixa" (Spotify/YouTube Music), "Colar da área de transferência", "Salvar música" (`PUT …/music`), "Agora: {rótulo}", lista "Sugestões dos convidados" (rótulo, votos, "Usar").
- `CTL-10` **Peças para imprimir** (`EventPieces`): "Pacote completo (ZIP)" (checkbox "Incluir arquivos SVG editáveis"), "Arquivos individuais" × 3 formatos (Placa A4, Card de mesa, Card de missão; PDF/SVG cada) → `GET …/pieces?formato=&tipo=` ou `tipo=zip[&svg=1]`; texto sobre sangria 3 mm e prova CMYK; erro com `details.problemas`.
- `CTL-11` **Links do evento**: Convidado, WhatsApp e Telão (URLs com "Copiar" e abrir) + "Testar como convidado ↗".
**Problemas.**
- `Telão`/`Interação`/`Entrega` (operação) misturados com `Música`/`Peças`/`Links` (preparo) numa pilha de 11 cartões do mesmo peso, sem agrupamento nem prioridade.
- `Interação social` agenda ao escolher o horário (sem confirmar) e o `datetime-local` não mostra o horário já agendado dentro do campo.
- Mensagem de erro única e genérica ("Não salvou agora.") no rodapé para todos os controles; um controle falhar não diz qual.
- `Assinar Completo` aparece só dentro de Ajustes (e no Pronto); no plano free o telão exibe controles mas "Gerar link do telão" fica desabilitado sem explicação.

### 3.17 `/admin/e/[id]/consent` — Consentimento (`consent-versions.tsx`)
- `CST-01` Cabeçalho "Consentimento" + `AtualizadoHa` + `RefreshButton`; texto de auditoria LGPD ("sem nomes individuais").
- `CST-02` Por tipo (Entrada no evento / Compartilhamento fora da festa): cartões de versão com rótulo, `Badge` versão e vigente/anterior, nº de aceites, primeiro/último aceite, revogados, "Ler texto completo" (toggle).
**Polling** 60 s. **API** `GET …/consent`. **Estados** carregando, erro, sem texto no registro.
**Problemas.** Linguagem de auditoria jurídica ("versão", "revogados", "perímetro") para o casal; sem ação (leitura apenas); sem como alterar o texto (por desenho).

### 3.18 `/admin/e/[id]/team` — Equipe (`event-team-panel.tsx`)
- `EQP-01` Lista de membros (avatar com iniciais, e-mail, chip Casal/Cerimonialista).
- `EQP-02` Convite: campos E-mail e Papel (select: "Casal (acesso completo)" / "Cerimonialista (moderação e painel)"), "Convidar" → `POST …/members`; badge "Convite enviado"; rate limit 10/h no servidor.
- Vazio: "Só você por enquanto". Erro com "Tentar de novo". `planner` (sem `canManageTeam`): o componente devolve `null` — a tela fica **em branco** (só o shell).
**Problemas.** Sem remover membro, trocar papel ou reenviar convite; a lista não mostra o papel do próprio usuário; página em branco para cerimonialista sem explicação.

### 3.19 `/admin/e/[id]/pre-event` — Pré-evento (`pre-event-checklist.tsx`)
- `PRE-01` "Checklist pré-evento" com contador N/total (21 itens em "7 dias antes" [11] e "Dia D" [10]), botão Imprimir (CSS de impressão).
- `PRE-02` Cada item: checkbox (otimista, `POST setup-marks {checklist:{item,feito}}`, erro "Toque de novo no item"), rótulo, dica, link "Ir para etapa →"/"Abrir ↗"; itens **derivados** (marcados sozinhos, desabilitados com "O Álbora marca sozinho…") quando há sinal (missões, convidados esperados, plano pago, gate).
- `PRE-03` `QrProofSheet` "Prova física do QR": tabela (3 aparelhos × 3 distâncias + luz baixa + passou?) de caixas vazias, campos em branco (data, responsável, gráfica/papel, id do evento), "☐ APROVADO ☐ REPROVADO".
- `PRE-04` "Roteiro para o microfone": blocos `MC_SCRIPTS` para copiar.
**Problemas.** Texto diz "salva neste navegador" mas grava no evento (`setup-marks`); "Espelha o runbook operacional" e `docs/runbooks/prova-qr-fisica.md` (caminho interno de repositório) expostos ao anfitrião; "Álbora" com acento; itens de "Dia D" na tela de preparação; âncoras para controles que não existem na Home (ver 3.5); só chega nela pelo hub de Ajustes.

### 3.20 `/admin/e/[id]/insights` — Insights (`event-insights.tsx`)
- `ANA-01` "A festa está pegando?" + "Exportar CSV" (`GET …/insights/csv`, download por blob) + Atualizar; estatísticas: **"H1 participação"**, fotografaram, esperados, fotos no ar, compartilhamentos, hora de pico, missão líder; veredito; "Maior queda no funil".
- `ANA-02` "Jornada do convidado" (degraus), "Canais de entrada", "Efeito do feed social", "Missões mais fotografadas" (ranking), "Hora de ouro" (histograma por hora).
Polling 30 s; erros e skeleton.
**Problemas.** Sem link para esta tela na UI do anfitrião (só no portal do fornecedor); vocabulário interno de hipótese ("H1"); duplica Participação em Convidados (degraus/canais/feed idênticos); é a única tela com exportação CSV.

### 3.21 `/admin/e/[id]/moderation`
Redireciona (`redirect`) para `/album?aba=revisar`. Mantida por links antigos, pela Home ao vivo ("Revisar fotos"), pelo alerta de denúncia, por `EventControls` e pelo checklist do Dia D.

### 3.22 Telão, lado do anfitrião (`/wall-display`, `/wall-pair`, `/wall-link`)
- `TEL-01` `/wall-display` (tela da TV): sem evento até parear; mostra código/QR (QR → `/wall-pair?codigo=…`). Não auditado a fundo.
- `TEL-02` `/wall-pair`: campo de código de 6 caracteres (`maxLength=6`, "A2C4E6"), "Ligar o telão" → `POST /api/wall/authorize` (usa a sessão do anfitrião); estados "Telão ligado", sem sessão, rejeitado, erro.
- `TEL-03` `/wall-link#token`: a TV abre o link de uso único; estados "Conectando o telão…", "Este link não vale mais" (410), "Não conseguimos conectar agora". O link nasce em `WallLinkSender` (validade 20 min, uso único — segundo comentários do commit; não reverificado nesta leitura).
**Problema.** São três caminhos de conexão (código digitado, QR, link) sem tela de ajuda única; no painel só aparece o link; o pareamento por código/QR só é alcançado pela própria TV.

---

## 4. Componentes e padrões transversais

**Layout/casca.** `AdminShell` (+`-root`), `AdminCard`/`AdminSection` (cartão com `elev-1`, variante `highlight` com gradiente), `EventPageLayout`, `EventSidebar`, `AppNav`, `MenuDaConta`, `SkipLink`, `adminVars(background, identidade)` (admin nasce claro; identidade do evento entra só com acento/fonte/raio via `camadaDoEvento`).
**Botões.** `adminClasses.{primaryButton, primaryButtonSm, secondaryButton, dangerButton, dangerButtonSm, listLink}` (presets de `buttonVariants`) e `Button`/`PrimaryButton`/`SecondaryButton` do `@albora/ui-web`; classes locais `acaoPrimaria`/`acaoSecundaria`/`estiloAcento` (`home/estilos.ts`); `ALVO_TOQUE = min-h-11/12` redefinido por arquivo (5 cópias).
**Feedback.** `SavedBadge` ("Salvo", `StatusBadge positive`), `Badge` (tons accent/outline/neutral/critico), `RefreshButton`+`AtualizadoHa`, skeletons `animate-pulse` por componente (cada um com o seu), `role=alert`/`role=status`. **Não há `showToast`**: nenhuma tela do painel usa `Toast` do DS (verificado: o único "toast" é um `div` do LiveSummary). Erros são inline, texto genérico.
**Confirmações.** `ConfirmDialog` (sair, pausar telão, desligar proteções/endurecido, remover foto) e confirmação inline própria da Comunidade (`Apagar`); ações destrutivas sem confirmação: aprovar/ocultar em lote, ocultar nome, remover comentário, remover capa, remover missão, remover áudio.
**Abas e filtros.** `Abas` (pílulas, usada em Fotos e Convidados), chips de link (`?filtro=`) na Comunidade/Inspiração; busca só em Convidados.
**Folhas e diálogos.** `BottomSheet` (Mais, Conta, Ajuda, MissionSheet), `Dialog` (Tour, Reviver), `ConfirmDialog`.
**Ícones.** Lucide via `@albora/ui-web` + SVG inline em muitos componentes (setas, check, aviso) — não unificados; emoji em UI: "🎉" no toast de primeira foto, 🎉 de placeholder, emoji do usuário nas missões.
**Previews de aparência.** `PhoneFrame` (Identidade, Recado), moldura de celular própria (Home `PreviaDoConvidado`), `LivePreview` (wizard), `MissionBanner`.
**Atualização de dados.** Polling 30 s em: LiveSummary, ReviewQueue, CoupleFollowMode, GuestFunnel, EventInsights; 60 s em ConsentVersions; 4 s no export do Drive. Nenhum usa SSE/WebSocket; cada componente reimplementa `carregar`+`setInterval`.
**Tokens/tema.** Cookie de tema (claro/escuro/sistema), anti-flash no servidor, cookie do rail; classes `tipo-*`, `elev-*`, `rounded-superficie/token/pilula`. Hex hardcodado em componente: não verificado (guard de CI existe).
**Dados do evento no shell.** `loadEventPage` (sessão → papel → evento), `rotuloContagem`, `rotuloDoPlano`.
**Duplicação EN/PT de handlers.** `/api/admin/events/*` (usado) e `/api/admin/eventos/*` (legado); o painel só chama o primeiro.

---

## 5. Problemas transversais (priorizados pelo que mais pesa no redesign)

- `P-01` **Três nomes para cada tela.** Nav, `h1` e headline divergem: Ao vivo/"Dia do evento"/"O dia acontece…"; Fotos/"Álbum"/"Uma história contada…"; Ajustes/"Evento"; Experiência/"Identidade"; Compartilhar/"QR Code"; Convidados/"Convidados"/"As memórias são feitas juntos."; Início sem `h1` de seção. Mais o breadcrumb que repete o nome do evento (já no rail).
- `P-02` **Navegação inconsistente entre "primary" e "detail".** Dois dos nove destinos do menu (Experiência, Compartilhar) abrem páginas sem rail/bottom-bar e com "← Evento" apontando para Ajustes; 6 telas absorvidas (missões, recado, consentimento, equipe, pré-evento, insights) só chegam pelo hub de Ajustes ou por links internos; Insights e Cobranças não têm entrada. A conta (e-mail, plano) só é visível no rail; fora dele (lista, cobranças) não há tema nem ajuda.
- `P-03` **Repetição de destinos e CTAs.** QR/convite: ~10 entradas (Início ×3, Ao vivo ×2, Fotos ×2, Convidados ×2, Ajustes ×2, rail). Telão: Home, Ao vivo, Ajustes×2 (hub + controles), checklist. Moderação: Fotos>Revisar, Ao vivo, Ajustes, Home. Três funis (Home/Ao vivo, Convidados>Participação, Insights).
- `P-04` **Excesso e peso igual.** Ajustes empilha ~11 cartões de mesma altura; Ao vivo empilha herói textual, controles, resumo, fila, TV, QR e `<details>`; Fotos põe headline, CTA, abas, grade, painel de ação, `<details>` de 4 downloads e rodapé; cada tela abre com um bloco editorial (headline + parágrafo) antes da função.
- `P-05` **Ações competindo / risco.** Ocultar/Aprovar em lote e "Ocultar nome" sem confirmação; botão primário "Trocar" ao lado de perigo "Ocultar nome"; "Salvar" imediato (capa, interação agendada) convivendo com "Salvar" por botão (identidade, missões, recado) e com toggles de efeito imediato (telão, endurecido). Sem aviso de alterações não salvas.
- `P-06` **Duas fontes de verdade para "pronto".** Home (6 essenciais, marcos por evento) × `/pre-event` (21 itens, checkbox manual + derivados) × tour (6 passos) × ideias; "Ver como convidado" apontando para a própria Home; âncoras (`#controle-*`) inexistentes antes da festa.
- `P-07` **Vocabulário interno vazando.** "H1", "espinha", "fricção", "veredito/tese", "Efeito do feed social", "gate de interação", "modo endurecido", "step-up", "runbook", `docs/runbooks/...`, "Asaas", "sangria/sRGB prepress/CMYK", "pack", "P0/P1/P2" (e-mail de ajuda). O glossário do menu cobre só 7 termos.
- `P-08` **Dados do evento inconsistentes.** Lista usa nome derivado do slug; painel usa título; data/hora/local não editáveis após criar; título e convidados esperados editáveis só dentro de "Identidade"; identidade tem dois vocabulários (wizard 5 estilos×6 combos×`cor2` vs. editor 4 presets×cor única).
- `P-09` **Estados vazios/bloqueios sem explicação.** Equipe em branco para `planner`; telão desabilitado no plano free sem texto; `couple` vê "Acompanhar" por padrão mesmo antes da festa; export/Drive "indisponível" só com uma linha; Comunidade/Inspiração sem conteúdo (por decisão), sem "ideias salvas".
- `P-10` **Falta de feedback agregado.** Nenhum badge de pendências no rail/bottom-bar (o contexto existe e ninguém lê); erros genéricos de uma linha; sem toasts do DS; "Convite enviado" sem confirmar que e-mail saiu (não verificado no handler).
- `P-11` **Bug: capa real nunca usada no QR** (`if (...) {}` vazio em `qrcode/page.tsx`).
- `P-12` **Polling duplicado e instanciação dupla** (Ao vivo: LiveSummary + ReviewQueue + dois `EventControls`; Home ao vivo repete LiveSummary).
- `P-13` **Marca e acentuação.** "Álbora" (tour, checklist, wizard aria-label) × "Albora" (Home, boas-vindas); `CLAUDE.md` usa "Albora".
- `P-14` **Rail com tokens "dark" fixos.** `event-sidebar.tsx` aplica `style={adminVars("dark")}` no `aside`, enquanto o comentário diz "superfície clara"; o efeito visual real **não foi verificado** (não rodei o app).
- `P-15` **Acessibilidade vista no código.** Abas sem `tabpanel`; `Ver pessoa` como `<a>` com recarga completa; fotos de moderação com `alt=""` (descrição só no botão de grade); `Switch` com rótulos mutáveis ("Pausar/Retomar telão"); `aria-disabled` no hub para itens sem `href` (nenhum hoje). Contraste, foco e leitor de tela reais: não verificado.

---

## 6. Lacunas de verificação e divergências com os documentos de contexto

- Nada foi executado (sem servidor, sem captura). Layout, contraste, comportamento responsivo e o aspecto do rail (P-14) são inferidos do código.
- **Não lidos a fundo:** `onboarding/*` (exceto grep e o que `inv-repo.md` já descreve), `ReadyStep`, `MissionSheet`, `live-preview`, handlers `lib/api/handlers/admin-*.ts` (só nomes e alguns campos), `/wall-display` (tela da TV), `carregar-descobrir.ts`, `descobrir-tela.ts` (rótulos exatos de tópicos/temas), `linha-de-retencao.ts` (marcos exatos), `guestbook-audio-upload`.
- **Divergência 1:** `inv-repo.md` lista rotas `/api/admin/eventos/*` como legado duplicado — confirmado que o painel só chama `/api/admin/events/*`. Faltava no inventário o handler **`/api/admin/events/{id}/wall-link`** (novo na branch atual).
- **Divergência 2:** `matriz-de-funcionalidades.md` diz "Conectar telão (3 métodos): Parcial — falta método por link"; a branch atual já traz o método por link (`WallLinkSender`, `/wall-link`), mas a tela de Ao vivo não oferece "gerar novo link" após o primeiro.
- **Divergência 3:** a matriz diz "QR inline no Pronto: Existe (#109)" e `inv-repo.md` diz que o Pronto não mostra QR inline; não reverifiquei `ReadyStep` (não verificado qual está certo).
- **Divergência 4:** a matriz diz "Insights: Existe"; no código a tela existe mas **não tem entrada na UI do anfitrião**.
- **Divergência 5:** `inv-repo.md` diz que Ajustes absorve `/consent` e `/team` e que a Home absorve `/pre-event`; no código isso é só marcação de destino ativo (`absorve`), as telas continuam em shell sem rail.
- **Não verificado:** quem é "owner" × "couple" na prática (qual papel a conta criadora recebe) e portanto quem cai no modo Acompanhar; se o CTA de `sugereAntes` pré-seleciona tipo no wizard; ordenação da lista em `/admin`; paginação real de `album` (não há `limit` em `album/route.ts`); comportamento de `notFound` da thread da Comunidade; se `POST …/members` realmente envia e-mail; se salvar um preset em Identidade sobrescreve `eventCores`/estilo do wizard; rótulos exatos de `TOPICOS`/`TEMAS`; efeito visual do rail (P-14); conteúdo de `MC_SCRIPTS`; quantos itens de pre-evento são derivados (`estadoDoChecklist`).
