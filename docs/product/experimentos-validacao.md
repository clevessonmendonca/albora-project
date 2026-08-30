# Experimentos de validação — produto

> **Status:** plano de discovery contínuo
> **Última revisão:** 2026-08-29
> **Métrica decisiva:** [`plano-implementacao-produto.md`](./plano-implementacao-produto.md) §1

Classificação de evidência em todo aprendizado:

- 🟢 **Evidência** — dado observado
- 🟡 **Inferência** — conclusão razoável
- 🔴 **Hipótese** — ainda não testada

---

## E1 — Primeiro casamento real (bloqueante)

| Campo | Valor |
|---|---|
| **Hipótese** | ≥40% convidados presentes enviam ≥1 foto |
| **Incerteza** | Value risk — negócio existe? |
| **Custo** | Alto (ops + reputação) |
| **Pré-requisitos** | N1–N5, N7 do plano implementação |

### Protocolo

1. Confirmar `expected_guests` com casal (denominador H1)
2. Gravar autorização TikTok (Operação Casamento)
3. Executar [`../runbooks/dia-do-evento.md`](../runbooks/dia-do-evento.md)
4. Coletar funil 24h após evento (`/admin/e/[id]/guests`)
5. Retro 48h (§ abaixo)

### Critérios

| Resultado | Decisão |
|---|---|
| ≥40% | Tese validada → NEXT (X1–X9) |
| 25–40% | Ajustar fricção/roteiro — **não** features |
| <25% | Parar ou pivotar wedge |

---

## E2 — Prova QR físico

| Campo | Valor |
|---|---|
| **Hipótese** | QR impresso legível em condições reais de salão |
| **Procedimento** | `dia-do-evento.md` §3 |
| **Sucesso** | 3/3 celulares, ≤5s, luz baixa |

---

## E3 — Anúncio microfone A vs B

| Campo | Valor |
|---|---|
| **Hipótese** | Anúncio aumenta `qr_scan` na 1ª hora |
| **Variante A** | Roteiro padrão §5 `dia-do-evento.md` |
| **Variante B** | Missão única curta |
| **Métrica** | `qr_scan` / `expected_guests` na hora 1 |
| **Quando** | Casamentos 1 e 2 (MC diferente ou mesma festa duas mesas teste — preferir 2 eventos) |

---

## E4 — CTA instalação (pós-upload vs entrada)

| Campo | Valor |
|---|---|
| **Hipótese** | CTA pós-upload mantém H1 e aumenta install |
| **Origem** | produto §4.5 — 3 casamentos |
| **Métricas** | `participacao` + `install_accept / expected_guests` |
| **Regra** | Install que sobe com participação caindo = **prejuízo** |

| Casamento | Variante CTA principal |
|---|---|
| 1 | Após 1º upload |
| 2 | Na entrada (discreto) |
| 3 | Vencedora de 1–2 |

---

## E5 — Entrevistas cerimonialista (5×)

| Campo | Valor |
|---|---|
| **Hipótese** | Canal B2B2C viabiliza preço acima de Olhares |
| **Duração** | 20 min |
| **Roteiro** | |

1. Hoje oferece álbum convidados? Como?
2. Quanto cobraria a mais com telão + álbum **sem ops** no sábado?
3. Reação a R$ 47 / R$ 67 / R$ 199 (mostrar Olhares vs Albora demo)
4. White-label importa?
5. Top 3 objeções dos noivos?
6. Prefere % comissão ou licença mensal?

**Output:** atualizar [`estrategia-precificacao.md`](./estrategia-precificacao.md) §6 e [`kit-fornecedor.md`](./kit-fornecedor.md) §4.

---

## E6 — Concierge WhatsApp "suas fotos"

| Campo | Valor |
|---|---|
| **Hipótese** | Entrega personalizada abre opt-in contato (pipeline 18–24m) |
| **Protocolo** | Manual D+3; template branding §4.8 |
| **Métrica** | % opt-in contato; respostas qualitativas |
| **Quando** | Após H1 ≥40% |

---

## E7 — Fake door livro export

| Campo | Valor |
|---|---|
| **Hipótese** | Casais pagam export PDF print-ready D+30 |
| **Protocolo** | Botão admin "Exportar livro" → waitlist ou checkout stub |
| **Métrica** | Clique / eventos elegíveis |
| **Quando** | 3 eventos com acervo >500 fotos |

---

## O4 — Métrica social → upload (contínuo)

| Métrica | Fonte | Decisão |
|---|---|---|
| `uploadsAntesDoFeed` | `/admin/e/[id]/guests` | Baseline |
| `uploadsDepoisDoFeed` | idem | Se ratio <1,1 em 3 eventos → cortar comentários/notificações |

🟢 Já instrumentado: `get-guest-metrics.ts`.

---

## Retro 48h pós-evento (template)

**Evento:** _______________ **Data:** _______________

1. **Participação:** _____% (`sessoes_com_upload / expected_guests`)
2. **Maior queda funil:** de __________ para __________
3. **Verbatim (3):**
   - Convidado: "..."
   - Noivo(a): "..."
   - MC/fornecedor: "..."
4. **Incidente telão/moderação?** sim / não — descrição
5. **Pagaria R$ 199 de novo?** sim / não / talvez — por quê
6. **Classificação aprendizados:** 🟢 / 🟡 / 🔴 por item
7. **Ações:** atualizar plano / copy / runbook / spec ___

---

## Changelog

| Data | Mudança |
|---|---|
| 2026-08-29 | Plano de experimentos criado |
