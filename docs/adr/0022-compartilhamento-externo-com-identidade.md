# 0022 — Compartilhamento externo com identidade: templates, formatos e assinatura configurável

- **Status:** Proposed (planejamento; nada ligado por padrão)
- **Data:** 2026-09-09
- **Relaciona-se com:** [0003](./0003-runtime-token-resolution.md) (um resolvedor, N renderizadores), [0007](./0007-ai-policy-luts-not-generation.md) (IA não gera mídia), [0009](./0009-app-social-do-convidado.md) (gate), [0018](./0018-sso-google-e-convidado-reivindica-fotos.md) (retenção), e o consentimento externo `externo-v1` (`ShareConsentSheet`).

## Contexto

Hoje o convidado já compartilha a foto com a identidade da festa: `useShare` busca o contexto (`/api/share`), autoriza (`autorizarCompartilhamento` + consentimento `externo-v1`), compõe **no cliente** uma moldura via `compor()` — foto + faixa tipográfica (nomes + data, tokens do pack via `identityToFrame`/`paletteForFrame`) — desenha em canvas (`drawFrame`) e entrega por `navigator.share`/download (`shareOrDownload`). É sólido, mas rígido:

- **Um só formato:** `LARGURA_DA_COMPOSICAO=1080 × ALTURA=1920` (Story 9:16). Não há Feed 1:1.
- **Um só template:** `modeloRecomendado(midia)` decide sozinho (`polaroide`/`ambiente`/`cheia`); o convidado não escolhe, e não há "Original" (foto crua).
- **Sem prévia:** compõe e já dispara o share; o convidado não vê o resultado antes.
- **Assinatura fixa:** sempre entra a faixa com nomes; não é configurável pelo casal.

O redesign v4 (§103, §3.3) faz disto uma **feature central**: sheet com **prévia real**, **templates** (Com assinatura / Original / **Story 9:16** / **Feed 1:1**), **redes** via `navigator.share`, **privacidade em linguagem humana**, e **assinatura opcional/configurável** pelo casal (ligada por padrão). Depois se estende a **recap**, **momento** e **álbum**. Este ADR fixa **como** crescer sem quebrar os não-negociáveis, e fatia a entrega.

## Decisão

Adotar o compartilhamento externo com identidade como **feature em fatias**, composto **no cliente**, organizado em **dois eixos ortogonais de template**:

- **Moldura:** *Com assinatura* (a composição atual — foto + faixa + logo Álbora pequena) vs *Original* (a foto processada, sem moldura, sem logo).
- **Formato:** *Story 9:16* (1080×1920, já existe) e *Feed 1:1* (**1080×1080, novo em core**).

A **assinatura** (nomes do casal + data + logo Álbora discreta) sai sempre de **token do pack** pelo resolvedor de identidade existente (ADR 0003) e é **configurável por evento** (ligada por padrão). A prévia real é o `drawFrame` desenhado num `<canvas>`/`<img>` antes de `navigator.share`.

### O que **não** muda — os não-negociáveis

- **IA generativa nunca toca a mídia** ([ADR 0007](./0007-ai-policy-luts-not-generation.md)): a composição é moldura tipográfica + logo, determinística, no cliente. *Original* não adiciona nada.
- **O servidor nunca toca os bytes:** composição e prévia no cliente (canvas). Nada novo entra no **caminho crítico de upload** — este é o fluxo de *leitura/compartilhamento*, posterior ao upload.
- **Consentimento externo versionado (`externo-v1`) e `ShareConsentSheet` inalterados.** Nome-na-moldura segue **opt-in**; sem consentimento, sem assinatura com nome. *Original* e *Feed 1:1* passam pela mesma porta de autorização (`autorizarCompartilhamento`).
- **Nenhum hex/domínio em componente:** identidade sai de token; sem `noivos`/`casamento` no núcleo. *Original* nunca inclui assinatura/logo.
- **Nunca marca d'água central; nunca sobre rostos.** `compor` já garante via `molduraCorta`/recorte; *Original* não sobrepõe nada.

### O que precisa de core

1. **Formato Feed 1:1 (1080×1080):** novas constantes + `areaDaFoto`/`caixaDaFoto` para 1:1, reusando as regras de recorte e `MAX_PERDA_LATERAL`; `modeloRecomendado` passa a considerar o formato. Cobertura de recorte para 1:1.
2. **Template *Original* (passthrough):** compartilha a foto processada sem moldura — mesma autorização e consentimento, sem logo/assinatura.
3. **Assinatura configurável:** flag por evento (`assinaturaLigada`, default `true`), lida por `compor`/`conteudoDaMoldura`; desligada → moldura sem nomes (ou o template cai para *Original*).

### O que precisa de UI

Sheet com **prévia real** (render do canvas), seletor de template (moldura × formato), botões de rede (`navigator.share({files})`), privacidade em linguagem humana ("Pode incluir outras pessoas que aparecem na foto.") e os **estados de borda do §3.5**: compartilhamento cancelado, rede indisponível → fallback nativo, formato incompatível, foto sem permissão externa ("Os anfitriões escolheram manter este momento apenas no Álbora."), falha ao gerar a imagem.

### Fatiamento (MRs pequenas, cada uma verde e reversível)

- **A — core, sem UI nova:** composição Feed 1:1 + testes de recorte. Nada ligado ainda (`modeloRecomendado` inalterado no app).
- **B — UI mínima, sem core novo:** picker das molduras que **já existem** (`polaroide`/`ambiente`/`cheia`) + **prévia real**, mantendo Story 9:16; `useShare` aceita `modelo` (hoje hardcoda `modeloRecomendado`).
- **C — template *Original*** (passthrough) + copy de privacidade + estados de borda de share (§3.5).
- **D — Feed 1:1 ligado** no picker (usa a fatia A).
- **E — assinatura configurável** no admin (flag por evento) — depende do painel; coordena com a trilha do anfitrião (fora do escopo do convidado).
- **Extensões:** recap/momento/álbum reusam o mesmo pipeline de composição.

## Alternativas rejeitadas

- **Compor no servidor.** Fura "o servidor nunca toca os bytes" e duplica o renderizador; o cliente já tem canvas (e o LUT) — a coerência vem de um só renderizador (ADR 0003).
- **IA para reenquadrar/gerar moldura.** Proibido por [ADR 0007](./0007-ai-policy-luts-not-generation.md).
- **Manter um template fixo.** Perde a adequação por rede (Story vs Feed) que o §103 pede, e a escolha do convidado.
- **Ligar tudo de uma vez.** A prévia real + Feed 1:1 + assinatura configurável cruzam core, convidado e admin; fatiar mantém cada MR verde e o caminho crítico intocado.

## Consequências

- `compor`/core ganham um **eixo de formato**; os testes de recorte passam a cobrir 1:1.
- `useShare` passa a aceitar `template`/`formato` — hoje fixa `modeloRecomendado`.
- A assinatura configurável cria uma dependência **leve** no admin (fatia E), isolável e adiável.
- A prévia real acrescenta um render de canvas antes do share (custo de UI, **fora** do caminho crítico).
- Produção **não muda** enquanto as fatias não forem ligadas — este ADR é planejamento; o comportamento atual (Story 9:16, `modeloRecomendado`, sem prévia) segue de pé.
