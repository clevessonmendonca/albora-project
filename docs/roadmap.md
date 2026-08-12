# Roadmap — caminho até o 1º casamento real

> **Atualizado:** 2026-08-12
> **Organização:** o que falta para rodar o primeiro casamento de verdade → o que valida a hipótese → escala.

Este documento complementa o roadmap de produto em [`product/albora-produto-arquitetura.md`](./product/albora-produto-arquitetura.md) com o **estado operacional do código**: o que já fecha em dev e o que ainda bloqueia um evento real.

## Onde estamos

Núcleo, upload, sessão, feed, telão, admin (login + criar evento + **controles por festa**), moderação (denúncia, fila de revisão, gate de interação), reações/comentários offline, álbum e música — tudo verde em dev. A PR #2 fecha A2/A3 no código; falta merge e QA manual.

Faltam três coisas para um evento real:

1. A **peça impressa com QR** (A1)
2. **Produção** (deploy + e-mail + carga) (A4/A5)
3. **Procedimento jurídico menores** (A6, não-código)

**Gates de MVP** (ver [`../CLAUDE.md`](../CLAUDE.md)):

- Cobertura **≥90% no pipeline de upload**
- Smoke E2E do fluxo do convidado

---

## Fase A — Pronto pro 1º evento (caminho crítico)

| # | Item | Tam | Por quê é bloqueante |
|---|---|---|---|
| A1 | **Peças: placa/card SVG→PDF com QR** ([spec 009](./specs/task-009-admin-e-pecas.md)) | **G** | **Parcial** — download SVG no admin (QR nível H, URL legível, validação `@albora/tokens/pecas`). Falta fila SVG→PDF, fonte embutida no CI e prova impressa com 3 celulares. |
| A2 | **Botões do host: pânico + "há menores" + fila de revisão + gate** | **P/M** | **Feito** — admin + toggle de pânico no telão (`PATCH /api/parede/panico`). |
| A3 | **UI do convidado fiada** (reação/comentário no feed, música, álbum) | **M** | **Feito no código** (PR #2) — falta QA das provas da spec 014 e smoke E2E. |
| A4 | **Teste de carga 150 uploads/20min** ([spec 012](./specs/task-012-carga-e-app.md)) | **M** | Gate **não negociável** do CLAUDE.md antes do 1º evento. A ferramenta (`pnpm carga`) já existe; falta rodar contra infra parecida com produção. Runbook: [`runbooks/carga.md`](./runbooks/carga.md). |
| A5 | **Produção**: deploy (Cloudflare/OpenNext + R2 + Neon) + e-mail do magic link (Resend, verificar domínio) | **M** | Hoje roda em localhost. Precisa da esteira `stable→homol→main` de pé e o e-mail real pro host logar. Ver [ADR 0006](./adr/0006-hosting-platform.md). |
| A6 | **Procedimento de conteúdo com menores** (não-código) + revisão jurídica do [ADR 0012](./adr/0012-menores-sem-perguntar-idade.md) | — | A [spec 011](./specs/task-011-moderacao.md) exige o procedimento escrito **antes** do 1º evento. |

---

## Fase B — Pós-H1 (depois de provar participação)

| Item | Spec / referência |
|---|---|
| App nativo Expo — "segunda porta" na confirmação da 1ª foto | [017](./specs/task-017-app-expo-e-lojas.md), [ADR 0008](./adr/0008-app-nativo-como-segunda-porta.md) |
| Recado dos anfitriões (áudio/texto do casal) | [019](./specs/task-019-recado-dos-anfitrioes.md) |
| Compartilhar pra fora (moldura + consentimento externo) | [015](./specs/task-015-compartilhar.md) — **parcial** (minhas + moldura + colagem; falta prova manual e polish) |
| Identidade do casal (cores/fonte no admin) + seleção de missões na criação | [009](./specs/task-009-admin-e-pecas.md) |
| Painel ao vivo — participação sobre `expected_guests`, funil, últimas fotos | [009](./specs/task-009-admin-e-pecas.md) |
| Classificador na thumb + fila de revisão no admin | [011](./specs/task-011-moderacao.md) |

---

## Fase C — Escala / Fase 3

- **Retenção por job**: export pro casal no dia 330, delete no dia 365.
- **Livro de fotos / export** pra nuvem do casal.
- **White-label de fornecedor** (B2B2C) — o quarto plano.
- Budgets de performance bloqueantes (LCP/INP), cobertura ≥90% global.

---

## Ordem de execução recomendada

1. **A2** — host toggles (pânico + "há menores"); curto, destrava demo real.
2. **A3** — UI do convidado; dá cara ao produto e puxa H1.
3. **A1** — peças impressas; maior item, merece foco isolado.
4. **A4 + A5** — carga + produção; em paralelo quando A1–A3 estiverem estáveis.
5. **A6** — procedimento jurídico; pode avançar em paralelo desde já.

A2 e A3 são rápidos e destravam demonstração real. A1 é imprescindível mas grande. A4/A5 fecham o caminho até produção.

---

## Quem manda

| Assunto | Fonte |
|---|---|
| Por quê do produto, posicionamento, fases de negócio | [`product/albora-produto-arquitetura.md`](./product/albora-produto-arquitetura.md) |
| O que falta no código para o 1º evento | **este documento** |
| Contrato de implementação de cada item | [`specs/`](./specs/README.md) |
| Gates de qualidade e deploy | [`../CLAUDE.md`](../CLAUDE.md) |
