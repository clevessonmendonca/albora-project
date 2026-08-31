# Inteligência competitiva — Albora

> **Status:** vivo — revisar a cada trimestre ou após 3 eventos reais
> **Última revisão:** 2026-08-29
> **Origem:** auditoria de discovery (agosto/2026) + pesquisa web

Este documento substitui listas genéricas de concorrentes no doc de arquitetura de produto. **Não é feature matrix** — foca proposta de valor, fluxo, pricing e onde Albora ganha ou perde.

---

## 1. Mapa rápido

| Tipo | Players | Ameaça para Albora |
|---|---|---|
| **Direto BR** | Olhares, Meu Casar, PicWedding | Olhares = escopo + preço agressivo |
| **Benchmark UX** | Dots. Memories | TikTok + app; bugs de upload |
| **Adjacente** | iCasei, MarryUs, Casar.com | Grátis embutido no site |
| **Commodity intl.** | Fotify, Wedbox, POV, Kululu | US$ 29–49, storage ilimitado |
| **Substituto** | WhatsApp, Google Fotos, iCloud | Inércia zero-fricção |

---

## 2. Concorrente #1 — Olhares (Brasil)

**Fonte:** [olhares.shop](https://www.olhares.shop/) — consultado 2026-08-29

### Proposta de valor

> "O fotógrafo registra o oficial. Seus convidados capturam o resto."

Posicionamento emocional forte: medo de perder memória; prova social (+5.000 noivas, +1.500 casamentos claim 2026); comparação "menos que o buquê".

### Pricing (promo vigente na landing)

| Plano | De | Por | Inclui |
|---|---|---|---|
| Standard | R$ 97 | **R$ 47** | Galeria, QR, upload browser, download HQ, suporte WA, cards/desafios bônus |
| Pro | R$ 147 | **R$ 67** | Standard + **slideshow ao vivo no telão** |

Retenção: 1 ano na plataforma; download/e-mail a qualquer momento. Garantia 7 dias.

### Fluxo convidado (observado)

```
QR na mesa → browser → tirar/enviar → galeria automática
```

Sem app, sem login explícito na FAQ. Telão Pro = link em TV/projetor.

### Onde Olhares ganha hoje

- **Preço** — 3–4× abaixo do Albora Completo (R$ 199)
- **Prova social** — volume e depoimentos na landing
- **Simplicidade de mensagem** — "como PIX"
- **Multi-vertical na mesma marca** — casamento, 15 anos, corp. (Albora deve resistir diluir home)
- **Garantia 7 dias** — reduz risco percebido

### Onde Albora deve ganhar

- **Identidade propagada** (tokens → placa, preset, telão, livro) — Olhares tem templates, não motor de identidade
- **Missões como mecanismo core** — Olhares trata desafios como bônus
- **Moderação fail-closed no telão** + fila de revisão
- **Telão sem cortar vertical** (4 modelos)
- **Livro print-ready + export Drive** — política "o arquivo é seu"
- **Fila offline** — resposta a reviews ruins de Dots (upload falha)
- **Canal B2B2C white-label** — Olhares parece B2C puro

### Battlecard (resumo)

| Objeção | Resposta Albora |
|---|---|
| "Olhares é mais barato" | Comparar com **segundo álbum + identidade + livro**, não com galeria genérica. Ancorar vs. fotógrafo (R$ 5–15k), não vs. R$ 67 |
| "Olhares também tem telão" | "Telão moderado + layout que não corta rosto + mesma estética do convite" |
| "Olhares tem +1500 casamentos" | Honestidade: "Somos novos — seja dos primeiros" + Operação Casamento (TikTok) |

Detalhe operacional: [`kit-fornecedor.md`](./kit-fornecedor.md).

---

## 3. Meu Casar e PicWedding

| | Meu Casar | PicWedding |
|---|---|---|
| **Proposta** | Álbum colaborativo no ecossistema Meu Casar | Feed privado estilo Instagram |
| **Preço** | Grátis (feature da plataforma) | Freemium |
| **Fraqueza** | Genérico; storage "para sempre" como argumento | Emergente; feed como produto, não identidade |
| **Resposta Albora** | Não competir em grátis. Competir em **dia da festa + estética + telão** | Diferenciar missões + tokens + livro |

---

## 4. Dots. Memories (benchmark)

**Tração:** TikTok → App Store (PT/ES).

**Padrões em reviews (2025–2026):**

- Upload lento, falha, fotos que "não aparecem"
- App trava durante casamento
- Conceito amado quando funciona
- Limite de convidados em planos baratos

**Lição para Albora:** web-first no 1º evento foi decisão correta. **Confirmação visível de upload** e fila offline são diferencial defensável — comunicar só após prova no 1º casamento.

---

## 5. Incumbents — iCasei / MarryUs

| Recurso | iCasei | Albora |
|---|---|---|
| Álbum convidados | Hashtag Instagram + linha do tempo | QR + missões |
| App convidado | **Obrigatório** para timeline | **Nunca** antes da 1ª foto |
| Telão | Sim (app) | Sim (browser + pareamento) |
| Site/RSVP/presentes | Core grátis | Fora de escopo até Fase 4 |
| Monetização | % lista presentes | Ticket evento + fornecedor |

**Risco:** iCasei adiciona "QR na mesa sem app" como feature — mitigação = velocidade + canal fornecedor + identidade end-to-end.

---

## 6. Substitutos

| Substituto | Por que sobrevive | Como Albora compete |
|---|---|---|
| WhatsApp | Zero setup | Peça física + telão + "não some no scroll" |
| Google Fotos / iCloud | Grátis, conhecido | Moderação + missões + identidade + acervo único do casal |
| Fotógrafo entrega pendrive | Confiança | **Complementar** — "o outro álbum", nunca substituir oficial |

---

## 7. Comparativo de fluxo — 1ª foto

| Etapa | Albora | Olhares | Dots | iCasei timeline |
|---|---|---|---|---|
| Toques estimados | ≤4 (meta) | ~3 | 4–6+ | 6+ |
| Login convidado | Nunca | Não | Variável | App + busca casal |
| Offline/retry | Fila IndexedDB | Desconhecido | 🔴 fraco | Rede |
| Incentivo participação | Missões + telão + feed pós-gate | Desafios + telão | Stories | Hashtag / post |

🟢 Albora: `architecture.md` §5.  
🟢 Olhares: landing consultada 2026-08-29.

---

## 8. Implicações estratégicas (decisões)

1. **Não competir em preço de commodity** com Olhares Standard (R$ 47). Ver [`estrategia-precificacao.md`](./estrategia-precificacao.md).
2. **Canal principal = fornecedor** — noiva compara preço; cerimonialista embute margem.
3. **Prova social é gap #1** — prioridade Operação Casamento antes de tráfego pago.
4. **Copy de moderação** deve refletir galeria aberta + telão protegido (ver `product/README.md` § conflitos).
5. Revisitar esta página após **3 casamentos reais** com H1 medido.

---

## 9. Changelog

| Data | Mudança |
|---|---|
| 2026-08-29 | Documento criado pós-discovery. Olhares pricing atualizado (R$ 47 / R$ 67). |
