# Documentos de produto

Origem de tudo. Quando um documento técnico e um de produto discordarem, o resolvedor está na tabela de [`../README.md`](../README.md).

| Documento | O que define |
|---|---|
| [`albora-produto-arquitetura.md`](./albora-produto-arquitetura.md) | Mercado, posicionamento, produto moldado, modelo de negócio, roadmap, riscos |
| [`albora-branding-marketing.md`](./albora-branding-marketing.md) | Voz, tom, copy, canais, anti-padrões de comunicação |
| `albora-landing-planos.md` | Landing, planos, preço, SEO, instrumentação — **ainda não versionado aqui** |

---

## ⚠️ Conflitos abertos — resolver antes de publicar a landing

Detectados em 2026-08-09 ao cruzar o documento de landing com as decisões técnicas já tomadas.

### 1. 🔴 Copy de moderação contradiz a decisão

O documento de landing diz, em §3.5 e no FAQ §3.9:

> *"Você aprova o que vai pro telão. Nada aparece sem passar por você."*

Isso **contradiz** [`../flows.md` §4](../flows.md), onde ficou decidido que o padrão é **publicar tudo** — porque os noivos estão na festa e ninguém vai olhar fila de aprovação. Um controle que fica desligado não é um controle.

**Copy correta, já aplicada no protótipo:**

> Por padrão tudo aparece — porque no dia da festa ninguém vai ficar aprovando fila. O que protege é automático: um filtro segura o que for impróprio antes de chegar na parede, qualquer convidado pode denunciar, e você tira do telão em um toque. Se preferir, dá pra ligar a aprovação manual.

É a terceira vez que esse drift aparece em documento diferente. **Corrigir na origem.**

### 2. ✅ Quatro planos — decisão confirmada

**Grátis · Celebração R$ 199 · Completo R$ 349 · Fornecedor R$ 149/mês.** Confirmado pelo fundador em 2026-08-09.

Não é correção de nomenclatura, como a §4.5 do doc de landing sugere — é **mudança do modelo de precificação**. O §5.2 do doc de produto ainda lista três planos e precisa ser atualizado, junto com a menção a "Celebração+" na §14.6.

Composição do Completo: tudo do Celebração + livro de fotos pronto para gráfica + guarda por 24 meses + suporte no dia por WhatsApp + entrega individual por WhatsApp + "cada convidado recebe as dele".

### 3. 🔴 Dois itens do Completo dependem de coisas ainda não resolvidas

O plano está aprovado; estes dois itens específicos têm pendência **antes de serem entregues**, não antes de serem vendidos:

| Item | Pendência |
|---|---|
| **"Cada convidado recebe as dele"** | Depende de **agrupamento facial** = dado biométrico sensível (Art. 5º II da LGPD). Parecer jurídico pendente — ver [`../security.md` §5.1](../security.md) e [ADR 0007](../adr/0007-ai-policy-luts-not-generation.md). O titular do dado é **quem aparece** na foto, não quem a enviou |
| **"Fotos entregues por WhatsApp"** | Fase 2 no roadmap. Exige WhatsApp Business Platform com templates aprovados |

**Mitigação sugerida, já aplicada no protótipo:** os dois aparecem na lista do plano em tom secundário, distinguíveis do que já existe. Se o primeiro evento acontecer antes de eles ficarem prontos, a landing muda uma classe de CSS em vez de a promessa quebrar na frente do cliente — e a §5.3 do doc de produto, que proíbe surpreender o casal depois do evento, continua respeitada.

### 4. 🟡 Lacuna: o convidado que já viveu o produto

A §1 identifica esse visitante como **a maior intenção de todas** — e o §3 não tem seção para ele. Ele chega convencido; mostrar a seção "o problema" desperdiça a intenção.

Vale uma variante da página com o topo trocado: *"Você esteve num casamento com Albora. Quer no seu?"* → direto para preço e criação.

---

## O que a análise validou

Três coisas do documento de landing são fortes e foram para o protótipo:

- **§3.2, o demo ao vivo.** Provar em cinco segundos em vez de argumentar. É a melhor ideia do documento e nenhum concorrente faz bem.
- **§4.1, a âncora por convidado** — com a redação corrigida. A lógica é boa: casamento no Brasil é orçado por pessoa, então a noiva já pensa nessa unidade. Mas **"dividido por 150" faz parecer vaquinha**, e quem paga são os noivos. E "arranjo de mesa" compara unidades diferentes — arranjo é por mesa, não por pessoa.

  Redação em uso: *"A lembrancinha sai por uns **R$ 15 por convidado** — e quase ninguém leva pra casa. As fotos que todos eles tiraram saem por **R$ 1,33**."* Compara com um item que já é por convidado e que todo mundo sabe que se perde.
- **§5, a honestidade no lançamento.** *"Somos novos, seja um dos primeiros"* em vez de depoimento inventado. Num mercado que roda em boca a boca de grupo de noiva, depoimento falso destrói a marca.
