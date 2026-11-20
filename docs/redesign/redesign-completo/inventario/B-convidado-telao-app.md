# B — Inventário: convidado, telão e app nativo

Lido só no código (nada renderizado). Itens não confirmados estão marcados "não verificado". Partes: **Parte 1** web do convidado (cap. A), **Parte 2** captura, scan, pareamento, telão (cap. B), **Parte 3** app nativo Expo (cap. C).

## Tabela-resumo

| # | Rota / tela | Arquivo principal | Superfície | Seção |
|---|---|---|---|---|
| 1 | `/e/[slug]` entrada (EntryFlow, resolverSlug) | `apps/web/app/e/[slug]/page.tsx`, `features/guest` | Web convidado | A §1 |
| 2 | `/e/[slug]/cover` capa | `features/cover` | Web convidado | A §2 |
| 3 | `/e/[slug]/feed` feed + stories + viewer | `features/feed` | Web convidado | A §4 |
| 4 | `/e/[slug]/g/[autorId]` perfil de autor | `features/guest-profile` | Web convidado | A §5 |
| 5 | `/e/[slug]/missions` | `features/missions` | Web convidado | A §6 |
| 6 | `/e/[slug]/music` | `features/music` | Web convidado | A §7 |
| 7 | `/e/[slug]/confessional` (+ recado dos anfitriões) | `app/e/[slug]/confessional`, `features/guest` | Web convidado | A §8-9 |
| 8 | `/e/[slug]/my-photos` (Perfil) | `features/my-photos` | Web convidado | A §10 |
| 9 | Home (features/home) | `features/home` | Web convidado | A §11 |
| 10 | `/e/[slug]/album` | `features/album` | Web convidado | A §12 |
| 11 | `/e/[slug]/photo` câmera/editor/envio | `features/photo` | Web convidado | B §1 |
| 12 | `/scan` | `features/guest` rescue-scanner | Web convidado | B §2 |
| 13 | `/g/[token]` galeria de entrega | `features/entrega` | Web convidado | B §3 |
| 14 | `/[slug]` URL curta | `app/[slug]/page.tsx` | Web | B §4 |
| 15 | `/p/[slug]` vitrine pública | `features/public-event` | Web público | B §5 |
| 16 | `/e/[slug]/pair`, `/app/parear` | `features/pairing` | Web convidado | B §6 |
| 17 | `/wall-display` telão | `features/wall` | Telão | B §7 |
| 18 | `/wall-pair`, `/wall-link` | `features/wall-pairing` | Telão | B §8 |
| 19 | `/telas`, `/telas-admin` | catálogo interno | Interno | B §9 |
| 20-34 | App Expo: `_layout`, `index`, `pair`, abas feed/missions/album/mine, `photo`, `photo-detail`, `guest-profile`, `music`, `recado`, `confessional`, `queue`, `e/[slug]/pair` | `apps/mobile/app/**` | App nativo | C §1-15 |

Contagem: 19 telas/rotas web (a linha 19 agrupa 2; `/wall-pair` e `/wall-link` idem) + 15 telas/rotas do app = cerca de 34 superfícies (ver nota final do relatório).

---

# PARTE 1 — Web do convidado


Caminhos relativos a `apps/web/` salvo indicação (`ui-web` = `packages/ui-web/src/`). Tudo abaixo foi lido no código; o que não foi lido está marcado "não verificado". Rotas usam `app/e/[slug]/...`.

## 0. Transversal (layout, estados do evento, chrome, a11y)

**Arquivos:** `app/e/[slug]/layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `manifest.ts`, `features/guest/data/{resolve-open-event,guest-session}.ts`, `features/guest/components/client/{event-notice,event-countdown,no-session,offline-banner,route-announcer,rescue-scanner}.tsx`, `ui-web/{guest-chrome,floating-nav,nav-tabs,nav-camera-button,sheet,dialog,toast,live-announcer,skip-link,notice,empty-state,photo-card,story-rail,post-header}.tsx`.

**Layout `/e/[slug]`:** chama `resolveOpenEvent(slug)`; se `estado !== "aberto"` devolve só `children` (sem tema, sem OfflineBanner/Toast/Announcer). Se aberto: injeta CSS de tema do evento (`eventVars`/`marcaVars`, claro+escuro, anti-flash), cookie de tema, `<link rel=manifest>` por evento, `GlobalQueue` (fila offline de upload) e `WebVitalsCollector` só se `isSameEventSession`, `OfflineBanner`, `ToastContainer`, `LiveAnnouncer`, `RouteAnnouncer`.

**`resolverSlug` (`packages/db/src/events.ts:139`)** — estados e o que a UI (`app/e/[slug]/page.tsx`) mostra:

| estado | quando | UI em `/e/[slug]` |
|---|---|---|
| `desconhecido` | slug não existe / evento não carrega | `notFound()` → `not-found.tsx`: "Esse endereço não abre nenhuma festa" + botão "Escanear o QR" (`/scan`) |
| `rascunho` | `status=draft` (vence rotação) | `EventNotice` "Evento ainda não disponível / Os anfitriões estão preparando tudo. Volte em breve!" |
| `slug_rotacionado` | slug `active=false` | `EventNotice` "Esse código foi trocado" + `showRescue` (RescueScanner) |
| `encerrado` | agora ≥ termina+48h (`HORAS_APOS_EVENTO=48`) | `EventNotice` "Essa festa já foi / O envio de fotos ficou aberto por 48 horas depois do fim..." |
| `nao_comecou` | agora < começa | `EventNotice` "Ainda não começou" + `EventCountdown` ("em X h Y min", atualiza 30 s; ≥24h mostra data/hora) |
| `aberto` | — | com sessão do MESMO evento → `HomeContent` (Home, ver §11); sem → `EntryFlow` (§1) |

`generateMetadata`: `desconhecido` → título "Albora"; demais → "Fotos da festa", `robots noindex`. `dynamic = force-dynamic`. `?via=` lido por `parseEntryVia`.

**Subrotas (cover, feed, missions, music, album, my-photos, g/[autorId], photo, pair, confessional):** todas repetem: `r.estado !== "aberto"` → `EventNotice` GENÉRICO "Essa festa não está aberta agora / Volte pelo QR da mesa para conferir." (idêntico para rascunho, encerrado, não começou, trocado; só `confessional` põe `showRescue` e texto diferente); sem sessão → `NoSession` ("Falta você entrar", botão "Entrar" → `/e/{slug}`); `export const metadata` com título próprio e noindex. `error.tsx` por rota (cover/feed/missions/music/album/my-photos/photo) + `error.tsx` geral ("Ops, algo deu errado / Suas fotos estão seguras", "Tentar de novo", "Voltar ao início"→cover). `loading.tsx`: spinner + "Carregando..." (as páginas usam `Suspense` com skeleton próprio).

**Chrome compartilhado (`ui-web`):**
- `GuestShell` (+`StatusBar` só espaçador de safe-area), `GuestMain` (`id=main-content`, padding-bottom 6,5 rem p/ nav), `GuestHeader` (título = `<a>` para a capa; sem seta/voltar), `SkipLink`, `EntryColumn`, `FinePrint`, `DisplayTitle`, `EmptyState` (CTA "Tirar foto"), `GateNotice`, `ErrorMessage` (`role=alert`), `ConsentNote`.
- `FloatingNav` (nav "Navegação principal"): Início (`/e/{slug}`) · Explorar (`/album`) · [câmera central → `/photo`, aria "Mandar foto ou vídeo"] · Missões (`/missions`) · Perfil (`/my-photos`). `active` só para inicio/album/missoes/minhas. NÃO há aba Feed, Música, Capa nem Perfil-de-autor.
- `BottomSheet` = `<dialog>` nativo `showModal` (`Dialog`): fecha no scrim, ESC, arrasto do handle (>30% altura ou flick), animação 300 ms (zero se reduced-motion).
- `Toast` (`showToast`, 3 s, fixo acima da nav, `role=status`), `LiveAnnouncer`/`announce()`.
- `OfflineBanner`: barra fixa "Sem conexão — suas fotos estão seguras e sobem quando voltar" (`navigator.onLine`).
- `RouteAnnouncer`: anuncia "Início/Feed/Missões/Explorar/Perfil/Mandar foto/Música" ao trocar rota; qualquer outra rota = "Página".
- PWA: `manifest.ts` start_url = `/e/{slug}/cover`, standalone, ícones SVG (um "maskable" separado).

**Problemas transversais (código):**
1. Mensagem única "Essa festa não está aberta agora" nas subrotas esconde a causa (encerrado vs. ainda não começou vs. rascunho) que a raiz já distingue; sem countdown e sem "Escanear" (exceto confessional).
2. Subrotas checam `if (!session)` e não `isSameEventSession`: um cookie de sessão de OUTRO evento passa o guard e `session.eventoId` (do outro evento) é passado a `CoverContent/FeedContent/MissionsContent/AlbumContent/MyPhotosContent/PhotoContent` junto com `evento` do slug visitado. Só `/` e `confessional`/`pair` usam `isSameEventSession`. Risco de dados cruzados/telas vazias — **verificar** (regra de isolamento do CLAUDE.md).
3. Duas "homes": `/e/[slug]` com sessão = Home (feed vertical, stories) e `/cover` = capa do evento; `GuestHeader` leva à capa, nav "Início" leva à Home, PWA abre na capa. `/feed` é uma TERCEIRA superfície quase igual à Home (ver §4/§11) sem item na nav.
4. Título do evento inconsistente: `EntryFlow`/`cover` usam `evento.title`; Home (`features/home/data/get-home-page.ts`), Feed (`features/feed/data/get-feed-page.ts`) usam `eventNameFromPack(packId)` = texto-exemplo da landing (`landing.exemplo.nome`), ignorando `evento.title` (comentário no código admite "quando o campo for configurável").
5. `GuestHeader` sem affordance de navegação (título sublinhado só no hover) e sem botão voltar; `ProfileHeader` (§7) tem seta — inconsistente.
6. Rótulos da nav a 9 px (`text-[0.5625rem]`) uppercase; vários textos a 10–11 px (`CoverShortcut` 10/11 px, `AlbumCounters` 9 px, hora do `HourStrip` 9 px).
7. Toasts são `fixed z-50` e `BottomSheet` é `<dialog>` em top layer: um `showToast` disparado com sheet aberto fica atrás do sheet (não verificado visualmente).
8. Emojis como iconografia (📸 NoSession, 🎉 GateOpened/Celebration, ⭐✨🌟💫 partículas) vs. SVGs no resto (`AudioBadge` do story-rail diz "nunca emoji"); `HeartIcon` em `PhotoCard` (Home) vs. regra "sem ícone de coração" e vs. `Star` do resto.
9. `OfflineBanner` usa `role=status` com `aria-live=assertive` (conflito semântico); texto promete "suas fotos... sobem quando voltar" — só vale com sessão (`GlobalQueue` só monta com sessão do evento) e na tela de entrada/EventNotice nem o banner existe.
10. `IdentitySheet` (nome+consentimento tardio, ADR 0021) existe com teste mas NÃO é importado por nenhuma tela (grep) — código morto/feature não plugada.

## 1. `/e/[slug]` — Entrada (EntryFlow) — convidado sem sessão

**Arquivos:** `app/e/[slug]/page.tsx`, `features/guest/components/client/entry-flow.tsx` (+`albora-logo`, `lib/pack-text`), `ui-web` (PrimaryButton, SecondaryButton, Button, Card, NameField, ConsentCheckbox, TextLink, ConsentNote, ErrorMessage, FinePrint, DisplayTitle, EntryColumn).
**Propósito:** primeira tela do QR: capa emocional → nome + consentimento → cria sessão (sem login).

**Etapas (state machine `chegada → identidade → recusou`):**
- `chegada` (`ArrivalScreen`): capa full-bleed (`coverImageUrl` assinada, foco via `capaObjectPosition`, senão fundo `superficie-alta`), scrim `from-bg via-bg/80 to-bg/60`; "VOCÊ FOI CONVIDADO PARA" + `h1` nome do evento + data (pt-BR, client) · local (`identityTokens.local`) + "As melhores memórias são feitas juntos. Estamos felizes por ter você aqui." + botão "Entrar na festa" + "Sem app · sem cadastro · sem baixar nada". `GuestShell hideStatusBar`.
- `identidade`: `<form>` com evento, `saudacao` do pack (`convidado.saudacao`), "Como você quer aparecer? Só o primeiro nome.", `NameField` (placeholder "Tio João", aria "Seu nome", autoFocus, pré-preenche de `localStorage albora:nome`), `Card` com `ConsentCheckbox` (marcado por padrão) "Suas fotos poderão aparecer no álbum e no telão deste evento." + link "Ver detalhes" (mostra `ConsentNote` com `textoDoConsentimento("entrada", vigente)`), "Você pode remover suas fotos depois, no seu perfil.", "Versão {vigente} · {data}", botão "Continuar" (disabled sem nome/consentimento/enviando; "Entrando…"), botão terciário "Prefiro não", "Sem cadastro, sem senha e sem baixar nada".
- `recusou`: "Tudo bem. / Se mudar de ideia, é só voltar pelo QR da mesa." + "Voltar" (→ identidade).

**Ação/API:** `POST /api/sessions` `{eventoId, nome, consentimento, via}`; sucesso → grava `albora:nome`, `window.location.href=/e/{slug}/cover` (vai para a CAPA, não para a Home). Erros: `limite.excedido` → "Muita gente entrando ao mesmo tempo. Tente de novo em um minuto."; outro → "Não consegui entrar. Tente de novo."; rede → "Sem conexão. Chegue mais perto do roteador e tente de novo." Também `registerServiceWorker()` no mount.
**Validações:** nome `trim().length>0`; consentimento obrigatório; limite de tamanho do nome — não verificado no cliente (`NameField`).
**A11y:** `SkipLink`; `main#main-content` na chegada; `aria-busy` no form.
**Problemas:**
- Consentimento vem PRÉ-MARCADO (`useState(true)`): consentimento LGPD "afirmativo por padrão" é frágil; botão "Continuar" fica habilitado ao digitar o nome sem que a pessoa tenha lido nada.
- "Prefiro não" leva a beco ("só voltar pelo QR") e ainda mostra tela de recusa sem opção de ver o álbum/entender o que perde; sem explicar o que "não" significa (sem sessão = sem fotos).
- Texto promete "Você pode remover suas fotos depois, no seu perfil" — a remoção no Perfil existe só pelo viewer (botão "×" sem texto, ver §10) — promessa vs. descoberta.
- "Sem app · sem cadastro" na chegada e "Continuar" depois: o CTA principal da etapa 1 ("Entrar na festa") não diz que vai pedir nome; sem indicador de etapa.
- Data/local da `chegada` só aparece após `useEffect` (client) → salto de layout; título `h1` com `clamp(2.5rem,8vw,6rem)` pode ficar grande em nomes longos (usa `break-words`).
- `window.location.href` (full reload) em vez de router — aceitável p/ cookie, mas piscada.
- Rótulo "Versão v1 · 24 de outubro" (11 px, `ink-2`) é jargão para o convidado.
- `<img>` da capa sem `loading`/otimização; alt vazio (decorativa, ok).

## 2. `/e/[slug]/cover` — Capa do evento (features/cover)

**Arquivos:** `app/e/[slug]/cover/{page,error}.tsx`, `features/cover/components/client/cover-page.tsx`, `components/ui/{cover-hero,cover-event-info,cover-shortcut,invite-button,moment-card,moments-section,music-icon}.tsx`, `components/server/cover-content.tsx`, `components/skeletons/cover-page-skeleton.tsx`, `data/get-cover.ts`, `hooks/{use-stats-polling,use-interaction-gate,use-photo-flash}.ts`, `lib/{interaction-banner,mission-for-moment,moment-contributors,cover-utils,is-interaction-open}.ts`; reusa `features/guest/.../host-message-card.tsx`.
**Propósito:** hub pós-entrada: herói, nome/data/pessoas, estado do gate, recado dos anfitriões, atalhos, momentos (missões do pack), CTA enviar foto.

**Elementos e ações:**
- Herói (`coverImageUrl` ou 1ª foto do álbum; senão `Frame` atmosfera) + gradiente; `CoverEventInfo`: nome, data, "N pessoas fotografando" (só se >0).
- Banner de gate (`role=status`): texto do pack (`interacao.aberta/fechada/fechada.agendada` com `{hora}` no fuso do evento); recalcula local a cada 30 s e re-sincroniza com `GET /api/e/{slug}/stats` a cada 60 s (`useInteractionGate`).
- `HostMessageCard` (recado; ver §9).
- 4 atalhos (grid 4 col): Álbum (valor = nº fotos, polling 60 s + "flash" de cor ao mudar; "em breve" se 0), Feed ("ao vivo"/"em breve" conforme gate), Missões (nº de missões ou "—"), Música (rótulo da música do casal truncado ou "trilha").
- Linha de links 12 px: título do confessionário (se pack tem) `→ /confessional` · "Ligar telão" `→ /wall-pair` (rota fora de `/e/{slug}`; propósito não verificado em detalhe: `WallPairClient` com código).
- `MomentsSection`: carrossel horizontal snap de até 5 momentos do pack (card central 9,25 rem "agora" badge se gate aberto; laterais 5 rem a 60% opacidade), cada um `Link` → `/photo?missao={id}` (aria "Fotografar {momento}"), miniatura real do álbum ou `Frame`, e "Ana, João e +N fotografaram esse momento" (query SQL de contribuidores com `filtroSemBloqueio`). "ver álbum" → `/album`.
- Botões: `PrimaryButton` "Enviar foto" (`router.push(/photo)`), `InviteButton` "Convidar amigos" (Web Share `{title,url:/e/{slug}}`; fallback clipboard → "Link copiado!" 2,5 s; falhas silenciosas).
- `FloatingNav` sem `active`.
**APIs:** `GET /api/e/{slug}/stats` (polling). SSR: `listChallenges`, `eventPack`, `montarAlbumServido`, `musicaDoCasal`, `signGet(coverImageKey)`.
**Estados:** loading = `CoverPageSkeleton`; erro = `cover/error.tsx` ("A capa não carregou"); gate fechado = banner + "em breve"; sem momentos = seção some; polling falho = silencioso.
**Problemas:**
- Atalho "Feed" aparece como "em breve" mas leva ao feed (modo espelho funciona) — rótulo promete indisponível.
- "Missões" mostra contagem total (`album.contadores.missoes`, ambíguo: missões do evento ou concluídas?) e "—" quando 0.
- Valor do atalho Música ("trilha") e Missões a 11 px; grid de 4 colunas com rótulos 10 px ≈ ilegível em telas pequenas; nav inferior já duplica Álbum/Missões.
- Momentos laterais com `opacity-60` e título 11 px (contraste baixo); card é link inteiro sem indicar que abre câmera.
- "Ligar telão" na capa do CONVIDADO: ação de anfitrião/operador exposta a todos; link 12 px; destino fora do escopo do evento; sem explicação.
- Convite: `InviteButton` compartilha o link de ENTRADA do evento (`/e/{slug}`) — qualquer pessoa com o link vira convidado; sem confirmação de erro quando clipboard falha.
- CTA "Enviar foto" fica no fim da página (abaixo de momentos); a câmera depende de scroll ou da nav.
- Texto de gate vem do pack mas "Interação em breve"/hora é o único aviso do gate; sem countdown.
- `HostMessageCard` aqui E na Home como story E no Feed: o recado aparece em 3 lugares com dismissals independentes ("Seguir" na capa/feed vs fechar no story → todos chamam `marcarRecadoLido`, mas cada instância mantém estado local).

## 3. `/e/[slug]/photo` (fora do escopo pedido — só referência)
`photo/page.tsx` → `PhotoContent` (features/photo, não inventariado aqui). Aceita `?missao=`, `?prompt=`, `?video=1`. Sem sessão → `NoSession` (sem `isSameEventSession`). Confessionário grava via `/photo?prompt={chaveTitulo}&video=1`.

## 4. `/e/[slug]/feed` — Feed (features/feed)

**Arquivos:** `app/e/[slug]/feed/{page,error}.tsx`; `features/feed/components/client/{feed-page,post,photo-interaction,comment-sheet,report-sheet,reaction-list-sheet,viewer,frame,hour-strip,mirror-grid,feed-styles,viewer-keys}`, `components/ui/{feed-empty-state,feed-filter-panel,feed-footer,gate-opened-overlay,new-photos-button,temporal-filter}`, `components/server/feed-content`, `skeletons/feed-page-skeleton`, `data/get-feed-page.ts`, `hooks/{use-feed,use-comments,use-reaction,use-reaction-list,use-feed-viewer,use-feed-filter,use-temporal-filter,use-gate-transition,use-new-items-notification,use-infinite-scroll,use-reduced-motion}`, `lib/group-by-hour`, `services/feed-service.ts`. Reusa `HostMessageCard`, `useShare`, `ShareConsentSheet`, `MolduraPicker` (my-photos), `GateNotice`, `Badge`.
**Propósito:** ver as fotos da festa; reagir; (pós-gate) comentar, compartilhar, denunciar, bloquear.

**Dois modos (`interacao`, vem do servidor no payload de `/api/feed`):**
- `espelho` (gate fechado): `GateNotice` "Comentários abrem no horário escolhido por {anfitriões}. Pode curtir à vontade — continue fotografando, tudo já está no álbum." + `MirrorGrid` (grade 2 col quadrada `object-cover`, vídeo com ▶, CTA "Tirar foto"). Toque abre `Viewer`. Sem filtros temporal/missão/HourStrip.
- `completo`: `TemporalFilter` (Hoje/Ontem/Esta semana/Tudo, persiste em `sessionStorage`), `HourStrip` (círculos por hora "21h", visto/não visto, "Horas da festa"), `FeedFilterPanel` (abas Tudo + missões do evento, `aria-pressed`), coluna `role=feed` de `Post`s.

**`Post`:** `PostHeader` (avatar+nome link ao perfil `/g/{sessaoAutor}`, tempo relativo · lugar), mídia `aspect-4/5` com `object-contain object-top` (foto) ou `<video>` (muted, preload metadata) dentro de botão "Abrir foto/vídeo de {autor}" (abre Viewer da hora), `PhotoInteraction`, legenda.
**`PhotoInteraction`:** botão estrela "Curtir/Remover curtida" (`aria-pressed`, `PUT/DELETE /api/reaction`, otimista, fila offline `interaction-queue` re-drenada no `online`), contador clicável "Ver quem curtiu" (`GET /api/reaction?uploadId=` → `ReactionListSheet` "Quem curtiu" com nomes→perfil); só `completo`: botão comentar (contador), botão "Mais opções" → sheet "Opções" com "Compartilhar nas redes" (só `minha` e `onCompartilhar`) e "Denunciar".
**Sheets/modais:**
- `CommentSheet` ("Comentários (N)"): lista com respostas (1 nível), "Responder", "Remover" (só meu), menu "…" por comentário alheio com "Denunciar" e "Bloquear {nome}" (foco no 1º item, ESC fecha), compositor `input maxLength=MAX_CARACTERES` + contador regressivo + "Enviar" + `SecondaryButton` "Fechar"; estados "Carregando…", "Seja o primeiro a comentar.", erro "Não deu agora. Tente de novo." (`role=alert`), comentário otimista "· enviando" e fila offline. API: `GET /api/comments?upload_id=`, `POST/DELETE /api/comments`, `POST /api/comments/report`, `POST /api/blocks`.
- `ReportSheet` ("Esta foto"): rádio "Esta foto não deveria estar no evento" / "Sou eu nessa foto — tire do telão e do álbum" (oculta se `minha`), textarea "Motivo (opcional)" 280 chars + contador, "Bloquear {autor}" (se `sessaoAutor` e não minha), "Confirmar denúncia"; confirmação "Recebido. O anfitrião vai revisar." `POST /api/media/report` `{uploadId,kind,motivo}`; bloquear `POST /api/blocks` → `onBloqueado` (= `recomecar`, reinicia o feed).
- `ShareConsentSheet` ("Compartilhar fora da festa"; checkbox "Incluir meu primeiro nome na moldura"; "Continuar"/"Agora não"), `MolduraPicker` ("Compartilhar nas redes": prévia 9:16, modelos Polaroide/Ambiente/Cheia, "Pode incluir outras pessoas que aparecem na foto.") — ver §10 (`/api/share`).
- `GateOpenedOverlay` ("A festa está liberada" 🎉, "Ver as fotos"/"Tirar foto"; auto-fecha em 6 s, ESC/clique fora) quando `espelho→completo` (`useGateTransition`).
- `NewPhotosButton` pílula fixa "↑ Novas fotos" (quando o 1º item muda; some ao rolar <120 px).
**`Viewer` (modal tela cheia `div role=dialog aria-modal`):** `Frame` (foto `contain` sobre fundo desfocado; thumb → full; vídeo com `onEnded` avança), barra de filetes por foto, rótulo da hora, botões "×" remover (só quando `onRemover`) e "Fechar", zonas de toque anterior (34%)/próxima, rodapé: autor (link ao perfil) · lugar, legenda, `PhotoInteraction`, link "Tirar foto". Auto-avanço 5 s por foto (não em vídeo, não com `prefers-reduced-motion`, pausa em toque longo >220 ms); deslizar baixo fecha, esquerda/direita navega; teclado ←/→/Home/End/Esc; pré-carrega 2 próximas; ao fim da hora fecha. `aria-label "Fotos das 21h"`, região viva "i de N: foto de {autor}".
**Estados do feed:** carregando (esqueletos `HourStripLoading`/`PostLoading`/`MirrorGridLoading`); vazio contextual (`FeedEmptyState`: nenhum/ nenhuma de "missão"/período + CTA "Tirar foto"); `midiaIndisponivel` ("As fotos não carregaram agora. A gente tenta de novo sozinho..."); falha de página: "Não consegui carregar mais fotos agora." + "Tentar de novo"; sessão expirada: link "/scan"; fim: texto sr-only "Fim do feed"; infinite scroll (IntersectionObserver, margem 600 px).
**APIs:** `GET /api/feed?missao=&cursor=` (sincroniza topo a cada 30 s; vigia gate a cada 30 s e reinicia quando `espelho→completo`), `POST /api/media/urls` via `mediaUrls` (URL assinadas, renova a cada 30 s), `/api/reaction`, `/api/comments`, `/api/comments/report`, `/api/media/report`, `/api/blocks`, `/api/share` (via `useShare`), `/api/recado` (HostMessageCard). Server: `listChallenges`, funil `feed_open`.
**Problemas:**
1. Denunciar/Bloquear/Compartilhar só existem em `completo`: no modo espelho (gate fechado — pode durar horas) NÃO há nenhum caminho para denunciar foto ofensiva no feed (o álbum, ao contrário, oferece "Pedir para tirar" sempre). Inconsistência de segurança/UX.
2. Filtro temporal é só client-side sobre os itens já paginados: "Hoje/Ontem" pode mostrar vazio ("Nenhuma foto hoje") enquanto a próxima página (não buscada) tem fotos; carregar mais não considera o período. Também `FeedEmptyState` "Tire uma agora" pode estar errado.
3. `Viewer` auto-avança e FECHA após a última foto mesmo com sheet de comentários/denúncia aberto (timer só pausa em toque longo): digitar um comentário dentro do viewer pode ser interrompido; sheet abre por cima de `div` modal que não gerencia foco (sem foco inicial, sem trap, sem restaurar foco).
4. IDs duplicados `viewer-help` (dois `<p id="viewer-help">` no `Viewer`), `aria-describedby` ambíguo; `aria-label "Fotos das 21h"` incorreto quando o viewer é usado por Home/Perfil/Minhas (itens de várias horas).
5. Botão remover do viewer é um "×" textual com `aria-label`; `Fechar` e "×" lado a lado sem rótulo visível ("Remover" parece "Fechar") — risco de apagar foto por engano; remover não pede confirmação.
6. Toast "Preparado para stories" (`PhotoInteraction.handleCompartilhar`) dispara mesmo se o fluxo de share foi cancelado/erro silencioso (`onCompartilhar` não retorna sucesso); texto fala em "stories" mas o fluxo é Web Share/download.
7. Falha ao denunciar foto é silenciosa (`ReportSheet.sinalizar` ignora `!r.ok`: botão só volta); falha ao bloquear idem. Denunciar comentário anuncia "Comentário denunciado" antes do resultado e não dá feedback visual; bloquear sem confirmação e sem desfazer.
8. Curtir offline: `reacao.alternar()` retorna `undefined` ao enfileirar → toast de erro "Não foi possível curtir" apesar de estar enfileirado e otimista (estado reverte? o estado otimista fica) — mensagem contraditória.
9. Reação "estrela" única (`TIPO_PADRAO="estrela"`) e contador "0" cinza sem ação; "Ver quem curtiu" lista nomes+perfis — placar social vs. a regra do HourStrip ("sem placar de popularidade") e `ProfileStats` "Curtidas".
10. Ícones/alvos: botões do `PhotoInteraction` têm `min-h-11` mas largura = conteúdo (estrela 24 px sem min-w) — alvo estreito; `FilterTab` com `aria-pressed` E `aria-current="page"` (semântica errada); `Circulo` do HourStrip com rótulo 9 px.
11. `FeedColumn role="feed"` + `article` sem `aria-posinset/setsize` (feed ARIA incompleto); `Post` abre `Image alt=""` dentro de botão, ok, mas versão sem `onAbrir` usa `alt=legenda`.
12. `GateOpenedOverlay` é `aria-modal` sem foco/trap e some sozinho em 6 s (leitor de tela perde); emoji.
13. Compositor de comentário: `id="comment-input"` fixo (colide se mais de um `CommentSheet` montado; `HomeFeedCard` monta um por card em `completo`; `BottomSheet` mantém `<dialog>` montado fechado) — **não verificado em runtime**. Botão "Fechar" redundante com handle/ESC; contador regressivo só após digitar.
14. `HostMessageCard` no topo do feed usa `hostName={eventTitle}` (nome do pack, não dos anfitriões) como avatar.

## 5. `/e/[slug]/g/[autorId]` — Perfil de autor (features/guest-profile)

**Arquivos:** `app/e/[slug]/g/[autorId]/page.tsx`, `components/client/author-profile-page.tsx`, `components/ui/{profile-header,profile-stats,photo-grid}.tsx`, `hooks/{use-author-feed,use-profile-viewer}.ts`.
**Propósito:** ver as fotos de uma pessoa (somente leitura).
**Funcionalidades:** `ProfileHeader` (seta Voltar→capa, `Avatar` iniciais, nome `h1`, stats "Fotos"/"Curtidas"), `PhotoGrid` 3 col quadrada (`aria-label "Foto de {nome}, i de N"`, selo "vídeo"), `Viewer` compartilhado (sem reação otimizada: não passa `onReacoes`/`onBloqueado`/share), scroll infinito, estados.
**API:** `GET /api/guests/{autorId}?cursor=` (404 → `naoEncontrado`; 401/403 → sessão), renovação de URLs a cada 30 s, `mediaUrls`.
**Estados:** esqueleto de grade; vazio "Ainda não tem foto aqui. / Quando esta pessoa mandar uma foto, ela aparece aqui." + CTA câmera; "Esse perfil não está disponível / Pode ser um link antigo, ou alguém fora do seu alcance." (404: outro evento, bloqueado, antes do gate); rodapé de erro/sessão como feed.
**Problemas:** não há "Bloquear/Denunciar" na página do perfil (só dentro do viewer, e só pós-gate); viewer importado estaticamente (feed usa `dynamic`); "Curtidas" total expõe popularidade; seta Voltar sem alvo mínimo 44 px e sempre à capa (não ao histórico, o que deveria voltar ao feed/story de origem); não passa pelo `GuestHeader`; nome do perfil só aparece depois do fetch (avatar-skeleton); `SkipLink` presente mas sem `main` próprio? usa `GuestMain` (ok).

## 6. `/e/[slug]/missions` — Missões (features/missions)

**Arquivos:** `app/e/[slug]/missions/{page,error}.tsx`, `components/client/missions-page.tsx`, `components/ui/{camera-button,celebration-overlay,completed-list,free-mode-state,mission-completion-toast,mission-item,missions-badge,missions-progress}.tsx`, `hooks/{use-celebration,use-mission-completion-toast,use-missions-progress}.ts`, `lib/missions-utils.ts`, `data/get-missions-page.ts`.
**Propósito:** lista de missões fotográficas do pack, progresso, atalho para câmera com `?missao=`.
**Ações/UI:** `GuestHeader` "Missões" + `MissionsBadge` (done/total, aria "2 de 8 missões completas"); `MissionsProgress` barra % ("Todas completas"/"N de M missões"); missão atual = card destaque `Link` → `/photo?missao={id}` ("Missão III", emoji+título, "Toque para fotografar"); lista "Outras missões" (TODAS, com ✓ "Feita" ou numeral romano, link p/ `/photo?missao=`; feitas = `div aria-disabled`); CTA "Fotografar sem missão"; todas feitas: ✓ "Todas as N missões completas! / Agora você pode fotografar o que quiser..." + "Abrir câmera livre" + "Missões completadas"; sem missões: `FreeModeState` "Modo livre / Este evento não tem missões..." + "Abrir a câmera".
**Overlays:** `CelebrationOverlay` (🎉 + 12 partículas emoji, botão tela cheia "Fechar celebração", auto-some 2,8 s) quando `allDone`; `MissionCompletionToast` (`role=status`: "{missão} completa"/"Metade das missões completas"/"Todas...", link "Próxima: …", fecha "×") quando o progresso muda em relação ao último estado salvo.
**API:** nenhuma no cliente (SSR `listChallenges(eventoId, sessaoId)` — status `feito` por sessão).
**Estados:** modo livre; atual; tudo feito; loading=skeleton; erro=`error.tsx`.
**Problemas:**
- `useCelebration(allDone)` inicia `celeb = allDone`: a celebração tela-cheia reaparece TODA vez que a pessoa abre `/missions` com tudo concluído (não só na conclusão).
- Detecção de conclusão via `localStorage["albora_missions_last_state"]` — chave global, NÃO escopada por evento: múltiplas festas no mesmo aparelho comparam estados distintos → toast espúrio ou nenhum; e só dispara ao visitar `/missions`, não ao enviar a foto (o CTA pós-envio vive em `features/photo`, não verificado).
- "Outras missões" lista também a atual e as feitas (rótulo enganoso); missões feitas não permitem rever a foto nem refazer; sem contagem de fotos por missão nem "quem fez".
- Toast fecha com "×" 32 px (<44 px); CTA câmera usa `router.push` em `<button>` (sem semântica de link; sem prefetch).
- Emojis como ícones; `aria-disabled` em `div` sem papel.
- Barra de progresso sem `role=progressbar`/valores; só texto.
- Copy "Missão III" romano ao lado de "N de M" decimal (dois sistemas de numeração).

## 7. `/e/[slug]/music` — Música (features/music)

**Arquivos:** `app/e/[slug]/music/{page,error}.tsx`, `components/client/{music-page,suggestion-form}.tsx`, `components/server/music-content.tsx`, `skeletons/music-page-skeleton.tsx`, `data/get-music-page.ts`, `hooks/use-music.ts`, `lib/{suggestion-copy,queue-for-screen}.ts`, `types/*`.
**Propósito:** mostrar a trilha escolhida pelos anfitriões e coletar/votar pedidos musicais (aparecem no telão — `queueForScreen`).
**UI/ações:** `GuestHeader "Música da festa"` (+badge "Carregando…"); `NowPlaying` card (capa ou `Frame`, rótulo da faixa, label do pack `musica.escolha`, onda animada de 24 barras, botão "Abrir no {Spotify/YouTube Music/…}" `<a href>` externo); `NoTrackYet` ("A trilha ainda não foi escolhida"); seção "Pedidos musicais": gate aberto → texto "Cole o link da música..." + `TextField` "Link da música" (`type=url`, `inputMode=url`, placeholder spotify) + "Colar da área de transferência" (`navigator.clipboard.readText`) + "Sugerir música"; teto `TETO_DE_SUGESTOES_POR_SESSAO` ("Você já sugeriu N faixas. Pode votar nas que já estão na lista."); lista de sugestões (título — artista ou "Spotify · faixa", link, "N votos", botão "Também quero" = reenvia a mesma URL via `onSuggest`); gate fechado → "Os pedidos musicais ainda não foram liberados..."; lista vazia "Nenhuma sugestão ainda...".
**API:** `GET /api/music` (musica, sugestoes, interacao), `POST /api/music {url}` (sugerir/votar). Erros mapeados em `suggestionMessage` (provedor não aceito → "Link não aceito. Use Spotify, YouTube Music, Apple Music ou Deezer.", etc.).
**Estados:** carregando (skeleton), sem faixa, falha `session` ("Sua sessão desta festa expirou. Volte pelo QR da mesa."), `network` ("Não deu para carregar agora."), gate fechado, teto atingido, erro de sugestão (`ErrorMessage`).
**Problemas:**
- A onda animada dentro de "NowPlaying" sugere reprodução ao vivo, mas a página só linka para fora (nada toca aqui; a faixa "do casal" é estática) — promete o que não garante; sem `aria` explicando.
- Gate só é lido uma vez (`load` no mount): sem polling, ao abrir o gate a seção continua "ainda não liberados" até recarregar (feed/cover pollam, música não). `suggestionMessage("musica.interacao_fechada")` sem ponto final (inconsistente).
- Falha `network` não tem botão "Tentar de novo" (só mensagem) e esconde o formulário.
- "Também quero" sem estado "já votei"/toggle e `disabled` para TODAS as linhas durante qualquer envio; voto repetido não é explicado; sugerir link duplicado = voto (mesmo botão), mas o campo diz "sugerir".
- Colar da área de transferência pede permissão do navegador em cada toque; link externo sem `target`/`rel` (sai do PWA).
- `capReached` só vira `true` após rejeição do servidor (não é calculado a priori).
- Título 'Música da festa' é `a` para cover (padrão do GuestHeader). Música fora da `FloatingNav`; acesso só pela capa.
- Botão "Colar..." 12 px e link da sugestão truncado.

## 8. `/e/[slug]/confessional` — Confessionário

**Arquivos:** `app/e/[slug]/confessional/page.tsx` (único; os hooks `use-guestbook`, `host-message-card`, `voice-note-player` NÃO são usados por esta página — pertencem ao recado, §9). `ui-web`: `Badge`, `FloatingNav`, `GuestHeader`, `GuestMain`, `GuestShell`, `SkipLink`.
**Propósito:** lista de prompts de vídeo do pack para gravar depoimento; reusa a câmera.
**UI:** `GuestHeader` (título do pack `confessionario.titulo`, home=cover), lede (`confessionario.lede`), lista `ul` de `Link` → `/photo?prompt={chaveTitulo}&video=1` com texto do prompt e `Badge` "Gravar vídeo"; `FloatingNav` sem `active`. SSR (server component), nenhuma API de cliente.
**Estados:** evento não aberto → `EventNotice "Essa festa não está aberta agora"` + `showRescue`; sem sessão do mesmo evento → `NoSession`; pack sem confessionário → "Confessionário indisponível / Este evento não tem confessionário ativo."; sem `error.tsx`/`loading.tsx` próprios (usa os do segmento pai).
**Problemas:** só é alcançável pelo link de 12 px da capa (se pack tem); itens sem indicação de duração/limite nem se já gravou; sem estado "já gravei esse"; consentimento de vídeo/privacidade do depoimento não mostrado; sem `Suspense`/skeleton (consulta DB bloqueia o render); `Badge` repetido em todos os itens vira ruído; usa `isSameEventSession` (diferente das outras subrotas).

## 9. Recado dos anfitriões (features/guest: host-message-card, voice-note-player, use-guestbook; features/home: recado-story)

**Propósito:** mensagem de texto (+áudio opcional) dos anfitriões ao convidado ("recado"; rótulo via pack `recado.rotulo`).
- `HostMessageCard` (capa e topo do feed): `Avatar` (nome do evento), rótulo, `VoiceNotePlayer` (play/pause "Ouvir recado/Pausar recado", duração m:ss, falha → some), texto recortado a 160 chars com "ver inteiro", botão "Seguir" (dispensa; `POST /api/recado`).
- `RecadoStory` (Home): story tela-cheia (primeiro item "Recado" do `StoryRail`, anel especial + selo de áudio): rótulo, texto grande, `VoiceNotePlayer tamanho=lg`, "×" fechar/ESC/clique fora → `marcarRecadoLido`. Foco inicial no fechar, trava scroll.
**API:** `GET /api/recado` → `{mostrar, tela:{texto, audio:{url,duracaoSegundos}}}`; `POST /api/recado {}` marca lido. 401/403 → falha `sessao` (silenciosa na UI).
**Problemas:** botão "Seguir" para dispensar é rótulo obscuro (semântica de "dispensar/ok"); card some para sempre depois de dispensado e só reaparece como story, sem histórico; `<audio preload=none>`: falha do áudio some o player sem aviso; play/pause em glifos ❚❚/▶ (texto, não SVG) e botão `size-8` (32 px; `before:-inset-1.5` amplia o alvo); `RecadoStory` `aria-modal` sem focus trap; falhas de rede silenciosas (convidado não sabe que existe recado); `HostMessageCard` usa `hostName` = título do pack.

## 10. `/e/[slug]/my-photos` — "Perfil" / Minhas fotos (features/my-photos)

**Arquivos:** `app/e/[slug]/my-photos/{page,error}.tsx`, `components/client/{my-photos-page,album-footer-cta,retention-card,share-consent-sheet,moldura-picker,recap-card,recap-sheet}.tsx`, `components/ui/{gallery-item,miniatura-minhas,recap-section,colagem-section,retry-section}.tsx`, `hooks/{use-gallery,use-share,use-recap,use-recap-card}.ts`, `lib/{share-gate,recap,recap-card,recap-share,compartilhar-link,utils}.ts`, `data/get-my-photos-page.ts`; reusa `features/guest/.../{theme-setting,claim-photos-button}.tsx`, `Viewer`.
**Propósito:** galeria pessoal (enviadas + pendentes locais da fila offline), compartilhar fora, recap/colagem, tema, guardar fotos (login tardio), loop de aquisição.

**Seções/ações (ordem):**
1. `GuestHeader "Perfil"` + badge de resumo ("12 fotos" / "N enviadas · M subindo" / "Carregando…").
2. `RecapCard` "Você mandou N fotos · curtida X vezes" (`GET /api/guests/me/recap`; some se falha/0).
3. Erros: "Não deu para carregar agora." (sem retry), `compartilhar.erro`, `recap.erro`.
4. Vazio: "Suas fotos vão aparecer aqui / Quando você tirar a primeira, ela sobe sozinha..." + "Tirar foto".
5. Grade 3/4 col `GalleryItem`: enviada = botão "Abrir esta foto/vídeo" (abre `Viewer` com `onRemover`, `onCompartilhar`, reações); pendente = miniatura local (blob da fila IndexedDB `webQueue`) com "×" "Remover esta foto" (alvo 44 px) e rótulo "Subindo…" / "Guardamos no celular. Vamos tentar de novo." (falhou).
6. `RecapSection` "Recap da festa" (se ≥3 elegíveis, até 10 por engajamento+recência, sem IA): "Ver meu recap" → `RecapSheet` (tela cheia, carrossel de quadros com moldura, "Recap · i/N", "Compartilhar recap", na última tela + `refToken` convite "Conhecer a Albora").
7. `ColagemSection` "Colagem da noite" (≥2 enviadas; usa as 4 primeiras): "Criar colagem".
8. `RetrySection` (fotos que falharam): "Guardamos N fotos no celular. Vamos tentar de novo?" + "Tentar de novo" (`reiniciarTodosFalhos` + `drainAndReport`).
9. Aviso do evento `revisaoAntesDoTelao`: "Neste evento, os anfitriões revisam as fotos antes de elas aparecerem no álbum e no telão. As suas chegaram — é só aguardar."
10. `RetentionCard` "Salve suas fotos e receba o álbum" + `ClaimPhotosButton` "Receber minhas fotos" → `/auth/google/start?surface=guest&eventId=` (login tardio Google, opcional, ADR 0018).
11. `AlbumFooterCta`: "Compartilhar álbum" (Web Share/clipboard do link PÚBLICO `/p/{slug}`; "Link copiado" 2 s) + "Crie o álbum da sua festa" `/?ref={token}` (eventos de produto `guest_share_album`, `guest_cta_criar_click`).
12. `ThemeSetting` "Aparência": rádio Escuro/Claro (cookie, `data-tema` no `#guest-root`).
**Compartilhamento de foto (fluxo):** Viewer/feed → "Compartilhar nas redes" → `GET /api/share?uploadId=` (autorização/consentimento) → se pendente `ShareConsentSheet` ("Compartilhar fora da festa", texto versionado, checkbox nome na moldura) → `POST /api/share` (consentimento) → `MolduraPicker` (prévia real 9:16, Polaroide/Ambiente/Cheia) → `shareOrDownload` (Web Share ou download). Mensagens de `MENSAGENS_DE_SHARE` (ex.: "Nesta festa, postar para fora está desligado.", "Esta foto não cabe na moldura sem cortar o topo."). Colagem e recap passam pelo mesmo consentimento.
**APIs:** `GET /api/my-photos`, `DELETE /api/uploads {uploadId}`, `GET/POST /api/share`, `GET /api/guests/me/recap`, `/api/media/urls`, `/auth/google/start`.
**Problemas:**
1. Título/ABA "Perfil" mas a tela é "Minhas fotos": não há nome, avatar, edição do nome nem excluir conta/dados — falta onde "remover suas fotos depois, no seu perfil" e direitos LGPD (revogar consentimento, excluir tudo) são prometidos (ADR 0018/CLAUDE.md "Excluir conta exclui de verdade"): nenhuma opção de apagar tudo/sair/revogar na tela.
2. Remover foto ENVIADA só é possível dentro do viewer via botão "×" (sem texto, ao lado de "Fechar"), sem confirmação nem desfazer; falha no `DELETE` retorna `false` sem mensagem. Na grade o "×" só existe para pendentes — assimetria.
3. Sem `SkipLink` nesta página (outras têm); estado de erro de carga sem botão de retry (`galeria.falha`).
4. "Compartilhar álbum" compartilha link público do álbum todo sem o `ShareConsentSheet` que a foto individual exige — inconsistência de consentimento externo (alcance de `/p/{slug}` não verificado).
5. Colagem usa `slice(0,4)` sem deixar escolher fotos ("até quatro fotos suas" arbitrárias); recap sem pré-visualização antes de abrir; `RecapSection`/`ColagemSection` com `PrimaryButton` repetido (3–4 CTAs primários empilhados) — hierarquia achatada.
6. Texto "Subindo…"/"Guardamos no celular..." 10 px sobre a miniatura (`bg-vidro-suave`) — legibilidade baixa; sem barra de progresso/retomada por item.
7. `RetentionCard` pede login Google ("Sem senha") — pode ser lido como cadastro; texto "Só pra guardar o que é seu" sem dizer o que acontece com dados.
8. `refToken` só chega em recap/rodapé; copy de aquisição ("Depois da sua festa você também pode ter um") dentro de tela de lembrança.
9. `ThemeSetting` enterrado no fim da tela de fotos.
10. Gate `revisaoAntesDoTelao`: frase só aparece com ≥1 foto enviada e "As suas chegaram — é só aguardar" é genérica (intencional por privacidade).

## 11. Home (`features/home`) — onde é usada

**Uso verificado:** só em `app/e/[slug]/page.tsx` → `<HomeContent>` quando há sessão do mesmo evento (`grep features/home` = 1 ocorrência). `FloatingNav` aba "Início" aponta para `/e/{slug}`.
**Arquivos:** `components/server/home-content.tsx`, `components/client/{home-page,home-feed-card,story-viewer,recado-story}.tsx`, `components/skeletons/home-page-skeleton.tsx`, `data/get-home-page.ts`, `hooks/use-stories.ts`, `lib/format-quando.ts`. Reusa `useFeed`, `useInfiniteScroll`, `Viewer`, `CommentSheet`, `useComments`, `useReaction`, `MissionsBadge`, `StoryRail`, `PhotoCard`, `GateNotice`, `EmptyState`.
**Propósito:** home social do convidado: trilho de stories (recado + fotos 24 h), cue de missão, feed vertical.
**UI/ações:**
- `GuestHeader` (nome do pack, link→capa) + badge "N fotos".
- `MissionsCue` (se há missões): link "Próxima missão / {título}" ou "Missões / Todas completas" + `MissionsBadge compact`.
- `StoryRail`: "Você" (+ → câmera), "Recado" (se houver), stories da rede (`GET /api/stories`, poll 30 s, miniaturas assinadas via `mediaUrls`; só têm `onPress` se `sessaoId`; anel "novo" se não visto).
- `StoryViewer` (tela cheia): barras de progresso 5 s, avatar/nome, "×" Fechar stories, zonas toque anterior (1/3)/próxima (2/3), swipe horizontal (>40 px), segurar pausa, setas/ESC. Marca visto em memória.
- `GateNotice` quando `espelho` ("Comentários abrem no horário escolhido por {anfitriões}...").
- Feed: `HomeFeedCard` → `PhotoCard` (autor→perfil, hora local "23:05", foto 4:5 `object-cover`, curtir com CORAÇÃO, comentar só em `completo` com `CommentSheet`), toque abre `Viewer` compartilhado (itens de TODAS as horas); estados: 2 esqueletos, vazio "Ainda não tem foto aqui. / Seja o primeiro a fotografar." + CTA, "Carregando mais fotos…", erro "Tentar de novo", sessão expirada → `/scan`.
**APIs:** `/api/feed` (via `useFeed(null)`), `/api/stories`, `/api/recado`, `/api/media/urls`, `/api/reaction`, `/api/comments`.
**Problemas:**
1. `PhotoCard` (ui-web) renderiza SEMPRE Comentar, Compartilhar e Salvar; `HomeFeedCard` só liga curtir/comentar(completo)/abrir — "Compartilhar" e "Salvar" são botões mortos (sem handler) e "Comentar" aparece (contador 0) mesmo em espelho: viola o próprio princípio do feed ("botões trancados mentiriam"). 
2. Ícone de curtir aqui é coração (`HeartIcon`) e no Feed/Viewer é estrela — inconsistência e choque com a regra "sem ícone de coração".
3. Foto do card `object-cover` 4:5 corta (cabeças) — o feed e o telão usam `contain`; sem filtros por hora/missão/período; sem denunciar/bloquear/compartilhar no card (só no viewer, só pós-gate) — mesmo gap do feed.
4. `StoryRail` tem `role="list"` com filhos sem `role=listitem` (ARIA inválido); stories sem `sessaoId` renderizam como `div` não interativo (sem explicação); story usa só a MINIATURA em tela cheia (baixa resolução); sem denunciar/ver autor/perfil no story; sem foco inicial/trap (`aria-modal`), sem `prefers-reduced-motion` (auto-avança sempre), botão fechar 36 px (`size-9`) com "×" textual; no `StoryViewer` toque simultâneo `onPointerDown/onTouchStart` pode pausar+navegar.
5. Home e `/feed` duplicam responsabilidades com UIs diferentes (Home sem HourStrip/filtros; `/feed` sem stories).
6. `HomePageSkeleton` usa `GuestHeader title="A festa"`/`homeHref="#"` (placeholder, link morto).
7. Polling: feed 30 s + stories 30 s + recado único; sem indicador "novas fotos" na Home (existe só em `/feed`).
8. Viewer da Home: `aria-label "Fotos das {hora do item}"` com itens misturados; auto-avanço + fecha ao fim leva de volta ao scroll salvo.

## 12. `/e/[slug]/album` — Álbum / "Explorar" (features/album)

**Arquivos:** `app/e/[slug]/album/{page,error}.tsx`, `components/client/{album-page,album-with-tabs,album-timeline}.tsx`, `components/server/album-content.tsx`, `components/ui/{album-counters,album-cover-hero,album-erro,album-filters,album-footer,album-lightbox,chapter-time-range,lightbox-nav-buttons,lightbox-top-bar}.tsx`, `skeletons/album-page-skeleton.tsx`, `data/get-album-page.ts`, `hooks/{use-album,use-album-filter,use-album-viewer,use-lightbox-keyboard}.ts`, `lib/{album-path,bands}.ts`. Reusa `PhotoInteraction`, `ReportSheet`.
**Propósito:** álbum cronológico em capítulos/faixas por hora, com filtro por missão e lightbox.
**UI/ações:** `CoverHero` (1ª foto desfocada+contain), `GuestHeader "O álbum"`, `AlbumCounters` ("A noite em números": fotos/pessoas/missões), `AlbumFilters` (chips Tudo + missões; `router.replace(?missao=)` mantém URL), capítulos `section` (título `h2` se `nomear`, `ChapterTimeRange` "21h – 23h", faixa "Amanhecer" em acento), faixas por hora ("21h"/"Durante a festa") com grade 3/4 col de `Tile` (botão "Abrir foto das 21h", selo ▶ em vídeo, anel em "amanhecer"). `AlbumLightbox` (`div role=dialog`): foto/vídeo, botões "Pedir para tirar" (abre `ReportSheet`) e "Fechar", zonas de toque anterior/próxima (1/3 cada), `PhotoInteraction` embaixo (curtir; comentar/denunciar só pós-gate), teclado ←/→/Esc (desativado com sheet aberto), clique no fundo fecha.
**API:** `GET /api/album` (álbum inteiro `ServedAlbum` com `expiraEm`; re-fetch automático antes de expirar URLs); `POST /api/media/report`, `/api/reaction`, `/api/comments` via componentes reusados.
**Estados:** carregando (esqueleto `album-esperando`), erro sem conteúdo (`AlbumErro`: "Sua entrada expirou" → `/scan` | "Não consegui carregar o álbum agora." + "Tentar de novo"), erro com conteúdo (`AlbumFooter`), vazio ("Ainda não há fotos no álbum."/"Ninguém fez essa ainda." + "Tirar foto"/`?missao`), conteúdo.
**Problemas:**
1. "Pedir para tirar" (botão com rótulo "tirar") abre o `ReportSheet` ("Esta foto" → "O que aconteceu?"): rótulo ≠ ação; e há duas portas para denunciar (top bar + "Denunciar" do overflow pós-gate), esta sem nome do autor/bloqueio (props não passadas).
2. Lightbox sem autor, hora, legenda, nem posição ("3 de 40"); `img alt=""` (conteúdo sem alternativa); sem swipe (só toques em 1/3 laterais); as zonas laterais sobrepõem os controles do `<video>` (controles só acessíveis no centro) — **não verificado em runtime**; sem foco inicial/trap/restauração (`aria-modal`).
3. Álbum carrega TODAS as fotos em um único `GET /api/album` (sem paginação/virtualização no cliente) — escala (centenas/milhares) **não verificado** no servidor.
4. Tiles com `aria-label` idêntico dentro da mesma hora ("Abrir foto das 21h" × N): sem contexto/autor; grid `object-cover object-top` (corta); counters 9 px.
5. Filtro só por missão (sem autor/período como no feed); `AlbumCounters` sem rótulo claro de "pessoas" vs. convidados.
6. Título "O álbum" e aba "Explorar" divergentes; `AlbumWithTabs` nome legado (não há tabs).
7. Mensagens de erro/sessão repetem três variantes de copy ("Sua entrada expirou", "Sua sessão desta festa expirou", "Falta você entrar") para o mesmo problema.

## 13. Componentes reutilizáveis (mapa rápido)

| Componente | Origem | Usado em |
|---|---|---|
| `Viewer` (+`Frame`, `viewer-keys`) | `features/feed/components/client` | Home, Feed, Perfil autor, Minhas (com remover/compartilhar) |
| `PhotoInteraction` | feed | Feed (`Post`), Viewer, Álbum lightbox |
| `CommentSheet` (app) vs `ui-web/comment-sheet.tsx` | feed / ui-web | app usa o do feed; o de `ui-web` (props `aberto/comentarios/onEnviar`) NÃO é usado pelas telas do convidado (duplicata) |
| `ReportSheet` | feed | PhotoInteraction, Álbum lightbox |
| `HostMessageCard`, `VoiceNotePlayer`, `RecadoStory` | guest/home | Capa, Feed, Home |
| `useShare`, `ShareConsentSheet`, `MolduraPicker` | my-photos | Feed, Viewer, Minhas |
| `FloatingNav`, `GuestShell/Main/Header`, `BottomSheet`, `EmptyState`, `GateNotice`, `ErrorMessage`, `Badge`, `PhotoCard`, `StoryRail`, `Frame`, `Skeleton`, `Toast/announce` | `packages/ui-web` | todas |
| `EventNotice`, `NoSession`, `RescueScanner`, `OfflineBanner`, `RouteAnnouncer`, `ThemeSetting`, `ClaimPhotosButton`, `IdentitySheet`(órfão) | `features/guest` | transversal |

## 14. APIs `/api/...` do convidado (grep fetch nos hooks)
`/api/sessions` (POST entrada) · `/api/feed` · `/api/stories` · `/api/recado` (GET/POST) · `/api/reaction` (GET lista, PUT, DELETE) · `/api/comments` (GET/POST/DELETE) · `/api/comments/report` · `/api/media/report` · `/api/media/urls` (via `mediaUrls`) · `/api/blocks` · `/api/guests/{id}` · `/api/guests/me/recap` · `/api/my-photos` · `/api/uploads` (DELETE) · `/api/share` (GET/POST) · `/api/album` · `/api/music` (GET/POST) · `/api/e/{slug}/stats` · rotas externas: `/auth/google/start`, `/scan`, `/wall-pair`.

## 15. Resumo dos problemas mais relevantes (priorizar)
1. Sem caminho de denúncia no feed em modo espelho; álbum tem outro rótulo/fluxo ("Pedir para tirar"). (§4.1, §12.1)
2. Home: botões Compartilhar/Salvar mortos, Comentar visível sem gate, coração vs estrela, `object-cover` corta. (§11.1–3)
3. Minhas fotos: sem excluir conta/revogar consentimento/editar nome apesar das promessas; remover foto sem confirmação/discoverability ruim. (§10.1–2)
4. Subrotas sem `isSameEventSession` (possível cruzamento de evento) e mensagem genérica de estado do evento. (§0.1–2)
5. Título do evento inconsistente (pack vs `evento.title`) em Home/Feed. (§0.4)
6. Viewer/stories/lightbox/overlays `aria-modal` sem gestão de foco, auto-avanço não pausa com sheets abertos, IDs duplicados. (§4.3–4, §11.4, §12.2)
7. Consentimento de entrada pré-marcado; recusa sem alternativa. (§1)
8. Filtro temporal client-side sobre página parcial; música sem polling do gate; celebração de missões reaparece; `localStorage` de missões não escopado por evento. (§4.2, §7, §6)
9. Alvos de toque/tipografia pequenos (9–11 px) e emojis como iconografia. (§0.6, §0.8)
10. `IdentitySheet` e `ui-web/comment-sheet` são código não usado/duplicado. (§0.10, §13)


---

# PARTE 2 — Captura, scan, pareamento, telão


Base: `apps/web` (paths relativos a ele, salvo indicação). Tudo abaixo foi lido no código; o que não deu para confirmar está marcado "não verificado". Nada foi executado nem visto renderizado.

## 0. Achados transversais (mais importantes primeiro)

1. **Não existe viewfinder de câmera.** `/e/[slug]/photo` abre um "visor decorativo" (`features/photo/components/client/camera-view.tsx`); a captura é `<input type=file capture="environment">` escondido (`photo-page.tsx`). Não há `getUserMedia`, flip, zoom, flash, grade, timer, nem estado de "permissão de câmera negada" nessa tela (o SO resolve). A tela mostra uma área vazia (`bg-superficie-vignette`) com banner de missão e chips de lugar por cima.
2. **Código morto na pasta photo:** `features/photo/components/steps/*` (camera/editor/details/success-step), `hooks/use-photo-wizard.ts`, `services/camera-service.ts` (validação 50 MB/tipos, EXIF orientação), `components/editor/chip.tsx` e `deslizante.tsx` (classes `ed-*`) só são referenciados por testes ou por ninguém. A validação de arquivo (tamanho/tipo/vazio) de `camera-service` **não roda** no fluxo real.
3. **Vídeo não tem EXIF/metadado removido.** `use-upload.ts` enfileira os bytes originais do vídeo (`new Blob([corpo])`); `prepareVideo` (`lib/domain/image/image.ts`) só gera poster e dimensões. A regra "EXIF removido no cliente" vale só para foto (`processarFoto` reencoda; `packages/core/src/exif.ts`). Metadado de contêiner (GPS de `.mov/.mp4`) segue no arquivo. Remoção no servidor: não verificado.
4. **Vídeo inteiro vai para memória** (`arquivo.arrayBuffer()` → `Blob`) sem limite de tamanho/duração no cliente (a validação de 50 MB está no código morto). Risco em aparelho fraco; não medido.
5. **Lugar escolhido na câmera some em vídeo e em lote.** `lugarPre` só alimenta `Details` (`lugarInicial`). Caminhos de vídeo e de multi-seleção do rolo pulam `Details` e vão direto para "pronto" sem `anotar` → o chip de lugar é descartado em silêncio.
6. **Botão "Rolo" morto no modo vídeo/confessional:** com `forceVideo || promptKey`, `onRoll={() => undefined}` mas o botão segue visível e habilitado (sem `disabled`, sem feedback).
7. **Promessa de "Já tá no telão."** (`Confirmacao` em `photo-page.tsx`): aparece quando `pendentes === 0 && online`, sem checar: moderação ativa, pânico/telão pausado, telão não pareado, plano sem telão, vídeo (rótulo diz "Foto N" mesmo para vídeo) ou falha definitiva na fila. O único caso tratado é `revisaoAntesDoTelao` ("Já entrou no álbum"). Com item em falha (`tentativas >= 6`) a tela continua dizendo "Já está subindo" enquanto `pendentes > 0`.
8. **Contador `numero` ("Foto N") é estado React** (`enviadas`), zera ao recarregar → recarregar `/photo` reexibe "Foto 1" e o cartão "App" + "Receber minhas fotos" como se fosse a primeira.
9. **`/scan` não abre o scanner sozinho.** `ScanPage` faz `useState(!podeEscanear)` com `podeEscanear` ainda `false` no 1º render → `showLinkForm` nasce `true` e o `useEffect` de auto-start nunca dispara. A tela abre com formulário de código e o convidado precisa tocar "Escanear o QR". (Inferência do código, não visto rodando.)
10. **Scanner depende de `BarcodeDetector`** (`features/guest/hooks/scan-qr.ts`): ausente em iOS Safari/Firefox → só código digitado, sem mensagem explicando por quê. Câmera negada: falha silenciosa (`setEscaneando(false); setPodeEscanear(false)` + foco no campo), sem texto "permissão negada".
11. **`/p/[slug]` é indexável e mostra miniaturas de convidados com CTA "Monte o álbum da sua festa"** (`generateMetadata` sem `noindex`; `getPublicEventPage` → `listarMidiaDaParede` limit 9 + `signGet` 300 s). `CLAUDE.md` diz que mídia de convidado nunca vira material de marketing. Existência de opt-in/consentimento por foto para vitrine: **não verificado** (não aparece no caminho lido).
12. **Qualquer convidado autoriza qualquer telão** (`/wall-pair`, `lib/api/handlers/wall-authorize.ts`): o código aparece na TV do salão e a tela diz "Vale para qualquer pessoa que já entrou no evento". O telão passa a exibir o evento de quem digitou. Limite 20/min por sessão; sem confirmação de "quem está ligando", sem lista/revogação de telões ligados (não verificado no admin).
13. **Pânico é toggle cego** (`PATCH /api/wall/panic` → `alternarPanicoDoEvento`, sem enviar estado desejado): dois controles (TV e admin) ou duplo clique/retry invertem o estado sem saber. Estado vale para o evento inteiro (todos os telões).
14. **URLs assinadas da parede expiram em 15 min** (`GET_TTL_SECONDS=900` em `lib/api/handlers/wall.ts`) e o SSE (`app/api/wall/stream/route.ts`) só empurra payload quando muda `id:reacoes`/pânico/contadores. Cliente renova URLs quando recebe nova página (`FOLGA_DE_RENOVACAO_MS` 90 s). Com o evento parado >15 min e SSE conectado, nenhum payload novo chega → imagens podem quebrar na TV (o polling de segurança só liga se o SSE cair). Inferência; não reproduzido.
15. **Handlers duplicados**: `lib/api/handlers/{wall,wall-pair,app-pair,...}.ts` e `lib/infrastructure/api/handlers/*` coexistem. Qual é o importado pelas rotas: não verificado.

---

## 1. `/e/[slug]/photo` — captura, editor, envio

**Arquivos:** `app/e/[slug]/photo/page.tsx`, `error.tsx`; `features/photo/components/server/photo-content.tsx`; `features/photo/data/get-photo-page.ts`; client `features/photo/components/client/{photo-page,camera-view,editor,editor-canvas,editor-controls,editor-lut,editor-texto,editor-musica,details,queue-panel,global-queue,upload-arc,pwa-install-cta}.tsx|ts`; `features/photo/components/editor/{filtros-tab,ajustes-tab,texto-tab,painel-musica,button-aba}.tsx`; hooks `use-upload.ts`, `use-event-queue.ts`, `use-pwa-install.ts`; `features/photo/lib/{acao-foco,places-from-pack}.ts`; lib `lib/queue-status.ts`, `lib/queue-retry.ts`, `lib/utils/transport.ts`, `lib/domain/image/image.ts`; núcleo `packages/core/src/{exif,processar,fila}.ts`.

**Propósito:** convidado (sem login) fotografa/escolhe mídia, edita opcionalmente (LUT, ajustes, texto, música), enfileira em fila offline persistente (IndexedDB via `webQueue`) e sobe por presign direto ao storage.

**Query params** (`page.tsx`): `?missao=<id>` (pré-seleciona missão se existir), `?prompt=<key>` (confessional; valida com `isValidConfessionPrompt`; força vídeo), `?video=1` (força vídeo).

### Etapas (máquina em `PhotoPage`: `camera → editor → detalhes → pronto`)
| Etapa | O que há |
|---|---|
| **camera** | Header: Voltar (destino: `/confessional` se prompt, `/missions` se há missões, senão `/cover`), título do evento, `QueueHeader` (pílula "N na fila"/arco "Sem sinal", só aparece se há pendentes ou offline). Corpo: banner de missão (`MissionBanner` "i/n título"; com prompt: "1/1 label"), até 4 chips de lugar (`places.slice(0,4)`, toggle `aria-pressed`). Controles: **rolo** (input multiple), **obturador** (input `capture=environment`), espaçador. Rodapé: erro de envio (`ErrorMessage`), aviso de cota de vídeo, botão **"Gravar vídeo"** (input `video/*` `capture`). Miniatura da última foto no botão do rolo (até 3 `recentes` em memória). |
| **editor** | Ver 1.1. Uma foto única passa pelo editor; **lote (multi) e vídeo pulam o editor** e enfileiram direto (comentário no código: um por arquivo, N5.6). |
| **detalhes** | "Sua foto já está subindo": textarea legenda (opcional, 280 chars, contador só depois de digitar), chips de lugar (`aria-pressed`, toggle), botões **Pronto** e **Pular** (ambos chamam o mesmo `concluir`; Pular não descarta o que foi digitado). Grava via `anotar` (fila → `webQueue.annotate`, senão `POST /api/uploads/detalhes`); falha silenciosa. |
| **pronto** (`Confirmacao`) | Foto enviada com moldura animada, título condicional (ver achado 7), `UploadArc` se pendente/offline, texto "Os anfitriões revisam…" (modo `revisaoAntesDoTelao`) ou "Pode fechar o app…" (offline), trilha musical (`GET /api/music` → "Abrir no {provedor}"), cartão "App" na 1ª foto sem pendentes (copy PWA + `PwaInstallCta` + `AppOpenCta` + "Ver código de 4 dígitos"), CTA primário (`rotuloCtaAposEnvio(proxima)`: próxima missão ou outra), "Continuar tirando" (se há próxima missão), "Ver minha foto" e "Receber minhas fotos" (`ClaimPhotosButton` → `/auth/google/start?surface=guest&eventId=`) só na foto 1, "Ir pro feed" só se `interactionOpen` (gate do casal), "Voltar" (`/cover`). `MissionCompletionToast` ao completar missão (com marco). |

### 1.1 Editor (`editor.tsx` + `editor-canvas.tsx` + `editor-controls.tsx`)
- Header: **"Tirar outra"** (descarta sem confirmar e sem dar a chance de salvar edições), **"Sem filtro"** (só visível com filtro escolhido).
- Canvas: prévia lado 1000 px (`LADO_PREVIA`) desenhada por rAF coalescido; **texto arrastável** na própria foto (pointer capture; x/y normalizados 0–1; `touch-none` só com texto); banner de missão.
- Abas (`nav aria-label="Abas do editor"`, `aria-pressed`): **Filtros** (tira horizontal de `FilterChip` com miniaturas 150 px reais; "Original" + presets de `ordenarComRecomendado(recomendadoId)`; selo "sugerido"; slider **Intensidade** 0–100 aparece com filtro), **Ajustes** (sliders Luz/Calor/Contraste bipolares ±50 e Vinheta 0–100; botão **Zerar** quando não neutro), **Texto** (um input, `maxLength` 80, tamanho fixo 0.09, posição por arrasto, "Remover"), **Música** (lista de faixas votadas de `/api/music`, toggle; vazio: "Nenhuma música votada ainda. Peça para alguém sugerir uma na aba de música do evento.").
- **Enviar** (`Button primary lg full`), `disabled` até a prévia carregar. Enviar marca `story: true` se há texto ou música.
- Estados: carregando prévia (canvas vazio sem indicador), erro de decodificação ("Não consegui abrir esse arquivo. Tire outra foto.", `role=alert`; só saída: "Tirar outra"), `degradar` (LUT por pixel degrada em aparelho lento, sem aviso ao usuário).
- Regra de arquitetura respeitada: cor só por LUT/cliente (ADR 0007), sem IA generativa.

### 1.2 Envio / fila offline (`use-upload.ts`)
- `enfileirarFoto`: lê 16 bytes → vídeo (cota `limite`, `enviados + videosLocais`; mime mov/mp4; poster do quadro do meio; enfileira) **ou** imagem (HEIC: se o aparelho não decodifica → `AVISO_HEIC` com instrução de ajuste de iPhone; `processarFoto` com plano de redimensionamento, memória/cores/rede (`saveData`, `effectiveType`), filtro, texto → `full`+`thumb` JPEG, **EXIF removido por reencode**, `capturadaEm` do EXIF "parede" ou `lastModified`, largura/altura). Metadados: `desafioId`, `promptKey`, `story`, `musicTrackId`.
- Sempre passa pela fila, depois `drenarAgora()`. Dreno: online-only, mutex, `drainAndReport` (funil), **relógio 30 s**, eventos `online/offline`, `visibilitychange`, `pageshow` (bfcache).
- Mensagens de erro: cota de vídeo ("Você já usou seu vídeo nesta festa. Fotos continuam ilimitadas." / "Plano grátis: 1 vídeo por convidado…"), sem espaço (`QueueQuotaExceededError`: "Sem espaço no aparelho… Conecte-se ao WiFi"), genérico ("Não consegui preparar essa foto. Tente de novo."). Exibidas **só** no rodapé da câmera (`ultimoErro`); na tela de confirmação não aparecem.
- Retry: `MAX_ATTEMPTS=6` (`packages/core/src/fila.ts`); depois `tentativas>=6` = "falhou". `ApiError.definitivo` para 401/403/422 (não queima as 6 tentativas). "Tentar de novo" zera tentativas (remove+reenfileira).
- Missão: `desafioId=escolhida`; `completarMissaoAtual()` marca missão "feita" no cliente **ao enfileirar** (não ao confirmar upload); `persistirProgressoMissoes` salva. Lote do rolo associa todos os arquivos à mesma missão. Após completar, "Continuar tirando" mantém `escolhida` = missão já concluída (banner continua mostrando-a) — efeito no servidor: não verificado.

### 1.3 Fila: `queue-panel.tsx` / `global-queue.tsx` / `use-event-queue.ts` / `upload-arc.tsx`
- `QueueHeader` (botão `min-h-11 min-w-11`, `aria-haspopup=dialog`) abre `BottomSheet "Fila de envio"`; lista (poll 1,5 s) com miniatura (img/video), "Foto"/"Vídeo", estado (`rotuloEstadoFila`: "Na fila", "Na fila · offline", "Na fila · sem sinal", "Subindo…", "Enviando…", falha: "Guardamos no celular. Vamos tentar de novo."), "Tentativa N", botão por item "Tentar de novo" (só falho+online), rodapé "Fechar" + "Tentar de novo" (global, só se há falha e online), "Tudo enviado." quando vazio, "Sem sinal. Pode fechar — a gente cuida.".
- `GlobalQueue` (montada em `app/e/[slug]/layout.tsx`, só com sessão): pílula fixa topo-direito em todas as páginas do evento **exceto** `/photo`; usa `useEventQueue` (resumo + dreno, poll 1,5 s).
- `OfflineBanner` (layout): faixa fixa `fixed top-[safe-area]` "Sem conexão — suas fotos estão seguras e sobem quando voltar" (`aria-live=assertive`).
- `UploadArc`: arco de progresso por bytes (pico/restante), `role=status`, `aria-label` "N fotos subindo"/"Sem sinal. …".

### 1.4 PWA (`use-pwa-install.ts`, `pwa-install-cta.tsx`)
- Detecta instalado (display-mode standalone/fullscreen/minimal-ui, `navigator.standalone`), captura `beforeinstallprompt` (Android), iOS por UA/`MacIntel`+touch. CTA só pós 1ª foto confirmada sem pendentes (`deveMostrarCtaPwa`). Android: botão "Instalar na tela inicial"; iOS: passo-a-passo "Toque em Compartilhar" / "Adicionar à Tela de Início" (ícones); "Agora não" grava `sessionStorage` (`albora.pwa-install.dispensado`; dispensa vale só na sessão da aba). Funil: `install_prompt`, `install_dismiss` etc.
- `AppOpenCta` ("Abrir no app"): `POST /api/app/parear` → `window.location = esquema://passagem`; falha → `router.push(/pair)`.

### APIs usadas (fetch)
`POST /api/uploads/presign`, `PUT <url R2>` (bytes), `PUT <url poster>`, `POST /api/uploads/confirm` (uploadId, chave, mime, desafioId, promptKey, legenda, lugar, story, musicTrackId, capturadaEm(+Parede), largura/altura), `POST /api/uploads/detalhes`, `GET /api/music`, `POST /api/app/parear`, `/auth/google/start` (navegação). Servidor/presign/confirm: só o lado cliente foi lido.

### Estados cobertos × faltando
| Estado | Situação |
|---|---|
| carregando | `PhotoPageSkeleton` (Suspense) |
| erro de render | `error.tsx` "A câmera não abriu / Suas fotos estão seguras. Tente recarregar." (Tentar de novo, Voltar ao início) |
| evento não aberto | `EventNotice` "Essa festa não está aberta agora / Volte pelo QR da mesa" — **mesmo texto** para não-começou, encerrado, rascunho e desconhecido (`r.estado !== "aberto"`), sem data/contagem nem acesso à fila |
| sem sessão | `NoSession` ("Falta você entrar"; link `<a>` para `/e/slug`; usa emoji 📸) |
| offline | banner global + arco "Sem sinal" + copy na confirmação |
| permissão de câmera | **não tratada na tela** (SO/navegador via `capture`) |
| cota de vídeo | aviso + botão `disabled` opacity 45 |
| gate de interação | só controla botão "Ir pro feed" |
| HEIC não decodificável | `AVISO_HEIC` no rodapé da câmera |
| falha definitiva de upload | só no painel da fila; nada na confirmação |
| arquivo inválido/gigante | **sem validação** (código morto) |

### Problemas de UX/UI vistos no código
1. Tela da câmera sem viewfinder: o "visor" é um retângulo vazio; o convidado não vê a missão sobre a imagem, só um fundo; expectativa de "câmera" quebrada, e o toque no obturador abre o app de câmera do SO (troca de contexto). Decisão consciente (HDR/noturno), mas não há texto explicando.
2. Chips de lugar na câmera usam `Badge` (`py-1.5 px-3 text-[0.78rem]` ≈ 32 px de altura) → alvo <44 px; ficam colados no rodapé do visor e competem com o banner.
3. `OfflineBanner` (`fixed top`, `z-toast`) cobre o header da câmera (Voltar 54 px + pílula da fila) quando offline. Sobreposição provável; não vista renderizada.
4. Duas fontes de "Sem sinal" simultâneas (banner + arco + copy) e `aria-live=assertive` no banner interrompe leitor de tela a cada queda.
5. `Pronto` e `Pular` em `Details` fazem exatamente a mesma coisa; título "Sua foto já está subindo" é verdadeiro só se online.
6. Botão `ButtonAba` sem `type="button"` (`editor/button-aba.tsx`); `TextoTab` botão "Remover" também sem type (`ed-reset`); sem `role=tab/tablist` (usa `aria-pressed`).
7. Texto sobre a foto: tamanho fixo, uma única caixa, sem cor/fonte; instrução "Arraste na foto" aparece mesmo sem texto; arrastar com dedo cobre o texto (sem offset).
8. "Tirar outra" no editor descarta sem confirmação; também volta para a câmera sem reabrir o seletor (precisa tocar de novo).
9. Prévia sem indicador de carregamento (canvas vazio até `previa`); "Enviar" desabilitado sem explicação.
10. Confirmação: cartão "App" aparece sempre na 1ª foto mesmo quando já instalado (o texto `COPY_CTA_PWA` e os botões "Abrir no app" / "Ver código de 4 dígitos" aparecem; só `PwaInstallCta` some). Três ações de app empilhadas + 4–5 botões secundários → hierarquia carregada num momento de pico emocional.
11. "Foto N" também para vídeo; "Já tá no telão" é promessa não garantida (achado 7).
12. `ultimoErro` não limpa até a próxima tentativa e só existe na câmera.
13. Música: copy do painel vazio manda "pedir para alguém sugerir na aba de música" — depende de uma superfície que o convidado pode não ter aberta (gate); sem link.
14. `ESCONDIDO = absolute size-px opacity-0` para inputs: leitores de tela podem focá-los (sem `aria-hidden`/`tabindex=-1`), anunciando campos sem label (não verificado).
15. `window.location.assign('/auth/google/start…')` leva o convidado para fora do fluxo; botão "Receber minhas fotos" sem explicação do que é pedido (Google).

---

## 2. `/scan` — entrar na festa por QR/código

**Arquivos:** `app/scan/page.tsx` (server), `features/guest/components/client/scan-page.tsx`, `features/guest/hooks/scan-qr.ts`, `features/guest/components/client/rescue-scanner.tsx` (versão embutida), `lib/qr` (`extractSlug`, `eventEntryPath`).
**Propósito:** levar o convidado a `/e/{slug}?via=qr|code`. Redireciona no servidor se `?codigo=` já é um slug válido (`/e/{slug}?via=code`) — é o link do WhatsApp.
**Funcionalidades:** formulário "Código ou link da festa" (input 120 chars, `required`, `enviarCodigo`, botão **Entrar** `disabled` se vazio); botão "Escanear o QR" (só se `BarcodeDetector` com `qr_code` suportado); visor `<video>` (`facingMode ideal environment`, leitura a cada 350 ms), moldura `inset-[18%]`, linha de varredura animada (some com reduced-motion), instrução "Aponte para o QR da festa", "Cancelar", "Já tenho o link"; link "Início" (`/`).
**Validação:** `extractSlug(codigo)`; falha → `role=alert` "Esse código não abre nenhum evento. Confere de novo? Às vezes é só um zero no lugar do O." (QR com conteúdo inválido é ignorado em silêncio e continua escaneando).
**`RescueScanner`** (rotas `/e/…` sem evento): `EventNotice` com `showRescue` (só código desconhecido) → "Código da mesa" (input 80 chars) + Entrar + Escanear o QR + "Abrir scanner em tela cheia" (`/scan`). Mensagem de erro própria: "Esse código não parece certo. Confira as letras impressas na mesa." (texto diferente da `/scan` para o mesmo erro).
**Componentes:** `GuestShell`, tokens `ALBORA_BRAND` (sem identidade do evento).
**APIs:** nenhuma `/api`; só navegação `window.location.href`.
**Estados:** sem câmera/BarcodeDetector → só formulário (sem explicação); permissão negada → mesmo (sem mensagem); código inválido → alerta; sem estado "evento encerrado" aqui (resolvido depois em `/e/[slug]`).
**Problemas:** achados 9–10; botão "Escanear" e formulário alternam sem anunciar; `ScanPage` usa `min-h-dvh` dentro de wrapper `minHeight 100dvh`; `GuestShell` sem `<main>`/landmark explícito nesta página (não verificado); duas versões de copy de erro; o `"Início"` (link `/`) leva à landing de venda — saída pouco útil para quem está tentando entrar.

---

## 3. `/g/[token]` — galeria de entrega do convidado

**Arquivos:** `app/g/[token]/page.tsx`, `features/entrega/components/server/guest-gallery-view.tsx`.
**Propósito:** página pública sem login; identidade = token opaco na URL; `openGuestGallery` devolve as fotos da sessão (entrega pós-evento). Usa identidade visual do evento (`eventVars`).
**Funcionalidades:** grade 3 colunas de miniaturas; cada foto é `<a href={foto.url}>` (abre original), `alt = legenda ?? "Foto da sua sessão"`.
**Estados:** `ok`, vazio ("Nenhuma foto por aqui / As fotos da sua sessão aparecem aqui assim que forem publicadas."), `expirado` ("Este link expirou / Peça um novo link para quem organizou o evento."). Erro de token (`ErroTokenDeEntrega`) mostra a mesma tela do expirado (não distingue inválido/revogado); outros erros sobem (500).
**APIs:** server-side apenas (`openGuestGallery`, `carregarEventoPublico`, `signGet`); sem `fetch`.
**Problemas:** sem botão "Baixar tudo"/"Baixar foto"/compartilhar (só link para o original); sem `generateMetadata`/`robots noindex` nesta rota (token em URL pública — não verificado se o layout raiz já define); sem título/identificação do evento na página (o nome do evento não é renderizado, só as cores); sem paginação/limite; `<a>` sem rótulo além do alt; nenhum "estado carregando" (SSR); vídeos: tratados como `<img src=thumbUrl>` com link para o original (não verificado se `FotoEntrega` inclui vídeo). Copy "Peça um novo link para quem organizou" não oferece contato.

## 4. `/[slug]` — URL curta

`app/[slug]/page.tsx`: redirect server-side para `/e/{slug}?via={via}` (default `link`). **Não valida `via`** (qualquer string da query vai para `/e/…`; efeito depende de `ViaDeEntrada` no destino — não verificado). Sem UI, sem estado de erro; slug inexistente cai no tratamento de `/e/[slug]`. Rotas estáticas têm prioridade (comentário).

## 5. `/p/[slug]` — página pública do evento (vitrine)

**Arquivos:** `app/p/[slug]/page.tsx`, `features/public-event/{data/get-public-event-page.ts,data/get-public-event-metadata.ts,lib/strip-pii.ts,lib/resolve-identity.ts,components/server/public-event-view.tsx}`.
**Propósito:** SEO/viral por evento. ISR `revalidate=60`. Título `"{nome} · Albora"`, descrição fixa "O álbum coletivo da festa — fotos moderadas, enviadas por quem estava lá." + OpenGraph (sem imagem).
**Conteúdo:** `EventHero` (foto de capa = 1ª da vitrine, título, data); prova social "N fotos · M pessoas" (esconde se `nao_comecou`); "Álbum encerrado" se encerrado; vitrine de até 9 miniaturas 3 colunas (cada uma com fundo desfocado + `object-contain`, `alt=""`); vazio: `mensagemVazia`; CTA `<a>` "Monte o álbum da sua festa" → `/?ref={refToken}`.
**Estados:** `aberto`, `nao_comecou`, `encerrado`; `notFound()` para desconhecido/slug rotacionado/rascunho.
**APIs:** só server (`resolverSlug`, `lerMetricasAoVivo`, `listarMidiaDaParede`, `refDoEvento`, `signGet` TTL 300 s).
**Problemas:** achado 11; `alt=""` em todas as fotos e `aria-hidden` no duplicado (ok decorativo) mas `<ul aria-label>` sem conteúdo acessível; thumbs com URL assinada de 5 min dentro de página cacheada por 60 s e indexável (URL expira, cache de crawler/OG fica quebrado); sem imagem OG; `PII` filtrada (`paraVitrinePublica` descarta autor), mas número de pessoas/fotos é público para qualquer slug; CTA de venda ocupa o lugar de qualquer ação do convidado (ex.: entrar no evento / ver meu álbum) — quem chega pelo link de uma festa não tem como entrar nela a partir daqui.

---

## 6. `/e/[slug]/pair` e `/app/parear` — pareamento web ↔ app (código de 4 dígitos)

### 6.1 `/e/[slug]/pair` (web, convidado com sessão)
**Arquivos:** `app/e/[slug]/pair/page.tsx`, `features/pairing/components/client/pair-page.tsx`, `app-open-cta.tsx`, handler `lib/api/handlers/app-pair.ts`, use cases `lib/application/use-cases/guest/{create,redeem}-app-pairing.ts`, validator `lib/infrastructure/api/validators/app-pair-schemas.ts`.
**Fluxo:** ao montar, `POST /api/app/parear` (cria **código de 4 dígitos + passagem one-shot**, TTL 15 min; rate limit 12/min por sessão) → mostra código grande (`tracking-[0.35em]`, `aria-live=polite`), "Expira às HH:MM", botão **Abrir no app** (esquema `appPairSchemeLinkPassagem`), link "Link universal (quando o domínio estiver verificado)" (`appPairUniversalLinkPassagem`), **Gerar outro código**, **Voltar à capa**, link `/privacidade`.
**Estados:** `carregando` ("Gerando código…"), `pronto`, `sem-sessao` (401: "Entre no evento pelo QR da mesa antes de parear o app." + botão Entrar no evento), `erro` ("Não deu para gerar agora." + Tentar de novo). Servidor: evento não aberto → `EventNotice`; sem sessão do mesmo evento → `NoSession`.
**Problemas:** texto de bastidor exposto ao convidado ("quando o domínio estiver verificado") — é link de dev; "Abrir no app" via esquema customizado sem fallback quando o app não está instalado (nada acontece; sem link de loja, sem detecção/timeout) — `AppOpenCta` idem (o `finally` já volta o botão a "pronto"); cada visita à tela gera um código novo (consome rate limit e invalida o anterior? — comportamento de invalidação no DB: não verificado); código só em dígitos grandes, sem botão "copiar"; título h1 "Abra o app e digite" e `GuestHeader title="Parear o app"` repetem a mesma ideia; o código não indica qual evento.

### 6.2 `/app/parear` (web usada pelo app/WebView para digitar o código)
**Arquivos:** `app/app/parear/page.tsx`, `features/pairing/components/client/pair-app-client.tsx`.
**UI:** `h1 "Digite o código"`, texto "Quatro números que aparecem na web depois da primeira foto.", 4 inputs de 1 dígito (`inputMode=numeric`, `autoComplete=one-time-code`, `aria-label="Dígito N"`, foco automático ao digitar, Backspace volta), botão **Continuar** (`disabled` até 4 dígitos, "Entrando…").
**API:** `POST /api/app/parear/resgatar` `{codigo}` → `{slug,…}` + cookie de sessão HttpOnly → `router.replace(/e/{slug}/cover)`. O handler também aceita `passagem` (deep link).
**Estados:** `editando/enviando/ligado/recusado/erro`; 409/422 → "Código inválido ou expirado. Peça outro na web."; demais → "Não deu para parear agora. Tente de novo."; 429 cai no genérico.
**Problemas:** **colar o código inteiro não funciona** (`atualizar` faz `.slice(-1)` do valor; `maxLength=1`) — com `autoComplete=one-time-code` o iOS tenta colar "1234" no 1º campo e fica só o último dígito; sem submit automático ao completar; sem `role=group` no conjunto (só `aria-label` em `div`); sem link de volta/ajuda; página `fixed inset-0` sem `<h1>` landmark ok mas sem "Cancelar"; `erro` não distingue offline; brute-force de 4 dígitos (10⁴) limitado só por `enforceRateLimit` 20/janela (janela/chave não verificadas) — questão de segurança, não UX.

---

## 7. `/wall-display` — o telão

**Arquivos:** `app/wall-display/page.tsx` (tema neutro escuro até parear), `features/wall/components/client/{wall-client,wall-stage,wall-pairing-screen,wall-participation-counter}.tsx`, `features/wall/lib/{use-wall-display,use-wall-stream,use-wall-pairing,use-animated-counter,participation,animated-counter,types}.ts`, `lib/api/handlers/{wall,wall-pair,wall-authorize,wall-panic,wall-link,admin-wall-link}.ts`, `app/api/wall/{route,stream/route,panic/route,authorize/route,pair/route,pair/status/route,pair/link/route}.ts`, núcleo `packages/core/src/wall-display.ts`, `lib/wall.ts`, `lib/media-aspect`.
**Propósito:** URL fullscreen para TV do salão. A TV não pertence a evento até parear; crachá (cookie HttpOnly `albora_parede`, **12 h**, `VALIDADE_DA_PAREDE_HORAS`) identifica o evento; tema do evento chega junto (`eventTheme`, fundo escuro forçado).

### Fases e estados
| Fase/estado | Tela |
|---|---|
| `pareando` | `WallPairingScreen` (ver §8) |
| `exibindo` + `carregou=false` | "Conectando… / Conectando ao evento. Aguarde alguns instantes." |
| `exibindo` + sem item exibível | "Aguardando fotos / As fotos da festa aparecem aqui assim que os convidados começarem a enviar." |
| `panico` | "Telão pausado / Nenhuma foto nova aparece enquanto o telão estiver pausado." |
| 401 no poll | volta a `pareando` (`onNaoAutorizado`) |
| erro de rede/5xx | **sem estado**: poll falha em silêncio; se nunca carregou, fica em "Conectando…" para sempre; sem indicador de "reconectando/offline" sobre cena em exibição |

### Dados e rotação
- Transporte: **SSE** `GET /api/wall/stream` (servidor consulta Postgres a cada 2 s, empurra só se hash `id:reacoes` + pânico + contadores muda; heartbeat) com reconexão a cada 5 s; **polling** `GET /api/wall` a cada 6 s liga só se SSE ficar >10 s desconectado; 1º `puxar()` imediato; 401 no poll → reparear. Rate limit 240/min por evento.
- Item: `{id, autor, mime, criadaEm, reacoes, thumb, full, largura?, altura?}`; URLs assinadas 900 s; dimensões do servidor (`persistedSize`) ou medidas no cliente (`Image`/`video` metadata); **item sem dimensões nunca entra em cena**.
- Cache cliente poda por `pruneWallDisplayCache(WALL_DISPLAY_CACHE_LIMIT)`.
- **Rotação:** `setInterval(girar, ROTACAO_MS = 8000)` — constante global, **sem controle por evento**. Cada tick percorre `modelosRef` (rodízio do casal) a partir do índice seguinte e usa o 1º modelo que consegue montar cena. Foto única: `nextForWallDisplay` (faixas `nunca-exibida` 0,5 / `recente` ≤12 min 0,25 / `popular` 0,25; decaimento por exibição e tempo, meia-vida 90 min). Multi-foto: ordena por menos exibições, depois mais nova; só itens que o modelo não corta; se faltam fotos, pula o modelo.
- Transição: um único fade-in de cena (`wall-entrar`, scale 1.015→1, `--tempo-lento`) por troca de `key` (sem crossfade entre cenas; a cena anterior some e a nova entra). Respeita `prefers-reduced-motion`.
- **Controles que existem:** (a) no telão: botão **Pausar/Retomar** (canto inferior direito, sempre visível a 85% de opacidade) + atalhos de teclado **Espaço / P**; (b) no admin: seleção dos modelos do rodízio (checkbox list em `features/admin/components/client/identity-editor.tsx`, `config` `telaoModelos`; criação de evento `create-event-wizard.tsx`; protótipos em `features/catalog/.../wall-models-screen.tsx`, `admin-wall-screen.tsx`); (c) gerar link (§9). **Não existem:** tempo por foto, duração/velocidade de transição, ordem manual do rodízio, filtro por missão/autor, legenda on/off, "fixar foto", volume/áudio de vídeo (vídeos `muted loop`), múltiplos telões com cenas diferentes.
- Valores padrão do rodízio (`features/admin/lib/wall-models.ts`): `polaroide, mural, colagem, dump`. Servidor (`modelosDoRodizio`/`wallDisplayRotationModels`): se a escolha é inválida (ex.: nenhum modelo aceita foto em pé) **volta silenciosamente para todos os 11 modelos**.

### Modelos de telão (11; `packages/core/src/wall-display.ts` + `wall-stage.tsx`)
| Modelo | Fotos | Aceita em pé | Render |
|---|---|---|---|
| `polaroide` | 1 | sim | moldura clara `rounded-superficie`, `max-w min(70vw,60vh)`, `contain`, rodapé autor + "★ reações" |
| `tbt` | 1 | sim; faixa `popular` | igual polaroide + legenda "Mais cedo, na festa" |
| `mural` | 3 | sim | grid 3 col × **1 linha**, `contain` |
| `colagem` | **5** | sim | grid 3 col × **2 linhas = 6 células para 5 fotos** (uma célula vazia) |
| `dump` | 9 | sim | grid 3×3, `contain` (cai no mesmo ramo `else` de mural/colagem; `linhas = 3`) |
| `grade` | 4 | sim | 2×2 com fundo desfocado por célula (`CelulaContida`) |
| `destaque` | 5 | sim | 1 hero (2fr) + 4 menores, áreas CSS `"hero s1 s2" "hero s3 s4"` |
| `mosaico` | 5 | sim | hero central (2fr) + 4 menores nas laterais |
| `ambiente` | 1 | sim | foto `contain` sobre a mesma foto desfocada + deriva lenta (`parede-deriva`, 26 s), crédito |
| `carrossel` | 1 | sim | `contain` + fundo desfocado + crédito, animação `wall-aparecer` |
| `cheio` | 1 | **não** (só horizontal) | `cover` tela cheia com zoom lento (`parede-zoom` 30 s), crédito; é o único que corta |
- **Regra "nunca cortar vertical":** `contain` em todos exceto `cheio`; `cheio` só recebe foto com `largura > altura` (`modelosPermitidos`/`wallDisplayModelCrops`); letterbox preenchido com blur da própria imagem em vários modelos; seleção de rodízio exige ao menos 1 modelo que aceite foto em pé (`problemasDaEscolha`). Caveat: `mural/colagem/dump` não usam fundo desfocado (barras do tema nos lados de fotos em pé); `aceitaEmPe=true` para todos exceto `cheio`.
- Vídeo: `<video autoplay muted playsInline loop>` em qualquer modelo; sem controle de duração (um vídeo longo é interrompido pelo giro de 8 s).
- Crédito: nome do autor (+ "★ N") em pílula; mostra **primeiro nome do convidado na TV** (decisão de produto; fora de `polaroide/tbt/cheio/ambiente/carrossel` os modelos de grade não mostram crédito).

### Overlays
- **Relógio** (canto inferior esquerdo, `<time dateTime={hora}>`, 70% opacidade).
- **`WallParticipationCounter`** (topo esquerdo, `role=status`, contagem animada `useContadorAoVivo`): "N fotos · M pessoas", só com `fotos > 0`; vem de `COUNT(*) FROM uploads WHERE state='published'` (total do evento, não da janela).
- Botão Pausar/Retomar (acima).

### Problemas de UX/UI vistos no código
1. Botão de pânico permanentemente visível na TV do salão; qualquer pessoa com toque/controle pausa o telão do evento (toggle cego, ver achado 13). Texto "Telão pausado" é exibido à plateia (apropriado como erro de produção? decisão de produto).
2. Sem estado de erro/offline/"reconectando" para a TV (achado de §7 tabela); em falha prolongada a cena congela sem sinal visível ao operador; "Conectando…" eterno se a 1ª chamada falhar.
3. `colagem` com célula vazia (5 fotos em 6 células).
4. `ROTACAO_MS` fixo 8 s: sem controle para vídeo (corta clipe) nem para eventos pequenos (repete a mesma foto/rodízio rápido com poucas fotos; o decaimento por exibição ameniza).
5. "Aguardando fotos" também aparece quando há fotos sem dimensões medidas (falha de medição) ou quando nenhum modelo cabe no conjunto — a TV parece vazia mesmo com conteúdo.
6. `Image` do Next usa `item.full` (resolução cheia) mesmo em células pequenas de `dump` (9 fotos); `sizes="100vw"` não reflete o tamanho da célula → decodificação pesada em TV/stick fraco (não medido). `next/image` com URL assinada externa exige `remotePatterns` (não verificado).
7. Renovação de URL assinada depende de payload novo (achado 14).
8. Relógio e contador em `clamp()` pequeno (0,8–1,2 rem) com opacidade 70% — leitura a distância fraca; contraste `ink-2`/`ink-3` sobre fotos variáveis (não medido).
9. Mudança de modelos no admin ("vale para a próxima foto que subir") não entra no hash do SSE (`hashDaPagina` ignora `telaoModelos`): na TV só aparece quando outro item/reação mudar.
10. Editor de modelos no admin é lista de checkbox só com nome (`modelLabel`) — sem miniatura/preview de como cada modelo fica, sem ordem; (protótipos `wall-models-screen.tsx` existem em `features/catalog` mas são mocks).
11. Atalho Espaço/P dispara toggle mesmo com foco em outro elemento (listener na janela com `preventDefault`).

---

## 8. `/wall-pair` e `/wall-link` — conectar o telão

Três métodos de conexão:

| Método | Origem | Fluxo | Arquivos |
|---|---|---|---|
| **Código na TV** | TV em `/wall-display` | TV `POST /api/wall/pair` (código de 6 chars `A-HJ-NP-Z2-9`, TTL **10 min**, cookie de poll HttpOnly; rate limit 30/min por IP) e mostra código grande + **QR** (`/wall-pair?codigo=…`, `qrcode` EC H, 280 px) com passos "1. Abra a festa no celular · 2. Autorize este código · 3. Pronto"; poll `GET /api/wall/pair/status` a cada 3 s; `pronto` → crachá em cookie (12 h) + tema; `expirado` → gera outro código sozinho | `wall-pairing-screen.tsx`, `use-wall-pairing.ts`, `wall-pair.ts` |
| **Código/QR no celular** | convidado/anfitrião com sessão | `/wall-pair?codigo=XXXXXX` (pré-preenche, `toUpperCase`), input único 6 chars (`tracking-[0.35em]`), validação regex, **Ligar o telão** → `POST /api/wall/authorize` (sessão obrigatória; `podeUsarTelao(plano)` senão 403 `plano.telao`; rate limit 20/min) | `wall-pair-client.tsx`, `wall-authorize.ts` |
| **Link de uso único** | anfitrião no admin | `WallLinkSender` (`features/admin/components/client/wall-link-sender.tsx`): `POST /api/admin/events/{id}/wall-link` → URL com segredo no **fragmento `#`**; Copiar link (clipboard), Enviar (`navigator.share`), mostra "Vale até HH:MM" (validade 20 min, vide commit recente); TV abre `/wall-link#token` → `WallLinkClient` lê hash, **limpa a URL** (`replaceState`), `POST /api/wall/pair/link` (valida sem consumir, devolve cookie de poll) → `location.replace("/wall-display")`, onde o poll de status consome o link (uso único) e emite crachá | `wall-link-client.tsx`, `wall-link.ts`, `admin-wall-link.ts` |

**Estados `/wall-pair`:** `editing`, `submitting` ("Ligando…"), `connected` ("Telão ligado / As fotos publicadas já estão aparecendo na tela do salão." + link "Voltar ao evento"), `no-session` (401: "Você precisa estar na festa… Entre pelo QR da mesa." link `/scan`), `rejected` (409/422: "Código inválido ou expirado. Verifique…"), `error` (demais; 403 de plano **cai aqui** como "Não conseguimos conectar agora…", sem explicar que é plano).
**Estados `/wall-link`:** `abrindo` ("Conectando o telão…", `role=status`), `invalido` (410/422: "Este link não vale mais… conecte pelo código na tela" + link `/wall-display`), `erro` ("Verifique a internet desta tela e abra o link de novo").
**Estados `WallLinkSender`:** `ocioso`, `gerando`, `pronto`, `erro` (403 "O telão entra no plano Completo.", 401, rede, genérico); botão `disabled` se `!podeUsarTelao`.

**Problemas de UX/UI:**
1. Tela de pareamento na TV: o código aparece **entre** "1. Abra a festa no celular" e "2. Autorize este código · 3. Pronto" — o passo 1 não diz o que digitar nem onde (rota `/wall-pair` não é citada na TV; só o QR leva). Os passos 2 e 3 estão na mesma linha. Sem tempo de expiração do código na TV, sem mensagem de erro se `POST /api/wall/pair` falhar (código fica "······" sem retry visível), sem menção ao método por link.
2. Código do telão e QR visíveis a todo o salão + autorização por qualquer convidado (achado 12).
3. `/wall-pair`: **403 de plano aparece como erro genérico** e o convidado não consegue resolver; só o anfitrião vê "plano Completo" (no `WallLinkSender`). Para convidado, a mensagem correta seria "peça ao anfitrião".
4. `no-session`: link para `/scan` perde o código digitado/QR (a URL `/wall-pair?codigo=` não é preservada como retorno) — o convidado precisa reescanear o QR da TV após entrar.
5. Sucesso: "Voltar ao evento" leva a `/scan` (scanner), não ao evento da sessão.
6. `/wall-link`: erro de rede diz "abra o link de novo", mas o hash foi apagado no mount (`replaceState`) — recarregar mostra "Este link não vale mais"; sem botão "Tentar de novo". `Link` "Conectar pelo código" ok.
7. Link do admin: aviso correto de que "quem tiver o link pode ligar o telão" (honesto); botão Enviar (`navigator.share`) só em navegadores com Web Share; erro de `share` engolido.
8. `WallPairClient` mantém `status` após editar o código (mensagens de erro persistem até novo envio; `rejected` não limpa ao digitar). Input único sem `type=text` explícito/`autoComplete=off`.
9. `connected` mostra apenas ✓ em círculo (`✓` caractere) sem `aria-live`; toda a tela troca sem foco.
10. Nada indica quais telões já estão ligados nem como desligar (não verificado no admin).

---

## 9. `/telas` e `/telas-admin`

- **`/telas`** (`app/telas/page.tsx`, `guest-screens.tsx`, `wall-screens.tsx`, `catalog-frames.tsx`): catálogo estático `noindex` das telas do **convidado** em molduras de celular (Scanner, Capa, Entrada, Câmera com missão/fila offline, Confirmação Android/iOS, Recado, Feed, Antes do gate, Detalhes, Minhas fotos, Álbum, Comentário, Música, Denúncia, Consentimento de compartilhamento…), pack `WEDDING`, tema Albora; são mocks (componentes de `features/catalog/…`), não as rotas reais.
- **`/telas-admin`** (`app/telas-admin/page.tsx`, `admin-screens.tsx`, `host-desktop-screens.tsx`): mesmo formato para o **anfitrião no app**: login, criar evento, painel, convidados, moderação, identidade, missões, telão (`AdminWallScreen`), livro, retenção, álbum, recados, peças — mockups `noindex`, sem dados reais.

---

## 10. Componentes reutilizáveis identificados
`@albora/ui-web`: `GuestShell`, `GuestMain`, `GuestHeader`, `EntryColumn`, `FinePrint`, `SkipLink`, `Card`, `Badge`, `MissionBanner`, `FilterChip`, `Slider`, `BottomSheet`, `Button`/`PrimaryButton`/`SecondaryButton`/`buttonVariants`, `ErrorMessage`, `EmptyState`, `EventHero`, `ShareIcon`, `radiusStyle`, `cn`. App: `EventNotice`, `NoSession`, `OfflineBanner`, `AlboraLogo`, `EventCountdown`, `RescueScanner`, `ClaimPhotosButton`, `AppOpenCta`, `PwaInstallCta`, `UploadArc`, `QueueHeader`, `MissionCompletionToast`, `WallParticipationCounter`.


---

# PARTE 3 — App nativo (apps/mobile)


Base: leitura de `apps/mobile/app/**`, `apps/mobile/src/**` (sem `*.test.ts`), `packages/core/src/fila.ts` e `envio.ts`, `packages/ui-native/src/*`, `apps/mobile/app.json|app.config.ts|package.json`, e `apps/web/features/*` + `apps/web/app/api` (listagem). Nada foi executado em aparelho. "não verificado" = não confirmei por leitura.

## 0. Visão geral

- Stack: Expo SDK 53, RN 0.79, expo-router 5 (typedRoutes), NativeWind 4, Skia 1.11.11, expo-camera, expo-image-picker, expo-image-manipulator, expo-file-system, expo-secure-store, expo-background-fetch + expo-task-manager, expo-av, expo-sharing, netinfo. (`apps/mobile/package.json`)
- Identidade: `app.json` slug `albora`, scheme `albora`, bundle `app.albora.guest`. iOS: `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`, `UIBackgroundModes: [fetch]`, `associatedDomains applinks:albora.app`. Android: `CAMERA, READ_MEDIA_IMAGES, RECEIVE_BOOT_COMPLETED, WAKE_LOCK` + intentFilter https `albora.app` pathPrefix `/e/` autoVerify. Microfone desligado no plugin expo-camera (`microphonePermission:false`, `recordAudioAndroid:false`). `app.config.ts` troca o host por `EXPO_PUBLIC_APP_LINK_HOST`.
- Sessão: `GuestSession {token, slug, sessaoId, eventoId}` em SecureStore chave `albora.sessao` (`src/session.ts`); cookie `GUEST_SESSION_COOKIE` enviado manualmente em cada fetch. Origem da API: `EXPO_PUBLIC_API_URL` (fallback `http://localhost:3000`).
- O app NÃO tem: login, consentimento de entrada, entrada por nome, QR scanner, push, compra, logout/despareamento (nenhum `deleteItemAsync` no código).
- Rotas (arquivos em `app/`): `index`, `pair`, `e/[slug]/pair`, `(tabs)/{feed,missions,album,mine}`, `photo`, `photo-detail`, `guest-profile`, `music`, `recado`, `confessional`, `queue`. Não existe `+not-found` nem rota para outros paths `/e/<slug>/...` (universal link que não seja `/pair` não tem tela; comportamento do router para rota desconhecida não verificado).
- Classes NativeWind definidas em `tailwind.config.js`: cores `bg, superficie, superficie-alta, linha, ink, ink-2, ink-3, acento, acento-texto, sobre-acento, critico`; raios `token|pilula|superficie`; fontes `titulo: Georgia`, `corpo: System`.

---

## 1. `app/_layout.tsx` — RootLayout (providers, tema, deep link)

- Propósito: casca raiz; aplica o tema do evento como CSS vars NativeWind; registra drains.
- Providers: apenas `View` com `vars(themeVars)` (NativeWind) + `StatusBar` + `Stack(headerShown:false)`. Sem SafeAreaProvider, sem GestureHandlerRootView, sem provider de sessão/estado (cada tela lê o SecureStore sozinha).
- Efeitos:
  1. Boot: `ensureGuestUploadBackgroundTask()` + `ensureShareFonts()` (Fraunces/Instrument Sans via `expo-asset` + Skia typeface).
  2. `subscribeForegroundDrain(() => drainGuestQueue(guestQueue(),"foreground"))`.
  3. A cada mudança de `pathname`: lê sessão → `fetchGuestEventTheme` (GET `/api/guest/event`) → `themeVariablesFromEvent` (cadeia marca > vendor > pack > evento) e `StatusBar` claro/escuro conforme `themeBackgroundFromEvent`. Sem sessão ou falha → `brandFallbackVariables()` + status "light".
- Imports com efeito colateral: `../src/upload-task` (registra `TaskManager.defineTask`) e `../global.css`.
- Deep links: não há handler no layout; tratados em `app/pair.tsx` via `expo-linking` e pela rota `e/[slug]/pair`.
- PROBLEMAS: (a) uma chamada de rede de tema a cada navegação, sem cache; (b) sem timeout nem erro visível — falha cai no tema da marca em silêncio; (c) sem tratamento de sessão expirada em nenhum lugar.

## 2. `app/index.tsx` — entrada

- Rota `/`. Lê SecureStore; `parseStoredSession` válida → `Redirect /(tabs)/feed`; senão `/pair`. Enquanto lê: `View bg-bg` vazio (sem loader).
- Validação: só o formato do JSON (4 strings não vazias); o token não é validado no servidor.

## 3. `app/pair.tsx` — Parear (rota `/pair`)

- Propósito: resgatar a sessão criada na web. Dois caminhos: código de 4 dígitos digitado, ou "passagem" (token one-shot) vinda por link.
- Funcionalidades: 4 `TextInput` numéricos (maxLength 1, auto-avanço de foco; filtra `\D`); botão "Continuar" (habilitado só com `/^\d{4}$/`); link "Privacidade" (abre `${apiOrigin()}/privacidade` no navegador); auto-resgate quando chega `?passagem=` ou `?codigo=` (params do router) ou URL inicial/evento `url` do `expo-linking` (`albora://pair?...` ou `https://host/e/slug/pair?...`). Dedup por `pairPayloadKey` (`lastKey`). Preferência passagem > código.
- Campos/validações: código de 4 dígitos (`src/pair-link.ts`); passagem = string não vazia.
- Estados: `edit`, `sending` (botão "Entrando…"), `refused` (HTTP 409/422 → "Código inválido ou expirado. Peça outro na web."), `error` (outros/rede → "Não deu para parear agora. Tente de novo.").
- API: `POST {origin}/api/app/parear/resgatar` body `{codigo}` ou `{passagem}`; resposta validada por `parseRedeemResponse`; sucesso → grava SecureStore e `router.replace("/(tabs)/feed")`.
- Permissões nativas: nenhuma. Modais: nenhum.
- Textos: "Digite o código", "Quatro números que aparecem na web depois da primeira foto.", "Continuar", "Privacidade".
- PROBLEMAS: (a) `update` só avança o foco; sem backspace→campo anterior; (b) colar 4 dígitos não distribui (maxLength 1); (c) auto-resgate por link que falha deixa `lastKey` preenchida — reabrir o mesmo link não reenvia, e para `passagem` o botão "Continuar" só envia `{codigo}` dos dígitos (não há retry da passagem); (d) sem `KeyboardAvoidingView`; (e) `Screen` com `pt-12` fixo.

### 3.1 `app/e/[slug]/pair.tsx` — universal link

- Rota `/e/[slug]/pair`. Só redireciona para `/pair?passagem=…` ou `/pair?codigo=…` (passagem tem prioridade). O `slug` é ignorado (a sessão devolvida traz o slug).

## 4. `app/(tabs)/_layout.tsx` — abas

- `Tabs` com `headerShown:false` e `tabBar` customizada de `@albora/ui-native` (`TabBar`): "Feed · Missões · [+] · Álbum · Minhas" (texto `text-[0.5625rem]` uppercase, sem ícones, `accessibilityRole="tab"`). Botão central "+" (círculo `bg-acento`) → `router.navigate("/photo")`. `photo` está fora das abas (sem barra).
- PROBLEMAS: rótulos de ~9px sem ícone; `pb-6` fixo (sem inset de safe area).

## 5. `app/(tabs)/feed.tsx` — Feed

- Propósito: feed do evento (espelho do telão) com reação; comentários/denúncia só com gate aberto.
- Funcionalidades:
  - `FlatList` paginada por cursor (`onEndReached` + botão "Carregar mais"), pull-to-refresh.
  - `StoriesRail` no cabeçalho (só renderiza se houver stories; "+ Você" abre `/photo`; toque numa story com `sessaoId` marca como vista (estado local) e abre `/guest-profile`). Polling de stories a cada 30 s.
  - Card: foto (thumb assinada, 4:5) → toque abre `/photo-detail`; nome do autor (link para `/guest-profile`); estrela (curtir/descurtir, `PUT/DELETE /api/reaction`, tipo "estrela"); contador → sheet "Quem curtiu"; se `interacao === "completo"`: 💬 comentários (sheet) e "···" (sheet de denúncia).
- Modais/sheets (`Modal` RN): `ReacoesSheet` (transparente, bottom, lista de nomes com link para perfil), `ComentariosSheet` (pageSheet, threads + respostas exibidas, `TextInput` max 500, "Enviar", "Remover" nos próprios), `DenunciaSheet` (pageSheet; opções "Esta foto não deveria estar no evento" e "Sou eu nessa foto — tire do telão e do álbum" — a 2ª omitida se `minha`; envia `kind`).
- Campos/validações: comentário trim não vazio, max 500; sem campo de motivo livre.
- Estados: carregando (`ActivityIndicator`); sem sessão ("Pareie o app com o QR da mesa para ver o que já está no telão." — sem botão); erro ("Não carregou. Puxe para tentar de novo."); vazio ("Ainda não tem foto no ar. Seja a primeira."); gate fechado = `interacao:"espelho"` (esconde 💬 e "···"; reação segue ativa); offline = só o erro genérico.
- APIs: `GET /api/feed?eventoId&cursor`; `POST /api/media/urls`; `GET /api/stories`; `GET/PUT/DELETE /api/reaction`; `GET/POST/DELETE /api/comments`; `POST /api/media/report`.
- Permissões nativas: nenhuma.
- PROBLEMAS:
  - `ReacoesSheet`, `ComentariosSheet`, `DenunciaSheet`, `Estrela` duplicados em `photo-detail.tsx`.
  - `StoriesRail` devolve `null` com 0 stories ⇒ sem stories não existe atalho "+ Você" no feed.
  - Gate fechado não é explicado no feed (só `music.tsx` diz "A interação abre após a cerimônia").
  - Sem sessão: texto sem botão "Parear" (missões/música/recado/confessionário/câmera têm botão).
  - Falha na assinatura de URL devolve `[]` silencioso ⇒ cards cinza sem aviso; `signMediaUrls` não captura exceção de rede.
  - Vídeo: card usa só thumb, sem indicador de vídeo/play.
  - Ícones por glifo/emoji ("★/☆", "💬", "···") e alvos de toque pequenos (estrela sem padding mínimo).
  - Comentário sem "responder" (a API aceita `respostaA`; a UI só exibe respostas existentes). Sem "bloquear".
  - `ReacoesSheet`: `useEffect` com deps `[uploadId]` (sem `session`), sem estado de erro.

## 6. `app/(tabs)/missions.tsx` — Missões

- Propósito: lista de missões do evento + atalhos.
- Funcionalidades: `MissaoCard` (marcador circular, título, "Feita"/"Fotografar →"; feita fica `opacity-60` mas continua tocável) → `/photo?missao=<id>`; contador "x/y concluídas"; links "Recado dos anfitriões →" (`/recado`), "Confessionário →" (`/confessional`), "Música do casal →" (`/music`; este também no estado vazio). Recarrega no foco (`useFocusEffect`).
- Estados: carregando (spinner), sem sessão (texto + "Parear"), erro ("Não consegui carregar as missões. Tente de novo." + "Tentar de novo"), vazio ("Nenhuma missão por enquanto. Fique à vontade para fotografar o que quiser." + "Abrir câmera"), pronto.
- API: `GET /api/missions?eventoId` → `{missoes:[{id,titulo,feito}]}`.
- PROBLEMAS: (a) links Recado e Confessionário só aparecem quando há missões; (b) nenhum indica se há recado/não lido; (c) cada foco refaz o fetch e volta ao spinner total (pisca); (d) carrega duas vezes no mount (`useEffect` + `useFocusEffect`); (e) só título e feito — sem descrição/dica, sem celebração nem toast de conclusão; (f) missão feita segue repetível sem aviso.

## 7. `app/(tabs)/album.tsx` — Álbum

- Propósito: "noite em capítulos".
- Funcionalidades: `FlatList` de capítulos (capa = thumb da 1ª foto, título, nº de fotos, ▲/▼ expande/recolhe — um aberto por vez); ao expandir, grade 3 colunas (31,5%) com todas as fotos do capítulo (páginas achatadas); toque abre `/photo-detail` com `fullUrl` (URL já assinada), `minha:"0"`, `autor:""`, `reacoes:"0"`. Pull-to-refresh; renovação das URLs assinadas por `setTimeout(expiraEm − 60 s)`.
- Estados: carregando; sem sessão ("Pareie o app com o QR da mesa para ver a noite em capítulos."); erro ("Não carregou. Puxe para tentar de novo."); vazio ("O álbum ainda está sendo montado. Volte em breve.").
- API: `GET /api/album?eventoId` → `{album:{capitulos,totalDePaginas,contadores{fotos,convidados,missoes},interacao,expiraEm}}`; 401/403 → falha "sessao", mas a tela trata qualquer `!ok` como erro genérico.
- PROBLEMAS: (a) não usa `contadores`, `layoutId`, `slot/proporcao`, `amanhecer`, `hora`, `lugarId` — sem contadores, sem faixa horária, sem layout de página (grade uniforme); (b) detalhe aberto do álbum vai com `autor:""`, reações zeradas e `minha:"0"` ⇒ não dá para compartilhar as próprias fotos por aqui; (c) sem filtros, sem navegação anterior/próxima; (d) `setTimeout` com `espera=0` se `expiraEm` já vencido (recarga imediata; risco de laço se o servidor devolver `expiraEm` passado — não verificado); (e) sem sessão: sem botão Parear.

## 8. `app/(tabs)/mine.tsx` — Minhas fotos

- Propósito: fotos enviadas + itens pendentes/falhos da fila local + compartilhar.
- Funcionalidades:
  - Grade 2 colunas mesclando fila local (pendente/falhou, por `criadoEm` desc) + enviadas do servidor.
  - Por foto: toque abre detalhe (enviada) ou `Alert "Foto em processamento"`; long-press 400 ms ou botão "Remover" → `Alert` ("Quer remover esta foto do evento?" / "Quer cancelar o envio desta foto?"); enviada → `DELETE /api/uploads {uploadId}`; local → `guestQueue().remove(id)`.
  - "↗ Compartilhar" por foto → `compartilharFotoPropria` (moldura 9:16 Skia → share sheet nativa).
  - "Colagem" (visível com ≥2 enviadas): modo seleção (2–4 fotos, `MAX_DA_COLAGEM`=4) → "↗ Colagem".
  - Card "Recap": "Você mandou N foto(s) · curtida…"; "↗ Recap (N fotos)" (3–10 fotos elegíveis ranqueadas por reações e recência; só imagens do próprio evento; uma folha de share por foto).
  - Atalho "Ver fila → N pendente(s)" para `/queue` (só se há item não enviado).
  - Badge sobre a foto: "Enviando…" (pendente, `bg-acento`) / "Falhou" (`bg-alerta`).
- Estados: carregando; sem sessão ("Pareie o app com o QR da mesa para ver as fotos que você enviou." — sem botão); erro ("Não carregou. Puxe para tentar de novo."); vazio ("Você ainda não enviou nenhuma foto."). Offline: `carregarMinhasFotos` faz `Promise.all(servidor, fila)` — se o servidor falhar, a tela inteira cai em erro e a fila local não aparece.
- APIs: `GET /api/my-photos?eventoId`; `POST /api/media/urls`; `DELETE /api/uploads`; `GET /api/guests/me/recap`; `GET /api/share?uploadId`, `POST /api/share`; download de mídia assinada; `Sharing.shareAsync`.
- Permissões nativas: nenhuma pedida.
- Textos-chave: "Minhas fotos", "Ver fila →", "Compartilhar recap da noite", "A colagem leva no máximo quatro fotos.", "Escolha pelo menos 2 fotos."
- PROBLEMAS: (a) item pendente/falho renderiza tile cinza — `ItemFoto` só usa `thumbUrl` de enviadas; `caminhoPreviewItem` (em `queue-status.ts`) não é usado aqui; (b) "Falhou" não tem retry nesta tela (só "Remover"); retry só em `/queue`; (c) remover item local não apaga o arquivo no disco (`queue.remove` só tira do índice) → arquivo órfão em `documentDirectory/fila/arquivos`; (d) `bg-alerta` não existe no Tailwind do app ⇒ badge "Falhou" sem fundo; (e) texto de legenda exibe `legenda ?? lugar` (se `lugar` vier como id do pack ficaria cru — não verificado); (f) `useMemo` de `idsRecap` depende de `enviadas` recriado a cada render (memo ineficaz); (g) o consentimento externo é registrado automaticamente (`registrarConsentimentoExterno(session,true)`) sem tela/checkbox no app (web tem `share-consent-sheet`, `moldura-picker`); (h) sem retenção/entrega/reivindicar fotos (web: `retention-card`, `album-footer-cta`, `claim-photos-button`, `retry-section`).

## 9. `app/photo.tsx` — Câmera / revisão (rota `/photo`, fora das abas)

- Propósito: capturar foto (ou vídeo do confessionário), escolher filtro, legenda e lugar, e enfileirar.
- Params: `missao` (→ `desafioId`), `prompt` (→ `promptKey`), `video==="1"` (+prompt → modo vídeo).
- Modo captura: `CameraView` traseira (`facing="back"`; sem alternar câmera, flash ou zoom); botão de disparo; "Galeria" (ImagePicker, só imagens, `exif:false`, `quality: QUALITY.full`, depois `normalizeSource(alwaysConvert)` → JPEG 0.82); "Voltar"; indicador da fila no topo ("N na fila" → `/queue`, desabilitado com 0). Modo vídeo (confessionário): `recordAsync({maxDuration:20})`, botão vira parar, contagem regressiva 20 s, vídeo vai direto para a fila (`persistCapture` com `promptKey`), `tryDrain`, `router.back()`.
- Modo revisão (`pendingShot`): preview; "Tirar outra"; `FilterStrip` (chips "Original" + presets de `ordenarComRecomendado(null)`; tocar no ativo desmarca); chips de intensidade 25/50/75/100%; preview filtrado em baixa resolução (`previewFiltrado`, ≤320 px, Skia, debounce 150 ms, descarta resultados obsoletos); legenda (`TextInput`, max 280, multiline); chips de "lugar" (lista fechada do pack, pergunta `lugar.pergunta`); "Enviar" (`persistCapture` com `skiaDrawer`: reencode+resize+filtro, remove EXIF, rejeita GPS residual, enfileira) seguido de `tryDrain` sem navegar (volta ao modo câmera com o contador da fila atualizado).
- Validações: legenda ≤280; `persistCapture` valida HEIC (converte ou erro), tipo declarado/conteúdo/tamanho (`validarDeclaracao`/`validarConteudo`), `eventoId` não vazio, cópia > 0 bytes, GPS residual; vídeo só com `promptKey` ("Por agora o app só tira foto. Vídeo continua na web." caso contrário).
- Estados: sessão `undefined` → tela vazia; sem sessão → "Câmera / Pareie de novo para tirar foto." + Parear; sem permissão → "Sem a câmera o app não tem o que enviar." + "Permitir câmera" (se `canAskAgain`) ou "Abra Ajustes e permita a câmera." (sem botão) + "Voltar"; `busy`; erro inline; `previewLoading` (opacity .6); gravando ("Gravando… Ns · toque para parar").
- APIs: `GET /api/guest/event` (pack → lugares); drain (§17): `POST /api/uploads/presign`, PUT no storage, `POST /api/uploads/confirm`.
- Permissões nativas: Câmera (`useCameraPermissions`); Fototeca (ImagePicker; pedido explícito não visível no código — não verificado); Microfone: não pedido.
- Textos-chave: "Escolha um filtro", "Tirar outra", "Legenda (opcional)", "Onde na festa?", "Enviar", "Galeria", "Confessionário — toque para gravar (até 20s)".
- PROBLEMAS:
  1. Violação das regras de hooks: um `useEffect` (contador de gravação, deps `[gravando]`) é declarado depois de `return` condicionais (`session===undefined`, `session===null`, `!permission.granted`). Ao passar de "carregando/sem permissão" para "pronto" o número de hooks muda entre renders ("Rendered more hooks…", provável crash na 1ª concessão da câmera). Por leitura da estrutura; não executado.
  2. Vídeo do confessionário com `microphonePermission:false`/`recordAudioAndroid:false` no `app.json` → provável vídeo sem áudio ou falha ao gravar (não verificado em aparelho).
  3. `ordenarComRecomendado(null)`: o `filtroRecomendado` do evento (parseado em `event-theme.ts`) nunca é passado.
  4. Pós "Enviar" o convidado fica na câmera, sem confirmação de sucesso nem celebração de missão (web tem `success-step`); só o contador da fila muda.
  5. A missão em curso não é exibida na câmera.
  6. Editor reduzido: sem ajustes manuais (`drawer.ts` suporta `filtro.manuais`, UI não expõe), sem texto sobre a foto, sem música/story (`QueueItem.story`/`musicTrackId` existem no tipo mas nada no app os preenche), sem recorte.
  7. Sem câmera frontal, flash, grade, timer, zoom; vídeo só via confessionário.
  8. `catch {}` vazios (pack/lugares e preview) — falhas silenciosas.
  9. Preview lê o arquivo inteiro (`readAll` base64) e gera data URI a cada mudança de filtro/intensidade.
  10. Telas de captura/revisão não usam `Screen` (padding manual `pt-12`/`pb-9`, sem safe area).
  11. Permissão negada permanentemente: orienta "Abra Ajustes" sem `Linking.openSettings`.
  12. `persistCapture` recebe `plan`/`device` padrão (`"gratis"`, 4 GB/4 cores) — `photo.tsx` não informa o plano do evento nem o aparelho.

## 10. `app/photo-detail.tsx` — Detalhe/lightbox (rota `/photo-detail`)

- Propósito: foto em tela cheia + reagir/comentar/denunciar/compartilhar.
- Params (strings): `uploadId, chaveFull|fullUrl, interacao, minha, autor, reacoes, minhaReacao, mime, sessaoAutor`.
- Funcionalidades: fechar (✕ → `router.back`); nome do autor (link `/guest-profile` se há `sessaoAutor`); imagem `contain`, largura da tela × 75% da altura (via `Dimensions.get` lido uma vez); estrela + contador → "Quem curtiu"; 💬 comentários (se `completo`); "↗" compartilhar (só se `minha`); "···" denúncia (se `completo`). Assina `chaveFull` por `POST /api/media/urls` quando não vem `fullUrl`.
- Sheets: iguais às do feed (§5).
- Estados: assinando (spinner branco); `fullUrl` ausente → "Foto indisponível"; vídeo (`mime video/*`) só muda o rótulo do botão share ("Compartilhar poster do vídeo") e exibe `Image` — não há player de vídeo.
- APIs: `POST /api/media/urls`; reações/comentários/denúncia; share (§8).
- PROBLEMAS:
  - `session` é lido de `sessionRef.current` no render e atualizado por efeito sem `setState`; no fluxo do álbum (`fullUrl` presente) nenhum estado muda depois de carregar a sessão ⇒ `session` fica `null` no render ⇒ estrela desabilitada e 💬/↗/··· ocultos (no fluxo feed/mine `setAssindo/setFullUrl` força re-render e mascara). Inferência por leitura; não executado.
  - Álbum entrega `autor:""` e reações zeradas ⇒ contagem/estado de curtida incorretos até o 1º toggle.
  - Perfil abre o detalhe com `interacao:"completo"` fixo, ignorando o gate (o servidor deveria recusar — não verificado).
  - `fullUrl` do álbum expira e o detalhe não renova.
  - Sem swipe entre fotos, pinça/zoom ou gesto de fechar; usa `SafeAreaView` do RN.
  - Sem vídeo, legenda/lugar nem data/hora.

## 11. `app/guest-profile.tsx` — Perfil do autor (`/guest-profile?autorId=`)

- Propósito: fotos de outro convidado.
- Funcionalidades: cabeçalho "←" + nome; grade 2 colunas quadradas paginada (`onEndReached`); toque abre `/photo-detail` (`interacao:"completo"`).
- Estados: carregando; `not_found` ("Perfil não disponível" / "Pode ser um link antigo ou alguém fora do seu alcance."); erro de rede (faixa "Não consegui carregar. Toque para tentar de novo."); vazio ("Nenhuma foto ainda."); sem sessão: spinner infinito (se `loadSession()` é `null`, `carregouUmaVez` nunca vira true).
- API: `GET /api/guests/{autorId}?eventoId&cursor`; `POST /api/media/urls`.
- PROBLEMAS: spinner infinito sem sessão; mistura `StyleSheet` + className; sem estatísticas/avatar (web: `profile-stats`, `profile-header`); `StyleSheet` com chaves não usadas (`cabecalho`, `fotoPlaceholder`).

## 12. `app/music.tsx` — Música do casal

- Propósito: ver a faixa do casal e sugerir faixas por link (ADR 0011).
- Funcionalidades: cartão da faixa (capa, provedor, rótulo, "Abrir no {provedor} →" via `Linking.openURL`); "Sugerir uma faixa": campo URL (autoCapitalize none, keyboard url) + "Sugerir" (só com `interacao==="completo"`; senão "A interação abre após a cerimônia."); lista "Fila de sugestões (N)" com votos, cada item abre o link no provedor. Recarrega ao focar.
- Validações: URL não vazia ("Cole o link da faixa."); mensagens por código do servidor (`MENSAGEM_ERRO` em `src/music.ts`: provedor fora da lista, teto de sugestões, limite excedido etc.).
- Estados: carregando; sem sessão (+ "Parear"); erro (+ "Tentar de novo"); sem faixa ("O casal ainda não escolheu a música."); gate fechado; enviando; "Sugestão enviada!"; "Sem conexão. Tente de novo.".
- API: `GET /api/music?eventoId`; `POST /api/music {url, evento}`.
- PROBLEMAS: `placeholderTextColor="var(--color-ink-2)"` (string CSS var — inválida no RN); mostra votos mas não há ação de votar; sem reprodução in-app; carrega duas vezes (`useEffect` + `useFocusEffect`); qualquer 403 sem código é tratado como "recusada" com a mensagem de gate.

## 13. `app/recado.tsx` — Recado dos anfitriões

- Propósito: texto (e áudio opcional) deixado pelo casal.
- Funcionalidades: card com texto (truncado em 160 chars + "ver inteiro"); player de áudio (▶/❚❚ "Ouvir áudio (Ns)", `expo-av`, `playsInSilentModeIOS`); "Entendi, obrigado" → `POST /api/recado` (marca lido) + `router.back()`. Para o áudio ao sair/desfocar.
- Estados: carregando; sem sessão (+ Parear); erro (+ Tentar de novo); vazio ("Nenhum recado por enquanto." + Voltar); pronto.
- API: `GET /api/recado?eventoId` → `{mostrar, tela:{texto,camera,audio{url,duracaoSegundos}}}`; `POST /api/recado?eventoId`.
- Permissões nativas: nenhuma (só reprodução).
- PROBLEMAS: `camera` do recado é ignorado; rota só alcançável pelo link em Missões (que só aparece com missões); "pausar" não retoma (`parar` descarrega o som); estado `paused` do player não é exibido; sem barra de progresso.

## 14. `app/confessional.tsx` — Confessionário

- Propósito: perguntas do pack; cada uma abre a câmera em modo vídeo.
- Funcionalidades: título/lede do pack (`confessionario.titulo/lede`); lista de prompts → `/photo?prompt=<chaveTitulo>&video=1`.
- Estados: carregando; sem sessão (+ Parear); erro (+ Tentar de novo); vazio ("Nenhuma pergunta neste evento." + "Voltar às Missões").
- API: `GET /api/guest/event` (só para o `packId`; as perguntas vêm do pack local `@albora/packs`).
- PROBLEMAS: sem botão voltar no cabeçalho; depende de vídeo com microfone desligado (§9.2); não lista vídeos já gravados; `chaveTitulo` (chave de vocabulário) vai como `promptKey`.

## 15. `app/queue.tsx` — Fila de envio

- Propósito: ver itens locais não enviados e forçar reenvio.
- Funcionalidades: lista (miniatura local se houver `thumb/poster/corpo` em arquivo; "Foto/Vídeo" + estado "Na fila", "Na fila · offline", "Na fila · sem sinal", "Enviando…", "Falhou · tentar de novo"); contador "Fila vazia / 1 na fila / N na fila"; "Fechar" (topo e rodapé); "Tentar de novo" (zera tentativas dos esgotados via `reiniciarTodosFalhos`, depois `drainGuestQueue(...,"manual")`); rodapé com telemetria ("Último drain ao voltar/manual/em background (hh:mm): N enviada(s)/N aguardando sinal/fila parada.") e "Background fetch: Ativo/Restrito pelo sistema/Negado — ative atualização em background/Indisponível neste ambiente".
- Estados: vazio ("Nada pendente — pode fechar."), enviando ("Enviando quando o sinal permitir…"), sem sinal ("Sem sinal — a gente reenvia sozinho quando voltar.").
- APIs: drain manual (presign/PUT/confirm). Permissões: nenhuma.
- PROBLEMAS: (a) `enviandoId:"primeiro"` marca só o item mais recente como "Enviando…" (o drain processa na ordem do índice, ascendente); (b) o subtítulo "Sem sinal — a gente reenvia sozinho quando voltar" aparece sempre que há itens e não está drenando, mesmo online; (c) a lista só recarrega ao fim do drain ou quando `online` muda; (d) "Tentar de novo" fica habilitado mesmo sem sinal; (e) sem remover item e sem mostrar o motivo da falha (`motivo` do `SendResult` não é persistido); (f) rodapé expõe jargão "Background fetch" ao convidado; (g) alcançável só pela câmera ("N na fila") ou por "Ver fila" em Minhas.

---

## 16. Módulos `src/**` (referência rápida)

| Módulo | Papel |
|---|---|
| `session.ts` | tipo/parse da sessão, `apiOrigin`, `redeemUrl`, `cookieHeader` |
| `pair-link.ts` | parse de `codigo` (4 dígitos) e `passagem` em URL e params |
| `event-theme.ts` | `GET /api/guest/event`; vars de tema via `@albora/tokens` + pack; parseia `filtroRecomendado` e `fuso` (nenhuma tela consome) |
| `feed.ts`, `guests.ts`, `my-photos.ts`, `album.ts`, `missions.ts`, `music.ts`, `recado.ts`, `stories.ts`, `recap.ts`, `reaction.ts`, `comments.ts`, `report.ts`, `sign-urls.ts` | clientes HTTP (cookie manual, `fetchFn` injetável) |
| `capture.ts`, `normalize-source.ts`, `filtro.ts`, `preview-filtro.ts`, `filter-strip.tsx`, `drawer.ts` (jpeg-js), `skia-drawer.ts` (Skia) | captura → processamento → arquivo → fila |
| `queue.ts`, `disk.ts`, `files.ts`, `queue-status.ts`, `queue-retry.ts` | fila em arquivo + utilitários |
| `upload.ts`, `upload-task.ts`, `upload-task-id.ts`, `put-file.ts`, `drain-guest.ts`, `drain-telemetry.ts`, `foreground-drain.ts`, `background-drain.ts`, `background-status.ts`, `online.ts` | drenagem |
| `share.ts`, `share-compose.ts`, `share-skia-frame.ts`, `share-frame-identity.ts`, `share-frame-palette.ts`, `share-font-*.ts`, `share-messages.ts`, `recap-select.ts` | compartilhar com moldura/colagem/recap |
| `recado-audio.ts` | player `expo-av` |

Fatos relevantes:
- `share.ts`: contexto via `GET /api/share?uploadId`; recusa se `panico`, `midia.removida` ou `!compartilhamentoExternoLiberado`; se `!consentimentoExterno` faz `POST /api/share {nomeNaMoldura:true}` sem UI de consentimento (também em colagem e recap). Baixa a foto, compõe 9:16 com `compor` do core (mesma matemática da web), renderiza em Skia (Fraunces 600 / Instrument Sans 400 mapeadas por stack), JPEG q90, abre a share sheet. Falha na moldura cai no arquivo cru (exceto colagem). Colagem 2–4 fotos (`autorizarColagem`, `celulasDaColagem`); recap 3–10 fotos, uma folha por arquivo, pula as que falham. Vídeo: compartilha o thumb (`chaveParaMoldura`).
- `share-skia-frame.ts`: modelo "ambiente" (fundo desfocado) e demais por `composicao`; faixa com monograma/título/data/crédito/legenda (≤80)/`albora.app/e/{slug}`.
- `capture.ts`: copia → valida HEIC → `processarFoto` (orientação + resize por plano/aparelho + filtro + reencode, remove EXIF) → `write` → confere GPS → `queue.enqueue`.
- `recap-select.ts`: `RECAP_MINIMO=3`, `RECAP_MAXIMO=10`.
- `disk.ts`: `queueRoot = documentDirectory + "fila"`, `mediaRoot = fila/arquivos`; índice `fila/index.json`.
- `expo-asset` é importado em `share-font-registry.ts` mas não consta nas dependências de `package.json` (vem transitivamente do `expo`; não verificado).

---

## 17. Fluxo da fila offline (passo a passo)

1. **Enfileirar** — `persistCapture` (`src/capture.ts`) chamado de `app/photo.tsx` (`enviar()` para foto; `shoot()` para vídeo do confessionário). Gera `id` (uuid `expo-crypto`), copia o arquivo da câmera para `documentDirectory/fila/arquivos/{id}.jpg|.mp4`, processa (foto) e sobrescreve o arquivo, monta `QueueItem {id, eventoId, corpo:{tipo:"arquivo",caminho,bytes}, mime, criadoEm, tentativas:0, capturadaEm, capturadaEmParede?, largura, altura, desafioId?, legenda?, lugar?, promptKey?}` e chama `queue.enqueue`. Não preenche `thumb`/`poster`/`story`/`musicTrackId`.
2. **Persistência** — `createFileQueue(diskStore(), queueRoot())` (`src/queue.ts`): um único `fila/index.json` com o array; cada operação é ler JSON → alterar → regravar (`enqueue` substitui item de mesmo id; `markAttempt` soma 1 até `MAX_ATTEMPTS=6`; `annotate`; `remove`). Não há lock entre operações concorrentes (ex.: enqueue da câmera durante `markAttempt` do drain) — risco de perda de escrita; não verificado em runtime. Nomes de campo são schema persistido (aviso em `packages/core/src/fila.ts`).
3. **Gatilhos do drain** (`drainGuestQueue(queue, origem)` em `src/drain-guest.ts`):
   - `foreground`: `subscribeForegroundDrain` (AppState `change→active`, guarda de reentrância) em `_layout.tsx`. Não dispara no cold start (o estado inicial não emite `change`).
   - `manual`: botão "Tentar de novo" em `/queue` (antes roda `reiniciarTodosFalhos`).
   - Origem padrão `"manual"`: `tryDrain` em `photo.tsx` (no foco da tela, após enfileirar foto, após enfileirar vídeo) — a telemetria dessas execuções sai rotulada "manual".
   - `background`: task `albora-guest-upload-drain` (`upload-task.ts`): carrega sessão; sem sessão → `NoData`; `drainGuestQueue(...,"background")`; `NewData` se `enviados>0 || retentar>0`, senão `NoData`; exceção → `Failed`.
   - Não há gatilho ao recuperar conexão (`subscribeOnline` só atualiza o rótulo em `/queue`).
4. **Execução** (`drainFileQueue`, `src/upload.ts`): guarda module-level `emCurso` (chamadas concorrentes recebem a mesma Promise). Sem sessão → resumo zerado (itens ficam). Cria o transporte nativo e chama `drain()` do core (`packages/core/src/envio.ts`): em série; `online` é um snapshot (`estaOnline()` lido uma vez antes do drain, repassado como `() => online`) — o "reconfere a cada item" do core não tem efeito no app.
   Por item (`sendItem`): se `tentativas >= 6` → `desistiu` ("tentativas esgotadas", item permanece no índice); senão:
   a. `POST /api/uploads/presign {uploadId,mime,bytes}` → `{full, thumb, chave}`;
   b. `sendBytes`: lê o arquivo inteiro (base64→`Uint8Array`) só para `stripGpsOrReject` (erro definitivo se houver GPS), depois `putFileFromDisk` = `uploadAsync` PUT `BINARY_CONTENT`, `sessionType: BACKGROUND` (URLSession iOS / upload nativo Android), `Content-Type: mime`; status fora de 2xx → `ApiError("put")`;
   c. `sendPoster` não existe no transporte nativo (thumb/poster nunca sobem do app);
   d. `POST /api/uploads/confirm {uploadId, chave, mime, desafioId, promptKey, legenda, lugar, capturadaEm(ISO), capturadaEmParede?, largura, altura}` (idempotente por `uploadId`);
   e. só após o confirm: `queue.remove(id)`; depois `removeFile(caminho)` dos `enviado`.
5. **Retry/backoff** — erro não definitivo (rede, 5xx, 4xx fora de 401/403/422): `queue.markAttempt` (+1, teto 6) e resultado `retentar` com `esperaSegundos = min(2^(tentativas+1), 60)`. Esse tempo é apenas informativo: nada no app agenda nem aguarda; a próxima tentativa só ocorre no próximo gatilho (item 3). Logo, 6 drains seguidos (ex.: 6 foros de câmera/foreground) esgotam o item rapidamente. Erro `definitivo` (`ApiError` 401/403/422, ou GPS detectado): resultado `desistiu` sem `markAttempt` — `tentativas` não muda.
6. **Status visível** — `queue-status.ts`/`my-photos.ts`: "Falhou" apenas quando `shouldGiveUp` (tentativas ≥ 6). Consequência: itens com erro definitivo (sessão expirada 401, GPS, 422) continuam "Na fila"/"Enviando…" para sempre e são re-tentados (e falham) a cada drain, sem nunca virar "Falhou" nem mostrar motivo. "Tentar de novo" só reinicia os de `tentativas ≥ 6` (`remove` + `enqueue` com `tentativas:0`; muda a ordem).
7. **Telemetria** — `telemetryFromSummary {origem, em(ISO), enviados, retentar, desistiram}` → memória + arquivo `cacheDirectory/albora-drain-telemetry.json` (o SO pode limpar o cache) → exibida em `/queue` (`resumoDrainTexto`) junto com `lerStatusBackgroundFetch`. Não é enviada ao servidor; não verificado se o app chama algum endpoint de funil (web tem `funil-from-drain`).
8. **Background** — `ensureGuestUploadBackgroundTask`: `TaskManager.isAvailableAsync`; status `Denied` → não registra; senão `registerTaskAsync(minimumInterval 15 min, stopOnTerminate:false, startOnBoot:true)` (idempotente por flag + `isTaskRegisteredAsync`). O intervalo real é do SO. O PUT usa sessão de upload em background (continua com o app em segundo plano), mas presign/confirm só rodam quando o JS roda (foreground ou task).
9. **Limpeza** — arquivo removido após envio confirmado; remoção manual em "Minhas" (`queue.remove`) não apaga o arquivo; não há rotina de órfãos nem expiração da fila (não verificado).

Lacunas da fila (fatos): backoff sem espera real; online-check estático; sem gatilho de reconexão nem de cold start; erros terminais não aparecem como falha; thumb nunca enviado; arquivo órfão ao remover; leitura integral do arquivo em memória por upload (inclui vídeo) para checar GPS; "Minhas" esconde a fila local quando o servidor falha.

---

## 18. Permissões nativas (resumo)

| Permissão | Onde | Texto |
|---|---|---|
| Câmera | `photo.tsx` (`useCameraPermissions`) | "A câmera tira a foto da festa. Sem ela o app não tem o que enviar." |
| Fototeca | `ImagePicker` ("Galeria") | "Escolha fotos da sua galeria para enviar ao álbum da festa." |
| Microfone | desligado | `microphonePermission:false` (vídeo do confessionário) |
| Background fetch | task de drain | `UIBackgroundModes: fetch`; Android `RECEIVE_BOOT_COMPLETED`, `WAKE_LOCK` |
| Notificações / localização | não usadas | — |

## 19. Dados que o app não consome (fatos)

`GuestEventTheme.fuso` e `filtroRecomendado`; `album.contadores`, `totalDePaginas`, `layoutId`, `slot`, `lugarId`, `hora`; `recado.camera`; `comments.respostaA` (no envio); `report.motivo`; `QueueItem.thumb/poster/story/musicTrackId`; `filtro.manuais`.

## 20. Problemas transversais de UX/UI (visíveis no código)

- Classes inexistentes no Tailwind do app: `bg-fundo` (sheets de comentários/denúncia — fundo indefinido), `bg-alerta` (badge "Falhou"), `pb-safe` (`ReacoesSheet`) — 7 ocorrências em `app/`.
- Sem tratamento de safe area (`Screen` usa `pt-12` fixo; TabBar `pb-6` fixo; sheets sem inset).
- Sessão expirada (401): as telas só detectam "sem sessão armazenada"; token vencido gera "Não carregou" genérico; sem "Parear de novo"/sair em Feed, Álbum e Minhas (só texto, sem botão).
- Gate de interação: só `music.tsx` explica "A interação abre após a cerimônia"; feed/detalhe apenas escondem controles.
- Ícones por emoji/glifo (★ ☆ 💬 ··· ↗ ✕ ▲ ▼); rótulos de aba de 9px; alvos de toque pequenos.
- Duplicação: três sheets duplicados feed↔photo-detail; padrão "sem sessão/erro" repetido em ~6 telas sem componente compartilhado.
- Falhas silenciosas (`catch {}` / retorno vazio) em tema, pack, preview, URLs assinadas, stories.
- Strings fixas em PT; vocabulário de domínio só via pack em lugares/confessionário.
- Sem testes de tela/e2e no app (só `src/*.test.ts` de lógica).

---

## 21. Paridade web × app

Web (guest: `apps/web/app/e/[slug]/{page(entrada),cover,photo,feed,missions,album,my-photos,music,confessional,pair,g/[autorId]}`, `app/g/[token]`, features em `apps/web/features/*`) vs app (11 rotas).

| Área | Web (fato) | App |
|---|---|---|
| Entrada/identidade | `features/guest`: `entry-flow`, `identity-sheet` (nome + consentimento versionado, ADR 0021), `scan-page`, `rescue-scanner`, `no-session`, `event-notice` (slug rotacionado/rascunho) | Nenhuma: só pareamento por código/passagem; sem nome, sem consentimento de entrada, sem scanner, sem tratamento de slug rotacionado/rascunho |
| Capa/home | `features/cover` (`cover-hero`, `moments-section`, contagem regressiva, atalhos) e `features/home` (`story-viewer`, `recado-story`, `home-feed-card`, `host-message-card`) | Sem capa nem home; após parear vai ao Feed; stories só como trilho (sem viewer) |
| Câmera/editor | `features/photo`: `camera-step`, `editor-step` com abas Filtros/Ajustes/Texto/Música (`editor-lut`, `editor-texto`, `editor-musica`), `details-step`, `success-step`, `pwa-install-cta`, `queue-panel`; `use-upload` aceita `story` e `musicTrackId`; vídeo | Câmera traseira + galeria; presets + intensidade, legenda, lugar; sem Ajustes, Texto, Música, story, tela de sucesso; vídeo só no confessionário |
| Fila | `use-event-queue`, `queue-panel`, `use-upload`, `offline-banner` | Fila em arquivo + background fetch + telemetria; sem banner offline global |
| Feed | `features/feed`: `viewer`, `hour-strip`, `temporal-filter`, `feed-filter-panel`, `new-photos-button`, `gate-opened-overlay`, `mirror-grid`, `report-sheet`, `comment-sheet`, `reaction-list-sheet`, `use-gate-transition` | Lista simples + reação/comentário/denúncia; sem filtros temporais, sem "novas fotos", sem transição ao abrir o gate, sem bloquear |
| Álbum | `features/album`: lightbox com navegação, `album-filters`, `album-counters`, `album-cover-hero`, `chapter-time-range`, timeline com abas | Capítulos expansíveis + grade; sem filtros, contadores, faixa horária, lightbox navegável |
| Missões | `features/missions`: progresso, `celebration-overlay`, `mission-completion-toast`, `free-mode-state`, lista de concluídas | Lista + contador; sem celebração/toast |
| Minhas fotos | `features/my-photos`: `gallery-item`, `retry-section`, `colagem-section`, `recap-section/card/sheet`, `moldura-picker`, `share-consent-sheet`, `retention-card`, `claim-photos-button`, `album-footer-cta` | Grade, remover, compartilhar com moldura, colagem, recap; sem seletor de moldura, sem folha de consentimento, sem retenção/entrega, sem reivindicar fotos |
| Música | `features/music`: `music-page`, `suggestion-form`, `queue-for-screen` | Faixa + sugestão + fila (equivalente no essencial; voto não verificado na web) |
| Perfil | `author-profile-page`, `profile-header`, `profile-stats`, `photo-grid` | Nome + grade; sem estatísticas |
| Recado | card do anfitrião + `voice-note-player` + story | Tela dedicada com texto/áudio e "marcar lido" |
| Confessionário | rota `confessional` | Tela + vídeo (sem áudio — §9.2) |
| Tema | `theme-preference`, `theme-setting` (claro/escuro do usuário) | Tema do evento via tokens; sem preferência do usuário |
| Pareamento | `features/pairing` (`pair-page`, `app-open-cta`) gera código/passagem | `pair.tsx` + `e/[slug]/pair.tsx` consomem |
| Funil/analytics | `guest/lib/funnel-*`, `report-funnel`, `/api/funil`, `/api/analytics` | Não verificado; drain-telemetry é local |
| Push | ADR 0015 existe; README do app: "Não há login, push, nem compra" | Sem push |

APIs usadas pelo app e presentes em `apps/web/app/api`: `app/parear/resgatar`, `guest/event`, `feed`, `stories`, `reaction`, `comments`, `media/report`, `media/urls`, `missions`, `album`, `my-photos`, `uploads` (+`presign`, `confirm`), `guests/[autorId]`, `guests/me/recap`, `music`, `recado`, `share`. Existem na web e o app não chama: `uploads/detalhes`, `bloqueios`/`blocks`, `sessions`, `compartilhar`, `guestbook`, `funil`/`funnel`, `parede/*`/`wall/*`, `e/[slug]/stats`.

Gate (web `photo-interaction.tsx`: "Reação não espera gate (ADR 0009); comentário, compartilhar, denunciar e bloquear esperam `interacao === completo`"): app — reação sem gate (igual); comentário/denúncia com gate (igual); compartilhar no app não depende do gate de interação (depende de `compartilhamentoExternoLiberado` do servidor); não há "bloquear".

## 22. Itens "não verificado"

- Comportamento em runtime de qualquer tela (nada foi rodado).
- Se o servidor devolve `lugar` como id ou título em `/api/my-photos`.
- Se `temGeolocalizacao` tolera bytes de MP4 grandes (o drain a executa também em vídeo).
- Como o expo-router trata rota desconhecida.
- Se há telemetria de funil no app além de `drain-telemetry`.
- Se `ImagePicker` pede permissão de fototeca explicitamente.
- Intervalo real do BackgroundFetch em iOS/Android.
- Se o botão de voto existe na web (música).


---

# Componentes e padrões transversais

Ver "Componentes reutilizáveis" em A §13 e B §10; módulos do app em C §16. Padrões repetidos: shell `GuestShell/Header/Main` (`packages/ui-web/src/guest-chrome`), `BottomSheet`, `nav-tabs` Explorar/Missões/Perfil, hooks por feature (`use-*`) com `fetch` direto a `/api/*`, handlers EN/PT duplicados (ADR 0014).

# Problemas transversais (consolidados)

1. Sem viewfinder real na câmera web (input `capture`); código morto em `features/photo` (B §0).
2. Promessas de UI sem garantia: "Já tá no telão", excluir conta/revogar consentimento ausentes em Minhas fotos (B §0.7, A §10).
3. Subrotas sem `isSameEventSession`; mensagem genérica por estado do evento (A §0).
4. Denúncia/bloqueio inconsistente entre feed espelho, álbum e home; botões mortos na Home (A §4, §11, §12).
5. Acessibilidade: overlays `aria-modal` sem gestão de foco, alvos e tipografia 9-11 px, emoji como ícone (A §0, §4).
6. Privacidade: vídeo sem remoção de metadado; `/p/[slug]` indexável com miniaturas de convidados; qualquer convidado autoriza telão; pânico toggle cego (B §0).
7. `/scan` não inicia o scanner e `BarcodeDetector` ausente em iOS sem aviso (B §0.9-10).
8. Paridade web x app e dados que o app não consome (C §19, §21).
