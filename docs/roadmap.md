# Roadmap — caminho até o 1º casamento real

> **Atualizado:** 2026-08-12
> **Organização:** o que falta para rodar o primeiro casamento de verdade → o que valida a hipótese → escala.

Este documento complementa o roadmap de produto em [`product/albora-produto-arquitetura.md`](./product/albora-produto-arquitetura.md) com o **estado operacional do código**: o que já fecha em dev e o que ainda bloqueia um evento real.

## Onde estamos

Núcleo, upload, sessão, feed, **telão completo**, **admin (login + criar evento)**, moderação por denúncia, álbum — tudo verde. O fluxo fecha em dev.

Faltam três coisas para um evento real:

1. A **peça impressa com QR**
2. Os **controles do host durante a festa**
3. **Produção** (deploy + e-mail + carga)

**Gates de MVP** (ver [`../CLAUDE.md`](../CLAUDE.md)):

- Cobertura **≥90% no pipeline de upload**
- Smoke E2E do fluxo do convidado

---

## Fase A — Pronto pro 1º evento (caminho crítico)

| # | Item | Tam | Por quê é bloqueante |
|---|---|---|---|
| A1 | **Peças: placa/card SVG→PDF com QR** ([spec 009](./specs/task-009-admin-e-pecas.md)) | **G** | Sem QR impresso, ninguém escaneia na festa. QR alto contraste, mín. ~3cm, correção nível H, URL legível embaixo, aviso RGB→CMYK, fonte embutida validada no CI, render **em fila**. A verificação "imprimir e escanear com 3 celulares" **não é opcional**. |
| A2 | **Botões do host: pânico + "há menores"** | **P/M** | O pânico precisa existir na mão do casal durante a festa; "há menores" move o limiar de denúncia ([ADR 0012](./adr/0012-menores-sem-perguntar-idade.md)). A fiação em `decidirExibicao` já existe — falta a coluna `has_minors` + a página de admin do evento. Spec de moderação: [011](./specs/task-011-moderacao.md). |
| A3 | **UI do convidado fiada** (reação/comentário no feed, música, álbum) | **M** | É o que puxa a participação (hipótese H1 ≥40%). As rotas existem; falta consumir nas páginas `/e/[slug]/*`, usando [`/telas`](../apps/web/app/telas/) como base. Specs: [007](./specs/task-007-feed-e-stories.md), [008](./specs/task-008-reacoes-e-galeria.md), [014](./specs/task-014-comentarios.md), [016](./specs/task-016-album-da-noite.md), [018](./specs/task-018-musica-do-casal.md). |
| A4 | **Teste de carga 150 uploads/20min** ([spec 012](./specs/task-012-carga-e-app.md)) | **M** | Gate **não negociável** do CLAUDE.md antes do 1º evento. A ferramenta (`pnpm carga`) já existe; falta rodar contra infra parecida com produção. Runbook: [`runbooks/carga.md`](./runbooks/carga.md). |
| A5 | **Produção**: deploy (Cloudflare/OpenNext + R2 + Neon) + e-mail do magic link (Resend, verificar domínio) | **M** | Hoje roda em localhost. Precisa da esteira `stable→homol→main` de pé e o e-mail real pro host logar. Ver [ADR 0006](./adr/0006-hosting-platform.md). |
| A6 | **Procedimento de conteúdo com menores** (não-código) + revisão jurídica do [ADR 0012](./adr/0012-menores-sem-perguntar-idade.md) | — | A [spec 011](./specs/task-011-moderacao.md) exige o procedimento escrito **antes** do 1º evento. |

---

## Fase B — Pós-H1 (depois de provar participação)

| Item | Spec / referência |
|---|---|
| App nativo Expo — "segunda porta" na confirmação da 1ª foto | [017](./specs/task-017-app-expo-e-lojas.md), [ADR 0008](./adr/0008-app-nativo-como-segunda-porta.md) |
| Recado dos anfitriões (áudio/texto do casal) | [019](./specs/task-019-recado-dos-anfitrioes.md) |
| Compartilhar pra fora (moldura + consentimento externo) | [015](./specs/task-015-compartilhar.md) |
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
