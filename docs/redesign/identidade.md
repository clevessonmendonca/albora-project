# Álbora — Refatoração da Identidade / Aparência (guia de implementação)

> **Para o agente/dev que vai implementar.** Traduz o redesign da **Aparência / identidade visual do evento** (protótipo em `prototipos/identidade.html`) para o código atual. Fluxo **fechado e aprovado**. Companion de [`REFATORACAO.md`](./REFATORACAO.md), [`telao.md`](./telao.md) e [`kit.md`](./kit.md).

## 0. Como usar

- `prototipos/identidade.html` é referência visual/interação, não código pra copiar. **Não porte o JS.**
- **O motor de tokens já existe e é bom** (§3). O redesign é da **experiência de edição** em cima dele — não refaça o resolvedor nem os renderizadores.
- Design: [`design-system-v3.md`](./design-system-v3.md).

## 1. A virada de conceito

Aparência **não é uma página de configurações**. É **"a cara de Ana & João"**. Princípio:

> **Álbora decide o difícil. O usuário escolhe o que sente.**

O casal escolhe **estilo, cor, fonte, capa, monograma**. O sistema resolve **contraste, cores derivadas, fundo técnico, estados, espaçamento, raio, movimento, adaptação entre superfícies e legibilidade**.

Três decisões de UX que definem o redesign:

1. **Narrativa: escolho → vejo → refino.** O primeiro acesso **não** mostra preview antes da 1ª escolha. Fase 1 = "Qual combina mais com vocês?" + cards de estilo. Fase 2 (após escolher) = "Ficou assim" + preview + refino opcional.
2. **Refino é opcional e compacto.** Depois de "Quer deixar mais com a cara de vocês?", quatro **cards compactos** (Cores / Fonte / Capa / Monograma) mostram o estado atual e só abrem o detalhe quando tocados. Nada fica permanentemente expandido.
3. **Curadoria, não configuração.** Zero jargão na UI (nada de "token", "resolvedor", "renderizador", "LUT", "AA", "primária/secundária"). Explicações técnicas ficam na doc, não na tela.

**Cores: 1 ou 2, progressivo.** Uma cor é o padrão. A segunda é opcional: "+ Adicionar uma segunda cor" → **Principal** + **Complementar** (nunca "primária/secundária"), com **combinações curadas por estilo** ("Combina com Marsala → Rosé/Areia/Sálvia/Dourado"), **Trocar ordem** e **Remover segunda cor**. O casal diz "Marsala + Rosé" e **o Álbora distribui** pelas superfícies — **nunca** pergunta cor-do-botão/story/QR/telão.

## 2. Não-negociáveis (CLAUDE.md)

- **Nenhum hex hardcodado em componente** — tudo sai de token. Um hex fixo é um lugar onde a identidade do casal não propaga.
- **Um resolvedor de tokens, N renderizadores.** Web, telão, PDF de impressão, moldura de compartilhar, app nativo e álbum consomem o **mesmo** `resolveTokens`. Nunca reimplementar a cadeia.
- **Cor, contraste e "on" são derivados** — o usuário não escolhe cada estado. "Trocar o chão re-deriva o acento."
- **IA generativa nunca toca a mídia.** O "estilo das fotos" é **LUT no cliente** (determinístico, idêntico em todas as fotos), não geração.
- Isolamento por evento; sem segredo commitado.

## 3. Código atual (ponto de partida) — JÁ EXISTE

> Confirme os caminhos antes de editar (`git grep`).

- **Resolvedor**: `packages/tokens/src/resolver.ts` `resolveTokens({marca,vendor,pack,evento})` (merge da cadeia); `resolveScale()`/`escalaDoFundo` (`escalas.ts`) derivam a `SemanticScale`; contraste WCAG em `cor.ts`.
- **Tokens reais** (`packages/tokens/src/types.ts`): **5 cores** `papel, tinta, noite, acento, critico`; fontes `titulo, corpo`; escala `raio/espaco`; motion; tracking; background `dark|light`. Saída CSS: `--bg,--superficie,--ink,--acento,--fonte-titulo,…` (`outputs.ts`). **Piso** `ALBORA_BRAND` (`marca.ts`). **4 modelos** prontos (`modelos.ts`: Amanhecer/Linho/Meia-noite/Jardim).
- **Editor atual do casal**: `apps/web/features/admin/components/client/identity-editor.tsx` (rota `app/admin/e/[eventId]/identity/page.tsx`, aba em `event-nav.tsx`). Hoje edita: nome, preset (radio dos 4), **1 cor** (acento), estilo de fonte (serif/sans), fundo dark/light, modelos do telão. Salva via `PATCH /api/admin/events/[eventId]/config` → `identityTokens` (blob JSON).
- **Aplicação ao convidado**: `features/guest/lib/event-vars.ts` `eventVars` → `resolveGuestThemeVariables` (`packages/tokens/src/event-theme.ts`); `sanearVars`/`estiloAntiFlash` (`theme-style.ts`) no `app/e/[slug]/layout.tsx` (4 blocos anti-flash).
- **N renderizadores** (todos via `resolveTokens`/`toVariables`): web/PWA (`event-vars.ts`), app nativo (`apps/mobile/src/event-theme.ts`), telão (`get-wall-theme.ts` + `wall-client.tsx`), PDF de peça (`generate-print-pieces.ts` + `identityToFrame`), livro (`generate-book-pdf.ts`), moldura de compartilhar (`frame-palette.ts` + `frame-renderer.ts`), preview do admin (`identity-preview.ts`).
- **Capa**: `features/cover/components/server/cover-content.tsx` + `cover-image-editor.tsx` (upload presign→PUT→confirm), `events.cover_image_key`.
- **Filtro das fotos (LUT)**: presets `packages/core/src/presets.ts` (`aplicarPorPixel`/`paraFiltroCss`), `editor-lut.ts`; `events.recommended_filter` **só lido** (reordena a tira) — **sem UI de escrita hoje**.
- **Persistência**: `events.identity_tokens jsonb` (migration `0001`), `cover_image_key` (`0050`), `recommended_filter` (`0005`), `title` (coluna própria). `vendors.brand_tokens` (camada B2B2C).
- **Cadeia de camadas**: marca → vendor → pack → **evento** (evento ganha). Pack casamento (`packages/packs/src/casamento.ts`) traz vocabulário + `fontes.titulo`.

## 4. Alvo (o que muda / o que consertar)

### 4.1 Fluxo
- **Fase 1**: "A cara de Ana & João / Deixe cada detalhe da festa com a cara de vocês" → "Qual combina mais com vocês?" → **cards de estilo** (preview real: "Ana & João" na tipografia do estilo + cor(es) + fundo + mini foto).
- **Fase 2**: "Ficou assim" + **preview multi-superfície** (grande + miniaturas: Convidado · Álbum · Telão · QR · Compartilhar; Feed/Reviver em "Ver mais") + "Trocar estilo" + **cards compactos** de refino + "Personalizar mais" escondido.

### 4.2 Preview multi-superfície (a maior adição — não existia)
Renderizar a identidade ao vivo em: **Convidado (capa), Álbum, Telão, Placa/QR, Compartilhar, Feed, Reviver**. Cada superfície consome o mesmo resolvedor. A **2ª cor entra na composição** (gradiente da capa, anel dos stories, "ao vivo", linha do telão, faixa da placa/compartilhar, capítulo do Reviver) — o resolvedor distribui principal/complementar, o usuário não posiciona.

### 4.3 Cores (1 ou 2)
Modelo de dados: `identityTokens.cores.acento` (principal) + **novo** `identityTokens.cores.acento2` (complementar, opcional). O resolvedor deve saber distribuir o complementar nas superfícies e **derivar** todos os estados/contrastes dos dois. Combinações curadas por estilo. Extração de cor da capa deve retornar **3–5 cores** e sugerir combinações de 1 ou 2 ("Usar estas duas" / "Usar só a principal").

### 4.4 Consertos de dado (gaps reais do código)
- **Monograma real**: hoje não há UI que escreva `identityTokens.monograma`; o nome vai pra `events.title` (só capa), e a placa/moldura caem em fallback. **Criar** a edição de monograma (opções A&J / AJ / A + J / Sem / Personalizado) que grava `identityTokens.monograma`, e unificar a propagação (placa, telão, moldura usam o mesmo valor).
- **Filtro das fotos com UI**: `recommended_filter` é campo morto sem tela de escrita. Expor como "Estilo das fotos" (em Personalizar mais) que grava `recommended_filter`.
- **Extração de cor da capa**: não existe análise de pixels hoje (`extrairCorOpcional` só lê hex salvo). Implementar amostragem no cliente (canvas sobre a capa já carregada; sem CORS pois é imagem do próprio evento).
- **Capa com feedback**: o resumo do card mostra miniatura + "Foto N"/"Personalizada".

### 4.5 Personalizar mais (escondido)
Fundo manual (Automático/Escuro/Claro — o padrão vem do estilo), estilo das fotos (LUT), e as **cores da base** (papel/tinta/noite). Nunca expor raio/espaçamento/movimento/estados — derivados do estilo.

## 5. Copy (pt-BR)
"A cara de Ana & João" · "Deixe cada detalhe da festa com a cara de vocês" · "Qual combina mais com vocês?" · "Ficou assim" · "Quer deixar mais com a cara de vocês?" · "Cores da festa — Principal / Complementar" · "+ Adicionar uma segunda cor" · "Combina com {cor}" · "Trocar ordem" · "Remover segunda cor" · "Encontramos estas cores na sua capa" · "Usar estas duas" / "Usar só a principal" · "Ajustamos um pouco esta cor para manter tudo legível." · "Personalizar mais" · "Estilo das fotos".

## 6. Microajustes anotados (do review, não bloqueiam)
- Avaliar se **alguns estilos nascem com 2 cores** quando a 2ª faz parte essencial da proposta (hoje todo estilo nasce com 1, e a 2ª é opt-in — decisão conservadora a favor de "uma cor é o padrão").
- Capa: mostrar miniatura/"Foto N"/"Personalizada" (feito no protótipo).

## 7. Estados de borda
Cor perto do fundo (auto-ajuste + aviso humano, sem "AA"), evento sob fornecedor (a camada vendor entra na cadeia — o preview do admin hoje ignora vendor, corrigir), capa ausente (fallback do pack), fonte não carregada (fallback stack), primeiro acesso sem nenhuma escolha (estilo já deixa tudo usável).

## 8. Ordem de implementação sugerida
1. Estender o modelo: `identityTokens.cores.acento2` + distribuição no resolvedor + derivação dos dois.
2. Fase 1 (cards de estilo) → Fase 2 (preview + cards compactos) sobre o `identity-editor` atual.
3. Preview multi-superfície reusando os renderizadores reais (não mocks).
4. Cores 1-ou-2 progressivo + combinações por estilo.
5. Monograma (gravar `identityTokens.monograma` + unificar propagação).
6. Estilo das fotos (gravar `recommended_filter`).
7. Extração de cor da capa (canvas).
8. Personalizar mais (fundo manual, cores da base). Autosave.

## 9. Definition of Done
[ ] zero hex em componente · [ ] zero jargão na UI · [ ] cor/contraste/estados derivados (não escolhidos) · [ ] 1 cor padrão, 2ª opcional, distribuída pelo resolvedor · [ ] monograma grava campo real e propaga (placa/telão/moldura) · [ ] estilo das fotos grava `recommended_filter` · [ ] preview usa os renderizadores reais · [ ] mobile (uma mão, <1 min) · [ ] a11y AA automático · [ ] autosave, sem botão salvar · [ ] guards de CI verdes.

## 10. Gates (CLAUDE.md)
Guard de tokens **bloqueante desde o 1º commit**. Migrations forward-only (a `acento2` e qualquer novo campo em `identity_tokens` são aditivos ao jsonb). Nunca commitar segredo.

---

### Anexos
- `design-system-v3.md` — tokens, cor (2 camadas + engine), motion.
- `prototipos/identidade.html` — Aparência (escolho→vejo→refino, 1-ou-2 cores, preview multi-superfície).
- `REFATORACAO.md` / `telao.md` / `kit.md` — demais fluxos fechados.
