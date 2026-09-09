# Álbora — Refatoração do QR + Kit de materiais (guia de implementação)

> **Para o agente/dev que vai implementar.** Traduz o redesign do **QR + materiais físicos** (protótipo em `prototipos/kit.html`) para o código atual. Fluxo **fechado e aprovado**. Companion de [`REFATORACAO.md`](./REFATORACAO.md) e [`telao.md`](./telao.md) — leia os não-negociáveis e gates de lá; valem aqui.

## 0. Como usar

- `prototipos/kit.html` é **referência visual e de interação**, não código pra copiar. Estado fake em JS, fotos IA como data-URI. **Não porte o JS.**
- **O backend do kit já existe e é robusto** (ver §3). O redesign é de **UX/UI e arquitetura de telas** em cima dele — não refaça a pipeline de PDF/SVG.
- Fonte de design: [`design-system-v3.md`](./design-system-v3.md). Zero hex em componente, zero string de domínio no core.

## 1. A virada de conceito

O antigo era uma tela de **"gerar QR"**. O redesign é um **produto de materiais** com a filosofia:

> **"Pronto em segundos. Personalizável se você quiser."**

Três pilares:

1. **Hierarquia por peso na entrada** (não obrigar ninguém a "trabalhar" por uma peça bonita):
   - **Usar assim** (≈90%) — mostra o resultado já com a identidade do casal → escolher peças → validar → baixar/imprimir.
   - **Personalizar** (≈9%) — editor mobile.
   - **Usar meu próprio design** (≈1%) — Canva/designer: baixar só o QR **ou** importar arte pronta.
   A entrada começa pelo **resultado** (carousel das peças), não por um botão "baixar".
2. **Editor mobile-first, modelo mental do Canva mas simples** (não recriar o Canva). Edição direta na peça, barra contextual por elemento, bottom sheets, poucos elementos de propósito.
3. **Guardrails > mensagens de erro.** O QR é protegido: é quase impossível criar um QR inválido (ver §5). Liberdade sem quebrar a função principal.

**Separações-chave de arquitetura:**
- **Formato físico ≠ design visual.** Trocar formato (mesa/A4/missão) **recompõe** o layout, não estica. Templates são pontos de partida, não prisões.
- **Identidade global do evento ≠ customização local da peça.** Mudar a cor/fonte de um elemento afeta só a peça; mudar a "cor principal do evento" afeta todo o universo (convidado/telão/álbum/QR/compartilhar/Reviver). Nunca alterar a identidade global silenciosamente — sempre com ação explícita ("Definir como cor principal do evento") ou o prompt "Manter as peças combinando?".

## 2. Não-negociáveis específicos (CLAUDE.md)

- **A entrada do convidado é frictionless e não pode ganhar um segundo onboarding.** O QR leva a `/e/{slug}?via=qr` → capa → Entrar na festa → **feed imediatamente**. Nome + consentimento só aparecem na **1ª ação que exige identidade** (câmera/upload, comentário, missão, reação). O kit é a porta física pra rede social daquela festa: **apontei → entrei**.
- **QR nível H, contraste ≥ 7:1, QR mínimo 30 mm, quiet zone intocável** — já são constantes do código (§3). O editor **não pode** permitir violar isso.
- **Isolamento por evento**: chaves de storage derivadas no servidor; slug é do evento; nada de cruzar eventos.
- **Um resolvedor de tokens, N renderizadores**: a peça impressa consome o **mesmo** resolvedor que web/telão/moldura. A placa combina com o telão porque saem do mesmo lugar.
- **Consentimento versionado e datado por sessão**, antes de qualquer captura (`consent-versions.ts`).
- **Nunca logar PII crua** (nome/telefone/e-mail mascarados).

## 3. Código atual (ponto de partida) — JÁ EXISTE

> Confirme os caminhos antes de editar (`git grep`).

- **Formatos das peças**: `packages/tokens/src/pieces.ts` — `placa-a4` (210×297 mm, QR 90 mm), `card-de-mesa` (100×140, QR 48), `card-de-missao` (55×85, QR 32). Constantes `BLEED_MM=3`, `SAFE_AREA_MM=5`, `QR_MIN_MM=30`, `QR_CONTRAST_RATIO=7`. `pieceProblems()` valida e **recusa** gerar peça inválida.
- **Geração de peças**: `apps/web/lib/api/handlers/admin-pieces.ts` (rota `app/api/admin/events/[eventId]/pieces/route.ts`, `?formato=&tipo=svg|pdf|zip`); `lib/domain/book/piece-layout.ts` `planPiece()`; `generate-piece-pdf.ts` (**pdf-lib + @pdf-lib/fontkit**, vetorial — sem puppeteer/satori), `generate-piece-svg.ts`, `pack-print-pieces.ts` (ZIP), `parse-pieces-query.ts`. Alias PT legada em `app/api/admin/eventos/[eventoId]/pecas/route.ts`.
- **QR**: `lib/utils/qr-svg.ts` `qrSvg()` (errorCorrectionLevel **H**); `packages/core/src/qr.ts` `eventEntryUrl(origin,slug,via)` → `/e/{slug}?via={qr|wa|link}`, `whatsappInviteUrl()`, `extractSlug()`; `origemPublica()`.
- **Slug**: `packages/db/src/events.ts` — 8 chars, alfabeto **sem l/o/0/1** ("vai na placa"); tabela `event_slugs`; `resolverSlug()` → estados `desconhecido | rascunho | slug_rotacionado | encerrado | nao_comecou | aberto` (slug antigo continua resolvendo pra orientar quem já escaneou).
- **Resolvedor de identidade**: `packages/tokens/src/resolver.ts` `resolveTokens({marca,vendor,pack,evento})`; `lib/domain/frame/frame-identity.ts` `identityToFrame()` (monograma/título/data); `frame-renderer.ts` (moldura de compartilhar).
- **Admin QR/impressão**: `app/admin/e/[eventId]/qrcode/page.tsx` + `features/admin/components/client/qr-code-print.tsx` (Imprimir / PNG via `features/admin/lib/qr-png.ts` `svgToPngBlob` / PDF via API); `copiar-link-evento.tsx` (`navigator.share`+clipboard); `event-nav.tsx` (abas "QR Code" e "Identidade").
- **Entrada do convidado**: `app/e/[slug]/page.tsx` (resolverSlug + `EntryFlow`), `features/guest/components/client/entry-flow.tsx` (`NameField` salva `localStorage["albora:nome"]`, `ConsentCheckbox` com `CONSENTIMENTO_ENTRADA_VIGENTE`), `POST /api/sessions` → `/e/{slug}/cover`.
- **Checklist/prova física**: `docs/runbooks/prova-qr-fisica.md`; `features/admin/lib/pre-event-checklist.ts`.

## 4. Alvo por superfície

### 4.1 Entrada — "QR da festa" (renomear de "Kit do salão")
- Hero **"Seu kit está pronto / Criamos tudo com a identidade de Ana & João"** + **carousel** das peças (preview realista na mesa; ← Placa · Card de mesa · Missões →).
- CTAs por peso: **Usar assim** (primário) · **Personalizar** (secundário) · **Usar meu próprio design →** (link terciário).

### 4.2 Usar assim — "Seu kit"
- Lista as peças (mini preview + nome + dimensões) + resumo de validação.
- **Testar QR com a câmera** (ver §6) + **Baixar / Imprimir** + nota: "imprima uma e teste na distância real antes de imprimir várias".

### 4.3 Editor (mobile-first)
- **Topo**: seletor de peça (chip "Card de mesa ▾" → sheet "Seu kit" que troca de peça **com transição de recomposição**), undo/redo, autosave ("Salvo"), **Editar ↔ Ver na mesa**, exportar.
- **Barra contextual** por seleção: sem seleção → Estilo · Fundo · Adicionar · Kit; texto → Editar · Fonte · Cor · Tamanho · Mais; QR → Tamanho · Moldura · Cor · Mais; imagem → Trocar · Cortar · Cor · Mais.
- **Hint descartável** no 1º uso: "Toque em qualquer parte do card para editar." (some pra sempre).
- **Fonte**: sheet mostrando a própria palavra em cada fonte, por categoria (Da identidade / Elegantes / Modernas / Clássicas / Manuscritas) + **combinações** (pares tipográficos).
- **Cor**: cores do evento primeiro (nomeadas) → recentes → neutros → picker + hex. **"Definir como cor principal do evento"** é explícito e separado. Mudança em elemento dispara **"Manter as peças combinando?"** (Manter / Só nesta).
- **Fundo**: Cor · Gradiente · Foto · Capa do evento · Enviar imagem (Transparente fica em **avançado**). Foto → escurecer/desfocar pra legibilidade.
- **Adicionar** (limitado de propósito): Texto · Foto · Monograma · Forma. **Sem** duplicar QR livremente, sem biblioteca de stickers.
- **Mover/redimensionar** direto (handles + guias magnéticas de centro). **Mais** = alinhamento, peso, trazer/enviar, duplicar, bloquear, excluir.
- **Aplicar este estilo a todo o kit** (recompõe por formato).

### 4.4 Usar meu próprio design
- **Já tenho minha arte** → importar PNG/PDF → Álbora posiciona o QR (tamanho/margem/contraste seguros) → aviso de baixa resolução → exportar.
- **Vou criar fora** → baixar só o QR (PNG/SVG/PDF) + **pacote pro designer** (QR.svg, QR.png, README com mínimo 30 mm, margem, contraste, URL, cores). Sem lock-in.

### 4.5 Exportação — "Como você vai usar?"
Imprimir em casa (PDF) · Mandar pra gráfica (PDF com sangria/marcas) · Usar digitalmente (PNG) · Editar em outro lugar (QR SVG/PNG). Bloquear export quando o QR estiver crítico.

### 4.6 Convidado (a ponte física→digital) — NÃO REGREDIR
`/e/{slug}?via=qr` → capa → Entrar → **feed**. Identidade só na 1ª ação. Estados do `resolverSlug` com tela própria (não começou / rascunho / código trocado / encerrado / desconhecido).

## 5. Guardrails do QR (spec de implementação)
Não basta avisar — **quando for seguro, corrija; quando for inseguro, impeça**:
- **Tamanho**: o slider/resize **para no mínimo** (30 mm no formato atual). Não dá pra deixar pequeno demais.
- **Contraste**: se a cor escolhida deixa o QR fraco, **ajustar o fundo do QR automaticamente** (branco/preto conforme o que dá ≥ contraste) e avisar ("Ajustamos o fundo do QR pra garantir a leitura").
- **Cobertura**: impedir/`snap` de elementos por cima da bbox do QR (ou bloquear export com aviso claro).
- **Quiet zone**: preservada sempre, independente da moldura escolhida.
- **Estados**: ✓ pronto pra impressão · ⚠️ no limite (foto de fundo, contraste no limite) · ⛔ crítico (bloqueia export). Nível de plano (`podeUsarTelao` é do telão; o kit segue as regras do plano do evento) — o gate de plano aparece no admin, nunca na peça.

## 6. Testar QR (experiência, não toast)
No protótipo é simulado; na implementação: abrir câmera → apontar pra peça impressa/outra tela → medir → **"✓ Funcionou — abriu em 0,8 s. Seu QR está pronto pra festa."** Conecta com o runbook de prova física (`prova-qr-fisica.md`) e com o checklist pré-evento.

## 7. Copy (pt-BR)
- Entrada: "Seu kit está pronto" · "Criamos tudo com a identidade de Ana & João" · "Usar assim" · "Personalizar" · "Usar meu próprio design".
- Seu kit: "O que vai pro salão — tudo com a identidade de vocês" · "Testar QR com a câmera" · "Antes de imprimir muitas cópias, imprima uma e teste o QR na distância real".
- Editor: "Toque em qualquer parte do card para editar" · "Manter as peças combinando?" · "Definir como cor principal do evento" · "Ajustamos o fundo do QR pra garantir a leitura".
- Canva: "Já tenho minha arte" · "Vou criar fora — leve só o QR" · "Não corte a margem clara em volta do QR — a quiet zone é o que garante a leitura".
- Instrução da peça (existe): `PIECE_INSTRUCTION = "Aponte para o QR da festa"` (editável pelo casal).

## 8. Estados de borda
QR crítico (export bloqueado), baixa resolução na arte importada, foto de fundo comprometendo o QR, slug rotacionado/encerrado/não começou (lado convidado), sem conexão (o kit é gerado server-side; download degrada com retry), plano sem recurso, formato sem espaço pra todos os elementos (recompõe), impressão em casa montando vários cards por folha A4.

## 9. Ordem de implementação sugerida
1. Entrada por peso (carousel + Usar assim/Personalizar/terciário) sobre a geração de peças atual.
2. "Seu kit" (lista + validação + baixar/imprimir) reusando `admin-pieces`.
3. Editor: canvas + seleção direta + barra contextual + undo/redo/autosave.
4. Editor: Estilo(templates)/Fundo/Cor/Fonte/Tamanho + Ver na mesa.
5. **Guardrails do QR** (clamp mínimo, auto-contraste, quiet zone, anti-cobertura) — bloqueante.
6. Kit inteiro (trocar peça com recomposição + "Manter as peças combinando?" + aplicar estilo ao kit).
7. Identidade global vs. local ("Definir como cor principal do evento").
8. Usar meu próprio design (baixar QR / pacote designer / importar arte + low-res).
9. Exportação por uso + Testar QR real.
10. Estados de borda.

## 10. Definition of Done (por tela)
[ ] tokens (zero hex) · [ ] copy do pack (zero domínio hardcoded) · [ ] mobile real (uma mão) · [ ] estados (loading/erro/vazio/sucesso) · [ ] **guardrails do QR impedem peça inválida** (não só avisam) · [ ] entrada do convidado segue frictionless (identidade só na 1ª ação) · [ ] um resolvedor de tokens alimenta peça+web+telão · [ ] a11y AA (foco, teclado, alvos ≥44px, reduced-motion, estado não só por cor) · [ ] não quebra os não-negociáveis (§2) · [ ] teste (unit da validação de peça + e2e do caminho QR→entrada) · [ ] guards de CI verdes.

## 11. Gates (CLAUDE.md)
Guards de isolamento e de tokens **bloqueantes desde o 1º commit**. Migrations forward-only. Nunca commitar segredo.

---

### Anexos
- `design-system-v3.md` — tokens, cor (2 camadas + engine), motion.
- `prototipos/kit.html` — QR + Kit (3 caminhos, editor mobile, guardrails, Testar QR) + convidado corrigido.
- `REFATORACAO.md` / `telao.md` — demais fluxos fechados.
