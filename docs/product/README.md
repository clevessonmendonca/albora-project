# Documentos de produto

Origem de tudo. Quando um documento técnico e um de produto discordarem, o resolvedor está na tabela de [`../README.md`](../README.md).

| Documento | O que define |
|---|---|
| [`albora-produto-arquitetura.md`](./albora-produto-arquitetura.md) | Mercado, posicionamento, produto moldado, modelo de negócio, roadmap, riscos |
| [`albora-branding-marketing.md`](./albora-branding-marketing.md) | Voz, tom, copy, canais, anti-padrões de comunicação |
| [`discovery-resumo-2026-08.md`](./discovery-resumo-2026-08.md) | Snapshot da auditoria de produto — conclusões e links |
| [`plano-implementacao-produto.md`](./plano-implementacao-produto.md) | **O que fazer e em qual ordem** (NOW/NEXT/LATER) pós-discovery |
| [`inteligencia-competitiva.md`](./inteligencia-competitiva.md) | Concorrentes, fluxos, battlecard (Olhares, Dots, incumbents) |
| [`estrategia-precificacao.md`](./estrategia-precificacao.md) | Gap R$ 67 vs R$ 199, hipóteses, cenários — **não altera UI sem validação** |
| [`kit-fornecedor.md`](./kit-fornecedor.md) | Kit B2B2C cerimonialista |
| [`experimentos-validacao.md`](./experimentos-validacao.md) | E1–E7, retro 48h, métricas kill/pivot |
| `albora-landing-planos.md` | Landing, planos, preço, SEO, instrumentação — **ainda não versionado aqui** |

---

## Preço no ar versus rascunhos

**Fonte do que o visitante vê:** `apps/web/app/landing/landing-page.tsx` (rota `/`). Em 2026-08-15 a landing mostra **três cartões**:

| Plano na UI | Preço na UI | O que a copy promete |
|---|---|---|
| Grátis | R$ 0, para sempre | Convidados e fotos sem limite, missões e galeria, resolução reduzida, álbum por 30 dias |
| Completo · o mais escolhido | R$ 199, pagamento único | Resolução original e vídeo, telão, ZIP, identidade do evento, 12 meses com exportação para a nuvem do casal |
| Fornecedor | Sob consulta | White-label, eventos sem limite, um painel, zero operação no dia |

Nenhuma outra tabela de preço neste repositório é a landing. **Não inventamos preço aqui.**

Rascunhos que **não** estão na UI — tratar como draft até o dono publicar:

| Onde | O que anuncia | Status |
|---|---|---|
| §5.2 de [`albora-produto-arquitetura.md`](./albora-produto-arquitetura.md) | Grátis · Celebração R$ 199 · Fornecedor R$ 149/mês | Draft de modelo. O nome “Celebração” e o R$ 149/mês **não** aparecem na landing |
| Decisão verbal do fundador (2026-08-09), registrada abaixo | Grátis · Celebração R$ 199 · Completo R$ 349 · Fornecedor R$ 149/mês | Draft. O Completo a R$ 349 **não** está no código |
| Landing v4 dos designers (2026-08-11), fora do repo | R$ 0 · R$ 149 · R$ 199 | Draft externo. R$ 149 como faixa de consumidor **não** está no código |

Composição extra que o Completo a R$ 349 pretendia (livro para gráfica, 24 meses, suporte no dia, “cada convidado recebe as dele”) **não é copy da landing atual**. Dois desses itens continuam bloqueados mesmo como rascunho: agrupamento facial ([`../security.md` §5.1](../security.md)) e WhatsApp Business (Fase 2).

---

## Conflitos de copy ainda abertos (não de preço)

### 1. 🔴 Copy de moderação contradiz a decisão

Um documento de landing **fora do repo** dizia:

> *"Você aprova o que vai pro telão. Nada aparece sem passar por você."*

Isso **contradiz** [`../flows.md` §4](../flows.md) e o código: o padrão é **publicar na galeria**; o telão segura classificador mudo ou suspeito. Copy alinhada ao produto:

> Por padrão tudo aparece na galeria — porque no dia da festa ninguém vai ficar aprovando fila. O que protege a parede é automático: o classificador segura o que for impróprio ou o silêncio dele, qualquer convidado pode denunciar, e você tira do telão em um toque. Se preferir, dá pra ligar a aprovação manual.

**Ação:** spec [`../specs/task-023-copy-moderacao-landing.md`](../specs/task-023-copy-moderacao-landing.md) (discovery 2026-08).

### 2. 🔴 "Nenhum aplicativo" — a formulação que vazou do doc de produto

A landing v4 dos designers (fora do repo) intitulava:

> *"Três passos e nenhum aplicativo."*

Como promessa sobre a **primeira foto** é verdade. Como promessa sobre o **produto**, contradiz o [ADR 0009](../adr/0009-app-social-do-convidado.md). A tabela correta está em [`albora-branding-marketing.md`](./albora-branding-marketing.md) §3.

**Pendente:** a landing de designers mora fora do repositório. A copy em `apps/web/app/landing/` é a que conta.

### 3. 🟡 Lacuna: o convidado que já viveu o produto

A §1 do doc de landing identifica esse visitante como **a maior intenção** — e o §3 não tem seção para ele. Vale uma variante: *"Você esteve num casamento com Albora. Quer no seu?"* → direto para preço e criação. Não está na UI.

**Ação:** spec [`../specs/task-024-landing-convidado-veterano.md`](../specs/task-024-landing-convidado-veterano.md).

### 4. 🔴 Gap comercial vs. Olhares (discovery 2026-08)

🟢 **Evidência:** Olhares Pro (telão) promociona a **R$ 67**; Albora Completo **R$ 199** na UI.

Não é conflito de documento — é **posicionamento**. Detalhe em [`estrategia-precificacao.md`](./estrategia-precificacao.md) e [`inteligencia-competitiva.md`](./inteligencia-competitiva.md). **Não mudar preço na landing** até entrevistas P1/P2.

---

## O que a análise validou

Três coisas do documento de landing são fortes e foram para o protótipo / a página:

- **O demo ao vivo.** Provar em cinco segundos em vez de argumentar.
- **A âncora por convidado** — compara com lembrancinha (~R$ 15), não com “dividido por 150” (parece vaquinha).
- **A honestidade no lançamento.** *"Somos novos, seja um dos primeiros"* em vez de depoimento inventado.
