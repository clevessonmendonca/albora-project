# Álbora — Design System v3 (fundação do redesign)

Referência única para redesenhar todas as telas. O flagship **Criar evento** (`albora-criar-v3.html`) é a implementação canônica destes tokens — copie o `:root` e os componentes dele.

---

## 0. Princípios (decidem qualquer dúvida)
1. **Show > Explain** — preview real, nunca descrição.
2. **Fotografia é a interface** — a foto estrutura a tela; chrome mínimo. **Nunca gradiente fingindo foto.**
3. **Duas camadas** — produto Álbora neutro; cor/foto pertencem ao evento.
4. **Menos decisões** — smart defaults + progressive disclosure; 1 decisão principal por viewport.
5. **Time to value** — o evento *nasce*, não se *preenche*.
6. **Tecnologia invisível** — sem jargão; movimento só pra explicar estado.
7. **Lifecycle** — a tela certa na hora certa (preparar → viver → reviver).

Anti-slop proibido: gradiente azul/roxo genérico, glow neon, glassmorphism gratuito, card-dentro-de-card, borda/pill em tudo, emoji, blobs, sombra excessiva, KPI dashboard B2B, bento só por moda.

---

## 1. Cor — camada PRODUTO (neutra, não muda por evento)
```
--bg:#FAF8F4        --surface:#FFFFFF     --surface-2:#F4F1EB   --surface-3:#EDE8DE
--ink:#1F1B18       --ink-2:#6B645C       --ink-3:#9C948A
--line:#E9E4DA      --line-2:#DBD3C6
--brand:#D9793C     --brand-ink:#9E4A22   (âmbar = identidade Álbora; botão primário, item ativo, links, eyebrow, foco)
```
Dark (segue o sistema + toggle vence):
```
--bg:#141110 --surface:#1C1815 --surface-2:#242019 --surface-3:#2C271F
--ink:#F4F0E9 --ink-2:#B8AFA4 --ink-3:#877E74 --line:#2C2620 --line-2:#39322B --brand-ink:#E7A063
```
Três estados: `:root` = light canônico; `@media (prefers-color-scheme:dark){:root:not([data-theme=light]){…}}`; `:root[data-theme=dark]{…}`.

## 2. Cor — camada EVENTO (do casal; NÃO repinta o produto)
Aparece só em: capa, telão, experiência do convidado, QR, seleções/highlights, chips de momento, CTA do convidado.
```
--ev  --ev-hover  --ev-on  --ev-soft(.12)  --ev-tint(.05)  --ev-border(.24)
```
**Engine** (`applyEvent(hex)` no flagship): deriva hover (mix 16% preto), escolhe `--ev-on` por contraste (branco vs tinta), calcula razão WCAG e mostra badge AA. **Nunca** texto branco cego sobre qualquer cor — adapta.
**Cor da foto**: `paletteFromPhoto()` extrai ~5 dominantes da capa via canvas (data-URI, sem CORS). Oferecer: picker + HEX + sugestões + **paleta da foto**. (Cores recentes: TODO.)

## 3. Tipografia
- **Serif = assinatura** (Fraunces, weight 300/400): nome do evento, hero, capa, momentos especiais, retrospectiva. Uso raro.
- **Sans = produto** (Instrument Sans): nav, forms, botões, dados, labels, tabelas. Números **nunca** serif (`font-variant-numeric:tabular-nums`).
- Escala display: `clamp(1.9rem,4.5vw,2.9rem)`. Body 15px. Label 11px/letter-spacing .16em uppercase.

## 4. Espaço, raio, sombra
- `--sp:clamp(1.1rem,3.5vw,2rem)` (padding de tela). Raio: `--r:12px --r-lg:20px --r-xl:28px`. Pill 999px só em botão/chip.
- Sombra: `--shadow-1` (sutil), `--shadow-2` (preview/elevado). **Regra: não crie card quando espaço/hierarquia/foto resolvem.** Preferir espaço > borda; hierarquia > container; foto > decoração.

## 5. Motion
`--curva:cubic-bezier(.22,.61,.36,1)`. 150–300ms. Movimento só pra explicar estado (entrada de step `rise`, foto novo no feed, seleção responde). `@media (prefers-reduced-motion:reduce)` zera tudo.

## 6. Ícones
Lucide, stroke 1.7–1.8, tamanhos por contexto (24 grid / 18 nav / 16 botão). Ícone só quando aumenta compreensão. **Zero emoji.** Ícones que pintam sobre foto/dark (QR, câmera, X) via `<svg>` inline com `currentColor`, não `<i data-lucide>` (evita bug de cor).

## 7. Componentes canônicos (ver flagship)
- **btn**: primary (âmbar/tinta), secondary (outline), ghost, event (cor do casal). Pill, active scale .98.
- **cover / preview**: foto + gradiente + título editável (contenteditable) + data + QR clicável. Layouts: `lay-editorial/minimal/contempo/classic/fotografico`. É o "produto real", manipulação direta.
- **type card / style card**: escolha visual foto-first com tick de seleção.
- **inp / field**: min-height 46px, foco âmbar. `type=date` nativo. Input certo por teclado no mobile.
- **seg** (segmented), **swatches** (cor), **chips** (momentos, cor do evento).
- **pill de status**: ok/warn/off (Contratado/Pendente/Inativo; Vigente/Arquivada).
- **sheet**: bottom/center overlay pra "ver como convidado" e ações contextuais mobile.

## 8. Estados (toda superfície)
default · hover · focus (visível) · active · selected · disabled · **loading (skeleton)** · success · **error** · **empty** · offline · permission-denied. E quando fizer sentido: uploading · processing · moderating · live · paused · expired. Nunca só o happy path.

## 9. Mobile-first
Bottom tab (host): Início · Fotos · Convidados · Evento. Ações contextuais em bottom sheet. Targets ≥44px. CTA sempre alcançável. Uma decisão principal por viewport. Preview vai pro topo (não some). Skeleton no carregamento.

## 10. Acessibilidade
WCAG AA de contraste (engine verifica), focus-visible, navegação por teclado, aria, reduced-motion, estado nunca só por cor, text-scaling, light/dark reais, `<img alt>` — mas **jamais** vazar PII em alt/label.

## 11. Fotografia
Fotos IA (nunca foto real de convidado — LGPD). No artifact, embutidas como data-URI (canvas p/ paleta funciona). Álbum = experiência foto-first (Apple Photos): masonry, fullscreen, swipe. Pós-evento = retrospectiva.

## 12. Arquitetura de navegação (era 16 itens → 5–6)
**Visão geral · Fotos · Convidados · Experiência · Evento · Insights**
- Experiência ⊃ Missões · Telão · Moderação
- Evento ⊃ Aparência · Momentos · QR & materiais · Recado · Equipe · Consentimento

## 13. Lifecycle da Home
- **Antes**: "Faltam N dias", preparação %, próximas ações, countdown.
- **Durante**: "Estamos ao vivo", fotos chegando, participação, moderação, estado do telão, controles (gate/pânico/só-maiores).
- **Depois**: "Que noite.", retrospectiva, momentos, estatísticas, álbum.

## 14. UX writing
Humano, curto, seguro. "Pronto. Seu evento foi atualizado." (não "Configuração processada com sucesso"). Esconder jargão (gate, pipeline, asset, retention) do usuário final.

## 15. Analytics (instrumentar no código)
landing_view · landing_cta_clicked · event_creation_started · event_type_selected · event_name_entered · **first_preview_rendered (AHA 1)** · appearance_selected · signup_* · event_created · guest_preview_opened · qr_viewed/downloaded/shared · first_guest_open · **first_photo_received (AHA 2)** · plan_viewed · checkout_started · purchase_completed. Sem dark patterns.

## 16. Escopo / regras que não mudam
Convidado sem login/app; servidor não toca bytes (PUT presign); EXIF no cliente; caminho crítico só storage+Postgres; IA nunca sobre mídia de convidado (ADR 0007); RLS por event_id; migrations forward-only; sem hex hardcoded em componente; sem string de domínio no core (packs). Preços de plano são **placeholder** até validar comercial (§25).
