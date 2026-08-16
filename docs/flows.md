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

## F8 — Pós-evento 🟡

**Feliz:** ZIP completo + ZIP álbum curado (via `selecionarParaAlbum`, sem rajadas, ~60 páginas), ambos com step-up (plano pago); jobs `plus_48h` / `d330_drive` (stub) / `d365_delete` (**fail-closed** sem export).

**Runner:** `node tools/jobs/retention.mjs`.

**Gap:** Drive OAuth real; livro PDF print-ready.

---

## F9 — Fornecedor ✅/🟡

**Feliz:** lead sob consulta; `vendor_members` / `event_members.planner` no schema; Insights portfólio `/admin/vendor/insights`; ACL `COUPLE_HOST_ROLES` (ZIP, billing, identidade) vs `ANY_HOST_ROLES` (painel) via `requireHostEventRole`; convite de equipe no admin (`GET`/`POST /api/admin/events/{id}/members` + painel Equipe).

**Gap:** white-label.

---

## F10 — Expo ✅/🟡

**Feliz:** parear → sessão SecureStore → câmera enfileira stills em disco; **drain** da fila nativa (`drainGuestQueue` / `drainFileQueue`) no caminho da câmera; **feed** lê `GET /api/feed` + `POST /api/media/urls`.

**EXIF/GPS 🟡:** Câmera captura com `exif: false`. `stripGpsOrReject` bloqueia PUT de foto com GPS (galeria/HEIC) devolvendo erro definitivo — **sem reencode**, coordenadas nunca sobem. Gap: `processarFoto` + Desenhista Expo = reencode que remove EXIF + aplica LUT; galeria/HEIC voltam a funcionar quando existir.

**Gap 🟡:** PUT em segundo plano (`URLSession` / WorkManager); lojas / EAS.

---

## F11 — Papéis e analytics ✅/🟡

| Perfil | Rota | Dados |
|---|---|---|
| Noivos | `/admin/e/{id}/insights` | H1, funil, vias — sem nomes/thumbs |
| Cerimonialista | `/admin/vendor/insights` | lista de eventos da conta |
| Owner | `/ops`, `/ops/insights`, `/ops/support`, `/ops/events?slug=` · `/ops/e/[slug]` · `/ops/e/[slug]/painel` | landing + tickets + lookup agregado por slug + painel read-only completo (título, plano, equipe, tickets, métricas); operador em `platform_operators` |

**Schema:** `event_members`, `platform_operators`, `product_events`, `analytics_snapshots`, `support_*`.

**Jobs:** `tools/jobs/analytics-snapshots.mjs` materializa `analytics_snapshots` (event/live) — rodando. Funil comercial dispara `account_created` / `event_created` / `qr_downloaded` / `checkout_started` / `checkout_paid`.

**Código:** KPIs cross-event básicos em `/ops/insights` (eventos com atividade, uploads, product_events, tickets abertos — 7d). Painel read-only em `/ops/e/[slug]/painel` mostra detalhes completos do evento sem impersonação.

**Gap:** agregador auditado completo da plataforma (scope=platform em analytics_snapshots).

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
