# Roadmap — produto completo

> **Atualizado:** 2026-08-12
> **Referência visual:** [`/telas`](../apps/web/app/telas/page.tsx) — toda tela nova ou refatorada deve espelhar este catálogo (Instagram dentro do evento, estrela no lugar do coração, gate honesto).

Este documento substitui o recorte “só MVP” por **entrega completa** alinhada a [`product/albora-produto-arquitetura.md`](./product/albora-produto-arquitetura.md). A ordem abaixo é de dependência, não de negócio.

---

## Trilha A — Superfície do convidado (design `/telas`)

| # | Item | Estado |
|---|---|---|
| A1 | Shell compartilhado (`shell-convidado.tsx`, barra Feed·Missões·Câmera·Álbum·Minhas) | **Em curso** |
| A2 | Entrada = `TelaEntrada` | Pendente |
| A3 | Feed = `TelaFeed` / `TelaAntesDoGate` | Pendente |
| A4 | Álbum = `TelaAlbum` | Pendente |
| A5 | Capa do evento = `TelaCapa` (rota `/e/[slug]/capa`) | Pendente |
| A6 | Câmera com missão sobre o visor = `TelaCamera` | Pendente |

---

## Trilha B — Mídia e planos

| # | Item | Estado |
|---|---|---|
| B1 | Coluna `events.plan` + cota de vídeo por convidado (grátis: 1) | **Feito** |
| B2 | Upload de vídeo (presign/confirm/fila) | **Feito** (falta `<video>` no feed/telão) |
| B3 | Resolução 1600 vs 3500 por plano | Parcial (só redimensionamento) |
| B4 | Telão e feed reproduzem vídeo sem cortar vertical | Pendente |

---

## Trilha C — Anfitrião completo (spec 009)

| Item | Estado |
|---|---|
| Painel ao vivo (`TelaPainel`) | Pendente |
| Modelos da parede (`TelaModelosDaParede`) | Pendente |
| Identidade + missões na criação | Pendente |
| Peças PDF + ZIP + funil `expected_guests` | Pendente |

---

## Trilha D — Produção e escala

Deploy CF + Resend, carga 150/20min, retenção jobs, app Expo, livro, fornecedor — ver doc de produto §8.

---

## Onde estávamos (1º casamento)

Peças impressas, produção, carga e jurídico menores continuam bloqueantes operacionais — ver seções A1/A4/A5/A6 abaixo.

---

## Fase A — Pronto pro 1º evento (caminho crítico)

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
| A3 | **UI do convidado fiada** (reação/comentário no feed, música, álbum) | **M** | **Feito no código** (PR #2) — smoke E2E inicial (`pnpm test:e2e`); fluxo completo com `E2E_FULL=1` após `db:semear`. |
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
