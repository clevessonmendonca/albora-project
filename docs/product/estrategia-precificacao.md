# Estratégia de precificação — pós-discovery

> **Status:** decisões de produto — **não altera a landing até validação**
> **Última revisão:** 2026-08-29
> **UI em produção:** `apps/web/app/landing/` — Grátis R$ 0 · Completo R$ 199 · Fornecedor sob consulta

---

## 1. Problema descoberto

🟢 **Evidência (2026-08-29):** Olhares Pro (telão ao vivo) promociona a **R$ 67** pagamento único. Albora Completo está a **R$ 199** na landing.

Gap de **~3×** no plano comparável (telão + álbum convidados). Meu Casar e MarryUs embutem galeria colaborativa **grátis** no site.

**Conclusão:** vender Albora só como "álbum de convidados" perde no checkout. A venda é **identidade propagada + segundo álbum + livro + export**.

---

## 2. O que não muda (regras invioláveis)

Do doc de produto §5.3 — mantidas:

1. Nunca limitar convidados
2. Nunca paywall surpresa depois do evento
3. Nunca refém em assinatura mensal para o casal
4. Convidado nunca vê fricção comercial
5. Assinatura mensal só fornecedor

---

## 3. Posicionamento de preço (copy, não número)

### Ancoragem correta

| ❌ Comparar com | ✅ Comparar com |
|---|---|
| Olhares R$ 67 | Álbum profissional convidados R$ 0 (não existe) |
| Meu Casar grátis | Lembrancinha ~R$ 15 × 150 = R$ 2.250 "jogado fora" |
| "App de fotos" | **Identidade do casamento** do QR ao livro na estante |

### Frase de venda (B2C)

> "Menos que uma lembrancinha por convidado — e no fim você fica com o álbum que ninguém contratou pra tirar, na cara do seu casamento."

### Frase de venda (B2B2C)

> "Seus clientes recebem o álbum de todos os convidados com **sua marca**. Você revende no pacote; zero operação no sábado."

---

## 4. Hipóteses a validar antes de mudar preço na UI

| ID | Hipótese | Experimento | Critério |
|---|---|---|---|
| P1 | Noiva paga R$ 199 se vir identidade + demo + livro | 5 entrevistas + demo `/e/festa-demo` | ≥3/5 "pagaria" ou "pediria pro cerimonialista" |
| P2 | Canal absorve — cerimonialista revende R$ 299–449 | 5 entrevistas fornecedor | ≥2 pilotos com margem declarada |
| P3 | R$ 199 é barreira sem prova social | Landing A/B hero emocional vs. funcional | `checkout_started` +20% relativo |
| P4 | Plano grátis converte upgrade no wizard | Funil `event_created` → `checkout_paid` | Baseline após 10 eventos |

🔴 **Nenhuma mudança de preço na landing** até P1 ou P2 terem evidência.

---

## 5. Cenários de ajuste (draft — não publicar sem OK do fundador)

| Cenário | Quando | Ação |
|---|---|---|
| **A — Manter R$ 199** | P1 valida B2C ou P2 valida B2B2C | Reforçar copy; não descer preço |
| **B — Tier intermediário** | P1 falha B2C, P2 ok | Novo plano ~R$ 99–129 **sem livro** ou resolução 2500px — **exige spec + eng** |
| **C — Só fornecedor vende Completo** | CAC B2C proibitivo | Landing CTA → "Peça ao seu cerimonialista" + lista parceiros |
| **D — Launch promo** | Primeiros 10 casamentos | R$ 149 com case + direito gravação — **temporal**, não permanente |

⚠️ Cenário B aumenta complexidade de entitlements — só com spec dedicada.

---

## 6. Fornecedor — modelo comercial (em aberto)

| Modelo | Prós | Contras |
|---|---|---|
| **Licença R$ 149/mês** (doc §5.2) | MRR previsível | Fornecedor pequeno resiste |
| **% sobre revenda** | Alinha incentivo | Exige split (Fase 3) |
| **Pacote por evento** (ex. R$ 49/evento ao fornecedor) | Simples | Churn se não revender |

**Discovery pendente:** 5 conversas cerimonialista — roteiro em [`experimentos-validacao.md`](./experimentos-validacao.md) § E5.

---

## 7. Entregáveis de produto (sem código)

| # | Entrega | Responsável | Prazo relativo |
|---|---|---|---|
| 1 | Copy de objeção preço na landing (ancoragem lembrancinha) | Produto + design | Antes tráfego |
| 2 | Seção "compare com Olhares" **honesta** (interno, não público) | Produto | Feito — `inteligencia-competitiva.md` |
| 3 | Tabela margem fornecedor 1-pager | Produto | Após 1º case |
| 4 | Decisão documentada pós P1/P2 | Fundador | Após 5 entrevistas |

---

## 8. Entregáveis de engenharia (quando preço mudar)

Só se cenário B ou D for aprovado:

- Atualizar `events.plan` / entitlements se novo tier
- Landing `pricing.tsx` + wizard `?plano=`
- Asaas checkout amounts
- Spec `task-NNN-precificacao-tier.md`

---

## 9. Referências

- UI: `apps/web/app/landing/sections/pricing.tsx`
- Draft modelo: `albora-produto-arquitetura.md` §5.2
- Concorrência: [`inteligencia-competitiva.md`](./inteligencia-competitiva.md)
- Plano de ação: [`plano-implementacao-produto.md`](./plano-implementacao-produto.md)
