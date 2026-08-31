# Discovery — resumo executivo (agosto/2026)

> **Status:** snapshot da auditoria de produto — não substitui docs detalhados
> **Última revisão:** 2026-08-29
> **Próximo passo:** [`plano-implementacao-produto.md`](./plano-implementacao-produto.md)

---

## Conclusão central

🟢 **Fato:** Albora tem produto web amplo (convidado, admin, telão, moderação, álbum, livro PDF, Drive) e arquitetura madura.

🟡 **Inferência:** O gargalo **não é feature** — é **validar H1** (≥40% participação) no 1º casamento real.

🔴 **Hipótese crítica:** R$ 199 só se sustenta com **identidade + segundo álbum + canal fornecedor** — não competindo com Olhares a R$ 67.

---

## Decisões recomendadas

| # | Decisão | Por quê |
|---|---|---|
| 1 | **Não abrir features** antes do casamento #1 | Código > MVP; ops bloqueia |
| 2 | **Priorizar runbook dia-D + prova QR** | Olhares prova: ativação > tech |
| 3 | **Canal = cerimonialista** | Preço B2C perde para Olhares/Meu Casar grátis |
| 4 | **Manter R$ 199 na UI** até entrevistas P1/P2 | Ver [`estrategia-precificacao.md`](./estrategia-precificacao.md) |
| 5 | **Social julgado por upload** | ADR 0009 — cortar comentários se métrica falhar |

---

## Documentos desta rodada

| Documento | Conteúdo |
|---|---|
| [`inteligencia-competitiva.md`](./inteligencia-competitiva.md) | Olhares, Dots, incumbents, battlecard |
| [`estrategia-precificacao.md`](./estrategia-precificacao.md) | Gap R$ 67 vs R$ 199, cenários |
| [`plano-implementacao-produto.md`](./plano-implementacao-produto.md) | NOW/NEXT/LATER + ajustes P1–P6 |
| [`kit-fornecedor.md`](./kit-fornecedor.md) | Kit B2B2C |
| [`experimentos-validacao.md`](./experimentos-validacao.md) | E1–E7 + retro |
| [`../runbooks/dia-do-evento.md`](../runbooks/dia-do-evento.md) | QR + microfone + checklist |
| [`../specs/task-021-gate-capa-copy.md`](../specs/task-021-gate-capa-copy.md) … 025 | Specs de ajuste UX/copy |

---

## Kill criteria (reafirmado)

Após 3 casamentos com anúncio no microfone:

| H1 | Ação |
|---|---|
| ≥40% | Fase 2 |
| 25–40% | Fricção/roteiro |
| <25% | Parar ou pivotar |

---

## Changelog

| Data | Autor | Nota |
|---|---|---|
| 2026-08-29 | Discovery produto | Auditoria inicial consolidada |
