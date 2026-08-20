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

**Feliz:** parear → sessão SecureStore → câmera enfileira stills em disco; **drain** da fila nativa (`drainGuestQueue` / `drainFileQueue`) no caminho da câmera; **feed** lê `GET /api/feed` + `POST /api/media/urls`.

**EXIF/GPS 🟡:** Câmera captura com `exif: false`. `persistCapture` roda `processarFoto` + `bufferDrawer` (jpeg-js) — reencode remove EXIF/GPS; presets CSS via `aplicarFiltroCss` / `aplicarPorPixel`.

**Tira de filtros ✅:** após disparar, `photo.tsx` abre step de revisão com `FilterStrip` (ScrollView horizontal de chips de preset). Convidado escolhe preset (ou "Original") e toca "Enviar" → `filtroFromPreset(id)` converte para `FiltroAplicado` e `persistCapture` passa `filtro` para `processarFoto`. Math de cor vive em `@albora/core`; sem duplicação.

**Preview ao vivo ✅:** ao tocar num chip, `photo.tsx` lê os bytes da câmera, chama `previewFiltrado` (downsample para ≤320 px + `bufferDrawer.filtrar`) com debounce de 150 ms e geração counter para cancelar in-flight. Resultado convertido para data URI e exibido no `<Image>` com `opacity: 0.6` durante o processamento; chip "Original" volta ao URI raw da câmera sem custo. `previewFiltrado` é pura e testada sem React Native em `preview-filtro.test.ts`.

**Intensidade de preset ✅:** quando um preset está ativo, `IntensidadeChips` exibe 4 opções (25 %/50 %/75 %/100 %) abaixo da `FilterStrip`. Trocar preset reseta para 100 %. Mudar intensidade re-dispara o preview com debounce de 150 ms; o valor é passado como segundo argumento de `filtroFromPreset(id, intensidade)` tanto no preview quanto em `persistCapture`. Sem nova dependência — chips puros com `Pressable` do React Native.

**Galeria ✅:** botão "Galeria" em `photo.tsx` abre `launchImageLibraryAsync` (imagens, `exif:false`). `normalizeSource` (`normalize-source.ts`) sempre converte para JPEG via `manipulateAsync` (cobre HEIC e URIs `ph://`/`content://`). `persistCapture` recebe `convertHeic` injetável como rede de segurança. Testes em `normalize-source.test.ts` e `capture.test.ts`.

**Skia resize ✅:** `skiaDrawer` (`apps/mobile/src/skia-drawer.ts`) implementa a interface `Desenhista` com `@shopify/react-native-skia` ^1.11.11. Decode/resize/encode via GPU; resize com `FilterQuality.High` (bicúbico) no lugar do nearest-neighbor do `bufferDrawer`. `filtrar` lê pixels da imagem Skia → delega ao `@albora/core` (mesmas funções `aplicarFiltroCss`/`aplicarPorPixel`/`aplicarAjustes` do `bufferDrawer`) → recria `SkImage` — sem divergência de LUT entre os dois caminhos. `capture.ts` e `previewFiltrado` aceitam `desenhista?` opcional; padrão `bufferDrawer` mantém os testes em Node funcionando sem módulo nativo. `photo.tsx` injeta `skiaDrawer` tanto no preview ao vivo quanto em `persistCapture`. GPU ColorFilter (ColorMatrix direto no shader) fica fora do escopo desta fatia — otimização opcional, sem impacto na estética atual.

**Upload em segundo plano 🟡:** PUT presigned via `uploadAsync` + `FileSystemSessionType.BACKGROUND` (`put-file.ts`); task `albora-guest-upload-drain` registra `BackgroundFetch` para drenar a fila. Falta prova em aparelho com app fechado.

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
