# Albora — Fluxos e nuances

> **Status:** contrato vivo (F0–F11).
> **Última revisão:** 2026-08-16
> **Complementa:** [`architecture.md`](./architecture.md), [`security.md`](./security.md), [`adr/`](./adr/README.md)

Este documento descreve **o que acontece** em cada superfície — caminho feliz, nuances e gap de código. Invariantes: convidado sem login e sem paywall; sábado 22h não depende do gateway; fotos ficam com o casal.

| | Significado |
|---|---|
| 🔴 | Caminho crítico (H1) |
| 🟠 | Reputação / jurídico / dado |
| ⚪ | Refinamento |
| ✅ | Ligado no código desta branch |
| 🟡 | Parcial |
| ❌ | Ainda não |

---

## F0 — Landing e conversão ✅

**Feliz:** `/` ou `/15-anos` → preço → Grátis `/admin/new?plano=free` · Completo `/admin/new?plano=celebration` · Fornecedor `mailto:` · demo `/e/festa-demo`. Sem cookie: `/admin/new` redireciona para `/admin/sign-in?next=…` preservando `plano`.

**Nuances:** CTA único; convidado nunca vê plano; pack troca vocabulário.

**Código:** CTAs ligados. `product_events` + `POST /api/analytics/product`: `landing_view` (beacon), `landing_cta` (Grátis/Completo), `landing_scroll_50` (scroll listener em ~50%), `landing_demo` (link de demo). ✅

---

## F1 — Conta do anfitrião ✅

**Feliz:** e-mail → magic link 15 min → cookie `albora_host` 12h → `/admin`.

**Nuances:** resposta anti-oráculo; link só no JSON em `APP_ENV=dev`; `sendHostEmail` (Resend) com degrade sem chave.

---

## F2 — Criação + pagamento ✅/🟡

**Feliz Grátis:** wizard (título + quando → identidade → missões → parede → peças) → evento `plan=free` + `event_members.couple` + jobs de retenção.

**Feliz Completo:** mesmo wizard → checkout Asaas (`POST /api/billing/checkout`) → webhook `PAYMENT_CONFIRMED`/`RECEIVED` → **única** escrita de `plan=celebration`. Stub em `APP_ENV=dev` sem `ASAAS_API_KEY`; com chave → Asaas sandbox/prod (`ASAAS_SANDBOX=0` = prod). Simulate: `/api/billing/simulate` em dev.

**Nuances:** nunca cartão para criar; upgrade no meio da festa não derruba sessão de convidado; entitlements `podeUsarTelao` / `podeBaixarZip`.

**Gap:** cartão/Pix real exige `ASAAS_API_KEY` + `ASAAS_WEBHOOK_TOKEN` fora de stub.

---

## F3 — Peças e QR ✅

**Feliz:** ZIP de peças no admin; URL impressa `/{slug}` → `/e/{slug}?via=`.

**Nuances 🔴:** contraste do QR; slug rotacionado = resgate, não 404.

---

## F4 — Convidado até a 1ª foto ✅

**Feliz:** via → nome + consent → capa → câmera → fila → R2 → confirm.

**Nuances:** gate `null` = fechado; PWA `start_url` = capa do evento; cota de vídeo pelo plano; confessionário = pergunta do pack → vídeo com `prompt_key`.

**Dreno ao voltar à aba/PWA:** `visibilitychange` (visible) e `pageshow` (persisted=bfcache) disparam `drenarAgora` se `navigator.onLine`; offline só atualiza contagens. Guarda com `drainingRef` evita double-drain concorrente com o intervalo de 30 s. Espelho do AppState drain do mobile.

---

## F5 — Feed, álbum, missões, música, recado ✅

**Feliz:** espelho vs social pelo gate; álbum por capítulos (incl. capítulo `confessionario` via `promptKey`); missões; música; recado; lightbox com `PhotoInteraction` (estrela + comentários) quando `interacao=completo`.

---

## F6 — Telão ✅

**Feliz:** `/wall` → parear QR → poll. Completo/vendor: authorize; free: 403 no host/TV (convidado não vê paywall).

**Nuances:** pânico; modelos da parede pós-criação; “Ligar telão” na capa.

---

## F7 — Admin ao vivo ✅

**Feliz:** pânico, menores, gate (agora / agendar / fechar), funil, moderação, Insights (só agregados), “Preciso de ajuda”.

---

## F8 — Pós-evento 🟡/✅

**Feliz:** ZIP completo + ZIP álbum curado (via `selecionarParaAlbum`, sem rajadas, ~60 páginas), ambos com step-up (plano pago); jobs `plus_48h` / `d330_drive` (stub) / `d365_delete` (**fail-closed** sem export).

**Livro PDF ✅:** `GET /api/admin/events/{id}/book/pdf` — A4 com sangria (`BOOK_BLEED_MM = 3 mm`; página física `BOOK_CUT_MM = 216 × 303 mm`), perfil sRGB prepress; slots do núcleo (`planBook` + `generateBookPdf`); thumbs embutidas via `readThumb` (cap 80 slots / 512 KiB por objeto, fallback `/full`); placeholders para slots sem thumb. Cadeia de tokens completa: `resolveTokens({ marca, vendor?, pack?, evento? })` — `--bg`/`--ink`/`--acento`/`--superficie` propagam para fundo/tinta/acento/placeholder do PDF. Aviso RGB→CMYK no CTA do admin (`text-ink-3`, sem hex). Header `x-albora-avisos` em todas as respostas com aviso sRGB.

**CMYK ✅ (flag/futuro):** `?perfil=cmyk` → 422 com mensagem PT-BR — conversão CMYK não está disponível no Worker. Padrão permanece sRGB prepress. GS roda offline em job fora do Worker, sob demanda da equipe de ops (ver [`docs/runbooks/cmyk-ghostscript.md`](./runbooks/cmyk-ghostscript.md)). Binário GS não está em CI nem no contêiner.

**Runner:** `node tools/jobs/retention.mjs` · export Drive: `pnpm drive-export` ou cron em `POST /api/jobs/drive-export` (Bearer `JOB_RUNNER_SECRET`). Em produção Cloudflare: fila `albora-drive-export` → consumer em `apps/web/cloudflare/worker.ts` (tick via `WORKER_SELF_REFERENCE`).

**Gap:** Prova impressa física antes do 1º evento real.

## F9 — Fornecedor ✅

**Feliz:** lead sob consulta; `vendor_members` / `event_members.planner` no schema; Insights portfólio `/admin/vendor/insights`; ACL `COUPLE_HOST_ROLES` (ZIP, billing, identidade) vs `ANY_HOST_ROLES` (painel) via `requireHostEventRole`; convite de equipe no admin (`GET`/`POST /api/admin/events/{id}/members` + painel Equipe).

**White-label ✅:** `vendors.brand_tokens` propaga para web e Expo. Cadeia: `resolverSlug` / `carregarEventoPublico` lê `brand_tokens` em `comEvento` (policy `vendor_marca_do_evento`, migration 0047); `EventoPublico.vendorBrandTokens` → `resolveGuestThemeVariables` (marca → vendor → pack → evento) via `eventVars` na web e `GET /api/guest/event` + `themeVariablesFromEvent` no mobile. Editor no portal: `PATCH /api/vendors/{id}/brand-tokens` (só `admin`). Isolamento: GUC `app.event_id` é `SET LOCAL` — convidado do evento A nunca lê tokens do vendor do evento B.

**Gap:** —

---

## F10 — Expo ✅/🟡

**Feliz:** parear → sessão SecureStore → câmera enfileira stills em disco; **drain** da fila nativa (`drainGuestQueue` / `drainFileQueue`) no caminho da câmera; **feed** lê `GET /api/feed` + `POST /api/media/urls`; **álbum** lê `GET /api/album` (mesmo contrato da web) e exibe capítulos com thumb + contagem de fotos; pull-to-refresh; renovação automática ao expirar (`expiraEm`); sem sessão → CTA de parear.

**Álbum ✅:** `apps/mobile/src/album.ts` encapsula `buscarAlbum(session)` com fallback tipado (`falha: "rede" | "sessao"`), `thumbDoCaptitulo` e `totalFotosCapitulo`. `album.tsx` renderiza `FlatList` de capítulos (thumb 56×56, título, contagem); toque no capítulo expande grid de miniaturas (3 colunas), toque em miniatura abre `/photo-detail` com `fullUrl` já assinada da resposta do álbum. Contrato de tipos local espelha `ServedAlbum` do servidor sem importar o pacote web. Testes em `src/album.test.ts` (15 casos, mock fetch).

**Feed social ✅:** `feed.tsx` adiciona `StoriesRail` no `ListHeaderComponent` — ScrollView horizontal de avatares circulares (miniatura 56×56 com borda `acento`, iniciais como fallback) carregados por `fetchStories` (`src/stories.ts`); CTA "+" à esquerda navega para `/photo`; falha silenciosa, nenhum erro exibido (CLAUDE.md "degrada, nunca falha"). Tocar num card do feed navega para `/photo-detail` via `router.push`, passando `uploadId`, `chaveFull`, `interacao`, flags `minha`/`autor`/`reacoes`/`minhaReacao` como params de string. `src/stories.ts` encapsula `fetchStories(session)`: busca `/api/stories`, assina miniaturas via `signMediaUrls` e retorna `StoryItem[]`; nunca lança. Testes em `src/stories.test.ts` (9 casos, mock fetch).

**Detalhe de foto ✅:** `app/photo-detail.tsx` (Stack route) abre a foto em tela cheia com `Image resizeMode="contain"`. Dois caminhos de URL: (a) feed passa `chaveFull` → assina via `POST /api/media/urls` ao montar; (b) álbum passa `fullUrl` já assinada → sem requisição extra. Barra superior com botão de fechar (`router.back()`). Ações sociais com gate (ADR 0009): estrela sempre visível; comentários e denúncia só com `interacao=completo`. Reutiliza `ComentariosSheet` e `DenunciaSheet` idênticos ao feed; gerencia estado de reação localmente via `toggleReaction`.

**EXIF/GPS 🟡:** Câmera captura com `exif: false`. `persistCapture` roda `processarFoto` + `bufferDrawer` (jpeg-js) — reencode remove EXIF/GPS; presets CSS via `aplicarFiltroCss` / `aplicarPorPixel`.

**Tira de filtros ✅:** após disparar, `photo.tsx` abre step de revisão com `FilterStrip` (ScrollView horizontal de chips de preset). Convidado escolhe preset (ou "Original") e toca "Enviar" → `filtroFromPreset(id)` converte para `FiltroAplicado` e `persistCapture` passa `filtro` para `processarFoto`. Math de cor vive em `@albora/core`; sem duplicação.

**Preview ao vivo ✅:** ao tocar num chip, `photo.tsx` lê os bytes da câmera, chama `previewFiltrado` (downsample para ≤320 px + `bufferDrawer.filtrar`) com debounce de 150 ms e geração counter para cancelar in-flight. Resultado convertido para data URI e exibido no `<Image>` com `opacity: 0.6` durante o processamento; chip "Original" volta ao URI raw da câmera sem custo. `previewFiltrado` é pura e testada sem React Native em `preview-filtro.test.ts`.

**Intensidade de preset ✅:** quando um preset está ativo, `IntensidadeChips` exibe 4 opções (25 %/50 %/75 %/100 %) abaixo da `FilterStrip`. Trocar preset reseta para 100 %. Mudar intensidade re-dispara o preview com debounce de 150 ms; o valor é passado como segundo argumento de `filtroFromPreset(id, intensidade)` tanto no preview quanto em `persistCapture`. Sem nova dependência — chips puros com `Pressable` do React Native.

**Galeria ✅:** botão "Galeria" em `photo.tsx` abre `launchImageLibraryAsync` (imagens, `exif:false`). `normalizeSource` (`normalize-source.ts`) sempre converte para JPEG via `manipulateAsync` (cobre HEIC e URIs `ph://`/`content://`). `persistCapture` recebe `convertHeic` injetável como rede de segurança. Testes em `normalize-source.test.ts` e `capture.test.ts`.

**Skia resize ✅:** `skiaDrawer` (`apps/mobile/src/skia-drawer.ts`) implementa a interface `Desenhista` com `@shopify/react-native-skia` ^1.11.11. Decode/resize/encode via GPU; resize com `FilterQuality.High` (bicúbico) no lugar do nearest-neighbor do `bufferDrawer`. `filtrar` lê pixels da imagem Skia → delega ao `@albora/core` (mesmas funções `aplicarFiltroCss`/`aplicarPorPixel`/`aplicarAjustes` do `bufferDrawer`) → recria `SkImage` — sem divergência de LUT entre os dois caminhos. `capture.ts` e `previewFiltrado` aceitam `desenhista?` opcional; padrão `bufferDrawer` mantém os testes em Node funcionando sem módulo nativo. `photo.tsx` injeta `skiaDrawer` tanto no preview ao vivo quanto em `persistCapture`. GPU ColorFilter (ColorMatrix direto no shader) fica fora do escopo desta fatia — otimização opcional, sem impacto na estética atual.

**Upload em segundo plano 🟡:** PUT presigned via `uploadAsync` + `FileSystemSessionType.BACKGROUND` (`put-file.ts`); task `albora-guest-upload-drain` registra `BackgroundFetch` para drenar a fila (sem sessão → `NoData`; com progresso → `NewData`). **Fila de envio ✅:** `/queue` lista pendentes/falhos com preview local, rótulos alinhados ao catálogo (`queue-status`) e **Tentar de novo** (`queue-retry` + drain). Badge “N na fila” na câmera abre a fila; Minhas linka **Ver fila →** quando há itens locais. **Telemetria ✅:** `drain-telemetry` grava último drain (origem foreground/background/manual) + status BG na `/queue`. **Rede ✅:** `@react-native-community/netinfo` (`online.ts`) — rótulos offline/sem sinal na fila e gate do drain. Falta prova com app killed.

**Parear ✅:** index redireciona com sessão válida → feed; deep link `albora://pair?codigo=1234` preenche os quatro dígitos e **resgata sozinho**; `?passagem=` (token one-shot ADR 0009) resgata direto no feed; universal link `https://albora.app/e/{slug}/pair?…` cai em `app/e/[slug]/pair` → `/pair`.

**Universal links 🟡:** `app.config.ts` + rotas dinâmicas `/.well-known/*` (`IOS_APP_TEAM_ID`, `ANDROID_APP_SHA256`); CTA **Abrir no app** usa `passagem`. Runbook: [`docs/runbooks/universal-links.md`](./runbooks/universal-links.md). Falta credenciais reais no deploy + rebuild nativo.

**EAS dev-client 🟡:** `expo-dev-client` + perfil `development` em `eas.json` (APK Android, iOS dispositivo físico, `UIBackgroundModes: fetch`, `eas-build-pre-install` copia fontes). Expo Go não carrega Skia nem background fetch — validação exige `eas build --profile development` + `pnpm start --dev-client`. Runbook: [`docs/runbooks/dev-client-smoke.md`](./runbooks/dev-client-smoke.md).

**Legenda e lugar ✅:** no step de revisão de `photo.tsx`, abaixo da tira de filtros, o convidado pode digitar uma legenda (máx 280 chars) e escolher um chip de lugar da lista fechada do pack (carregada via `GET /api/guest/event` → `PACKS[packId].lugares`). Ambos são opcionais e **nunca bloqueiam o envio**; se o pack não carregar, os chips simplesmente não aparecem. `persistCapture` recebe `legenda` e `lugar` e os inclui no `QueueItem`; o confirm já propagava esses campos para o banco. Sem novo campo no servidor.

**Remover foto em Minhas ✅:** `mine.tsx` exibe botão "Remover" em cada item e aceita long-press. Para fotos já enviadas (`tipo: "enviada"`): chama `DELETE /api/uploads` com `{ uploadId }` via `deletarFotoEnviada` (novo helper em `my-photos.ts`). Para pendentes/falhos locais: chama `queue.remove(id)` sem rede. Confirmação via `Alert.alert` antes de remover. Após sucesso, o item é retirado do estado local imediatamente, sem novo fetch. Testes em `my-photos.test.ts` (4 casos para `deletarFotoEnviada`).

**Drain ao retornar ao primeiro plano ✅:** `subscribeForegroundDrain` (`foreground-drain.ts`) assina `AppState.change` em `_layout.tsx`; quando o app transita para `active`, chama `drainGuestQueue(guestQueue())`. Guard de reentrância impede chamadas paralelas. Sem sessão → no-op (retorno imediato com `{ enviados: 0 }`). Prova de app completamente fechado (killed) permanece 🟡 (depende de `BackgroundFetch` do SO).

**Missões ✅:** `apps/mobile/src/missions.ts` encapsula `fetchMissoes(session)` contra `GET /api/missions` (handler `apps/web/lib/api/handlers/guest-missions.ts`). Endpoint requer sessão de convidado, aplica RLS via `withEvent` + `listChallenges`, resolve rótulo via `PACKS[packId]`. `(tabs)/missions.tsx` renderiza lista com check de conclusão por sessão; tocar numa missão navega para `/photo?missao=<uuid>`. `photo.tsx` lê `useLocalSearchParams({ missao })` e passa `desafioId` para `persistCapture`, que o inclui no `QueueItem` (campo `desafioId`). Pack sem missões → CTA de câmera livre sem `desafioId`. Testes em `src/missions.test.ts`.

**Música do casal ✅:** `apps/mobile/src/music.ts` encapsula `fetchMusica(session)` contra `GET /api/music` e `sugerirMusica(session, url)` contra `POST /api/music`. Tipos locais espelham `VisibleTrack`/`VisibleSuggestion` da web sem importar o pacote web. `app/music.tsx` (stack screen via file-based routing) exibe a faixa do casal (capa, rótulo, provedor) com botão "Abrir no provedor" via `Linking.openURL`; gate `interacao === "espelho"` bloqueia o formulário de sugestão antes da cerimônia; fila de sugestões ordenada por votos. Sem sessão → CTA de parear. `(tabs)/missions.tsx` expõe link secundário "Música do casal →" ao fim da lista. Testes em `src/music.test.ts` (17 casos, mock fetch).

**Recado (áudio) ✅:** `recado.tsx` toca o áudio dos anfitriões via `expo-av` (`tocarUrl` em `recado-audio.ts`); play/pause; falha soft.

**Recap ✅:** card no topo de Minhas via `GET /api/guests/me/recap` (`buscarRecapPessoal` / `textoRecap`) — soft fail, some se zero fotos. Com ≥3 fotos enviadas elegíveis, botão **Recap** monta até 10 molduras (`recap-select` + `compartilharRecap`) — uma folha nativa por foto (paridade com fallback web).

**Compartilhar ✅:** em `photo-detail` e em Minhas (foto enviada) → `GET/POST /api/share` + composição `compor` (`@albora/core`) + moldura Skia 9:16 (`share-skia-frame.ts`) + `expo-sharing`. Se Skia/compose falhar, cai no arquivo raw (nunca bloqueia). Vídeo usa `chaveThumb`. Tipografia: stacks licenciadas mapeiam para Fraunces/Instrument Sans embutidas (`familiaEmbutidaDaStack` + `share-font-registry`); famílias fora do catálogo caem no `matchFont` do SO.

**Colagem ✅:** modo “Colagem” em Minhas (2–4 fotos enviadas) → `compartilharColagem` + `celulasDaColagem` + `renderShareCollage` (Skia). Sem fallback raw.

**Confessionário ✅:** `app/confessional.tsx` lista prompts do pack; abre `/photo?prompt=…&video=1`; gravação com contagem regressiva 20s e toque para parar; `persistCapture` enfileira vídeo com `promptKey` (sem Skia). Vazio → CTA Missões. Link em Missões.

---

## F11 — Papéis e analytics ✅

| Perfil | Rota | Dados |
|---|---|---|
| Noivos | `/admin/e/{id}/insights` | H1, funil, vias — sem nomes/thumbs |
| Cerimonialista | `/admin/vendor/insights` | lista de eventos da conta |
| Owner | `/ops`, `/ops/insights`, `/ops/support`, `/ops/events?slug=` · `/ops/e/[slug]` · `/ops/e/[slug]/painel` | landing + tickets + lookup agregado por slug + painel read-only completo (título, plano, equipe, tickets, métricas); operador em `platform_operators` |

**Schema:** `event_members`, `platform_operators`, `product_events`, `analytics_snapshots`, `support_*`.

**Jobs:** `tools/jobs/analytics-snapshots.mjs` materializa `analytics_snapshots` (event/live **e** platform/live). Funil comercial dispara `account_created` / `event_created` / `qr_downloaded` / `checkout_started` / `checkout_paid`.

**Código:** `/ops/insights` lê snapshot `scope=platform` (fallback live). Painel read-only em `/ops/e/[slug]/painel` mostra detalhes completos do evento sem impersonação.

**Gap:** —

---

## Mapa rápido

```
Landing → magic link → wizard (± Asaas stub/webhook)
       → /{slug} → /e/slug → capa → foto/feed/álbum(+lightbox social)/confessionário
Admin → ao vivo / Equipe (convite) / Insights / suporte / Assinar Completo
TV → wall-pair → telão
Expo → parear → feed + câmera + drain
Ops → support + KPIs 7d + lookup por slug
Jobs → retention +48h / D330 stub / D365 fail-closed · analytics-snapshots
Product → landing_* + account/event/qr/checkout_*
```
