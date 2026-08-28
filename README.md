# Albora

**O álbum coletivo da sua festa.**

Produto web que coleta, organiza e devolve as fotos tiradas pelos convidados durante uma festa, usando **missões** fotográficas para aumentar a participação e a **identidade visual do evento** para dar coerência ao resultado.

> O fotógrafo profissional cobre o oficial. Ninguém cobre o espontâneo — e existem 100 a 200 câmeras na festa cujo material se perde em 200 rolos diferentes.

**A hipótese que decide tudo:** ≥ 40% dos convidados presentes enviam ao menos uma foto. Se falhar, nada mais importa.

O núcleo é genérico (`event`, `host`, `guest`, `challenge`, `upload`). Casamento e 15 anos são **packs**, não o núcleo.

---

## Estado

**Aplicação web no ar em desenvolvimento** — convidado, admin, telão e landing existem em `apps/web`. O que ainda falta para um evento real está em [`docs/roadmap.md`](./docs/roadmap.md): prova impressa das peças, deploy, carga 150/20 min, procedimento jurídico de menores.

Não é greenfield. Se um documento ainda disser que “o código não começou”, está desatualizado.

## Por onde começar

| | |
|---|---|
| [`docs/README.md`](./docs/README.md) | **A porta de entrada.** Índice, mapa de rotas e a tabela de quem manda quando dois documentos discordam |
| [`docs/architecture.md`](./docs/architecture.md) | Fronteiras, isolamento, caminho crítico de upload, propagação de identidade |
| [`docs/flows.md`](./docs/flows.md) | Os fluxos, com cada nuance e o porquê dela |
| [`docs/security.md`](./docs/security.md) | Modelo de ameaça, controles por camada, LGPD |
| [`docs/adr/`](./docs/adr/README.md) | As decisões vinculantes |
| [`DESIGN.md`](./DESIGN.md) | Sistema de design, legível por agentes |
| [`CLAUDE.md`](./CLAUDE.md) | Regras não negociáveis para quem escreve código aqui |

**Catálogo visual:** [`/telas`](./apps/web/app/telas/page.tsx) (convidado) e [`/telas-admin`](./apps/web/app/telas-admin/page.tsx) (anfitrião). O HTML antigo em `docs/design/` é protótipo de design, não o produto.

## Superfícies no código

Rotas canônicas em inglês. Aliases em português redirecionam 308 (`apps/web/next.config.ts`); APIs em português reexportam as rotas EN.

| Superfície | Rota | Quem |
|---|---|---|
| Landing e planos | `/` | Público |
| Entrada do convidado | `/e/[slug]` (`?via=qr\|wa\|link`) | QR / WhatsApp / link |
| Hub, feed, câmera, missões, álbum, minhas, música | `/e/[slug]/cover`, `/feed`, `/photo`, `/missions`, `/album`, `/my-photos`, `/music` | Convidado com sessão |
| Admin | `/admin`, `/admin/sign-in`, `/admin/new`, `/admin/e/[eventId]/…` | Anfitrião com conta |
| Telão | `/wall-display` (fullscreen), `/wall-pair` (autorizar TV) | Salão |
| Resgate de QR | `/scan` | Público |

O mapa completo — inclusive seções do admin e aliases — está em [`docs/README.md`](./docs/README.md).

## Como rodar

Node 20+, pnpm, Docker para o Postgres local.

```bash
pnpm install
pnpm db:up
pnpm db:semear
pnpm dev
```

Testes: `pnpm test`. Isolamento contra banco real: `pnpm test:isolamento`. Guards de CI: `pnpm guards`.

## Stack

Decidida nos ADRs [0005](./docs/adr/0005-runtime-stack.md) e [0006](./docs/adr/0006-hosting-platform.md).

| Camada | Escolha | Por quê |
|---|---|---|
| App | Next.js App Router + TypeScript | Uma linguagem nas quatro superfícies |
| Hospedagem | Cloudflare Workers (OpenNext) | Sem cold start, escala a zero |
| Mídia | Cloudflare R2 | **Egress zero** — é o que faz a economia fechar |
| Banco | Neon (Postgres 16); local via Docker na porta 55432 | RLS real; compute suspende quando ocioso |

Custo marginal projetado: **menos de R$ 3 por evento.**

## As quatro regras que governam tudo

1. **O convidado não tem login, e nunca terá.** A primeira foto nunca passa por loja de aplicativos nem por tela de autenticação.
2. **O evento é a fronteira de isolamento**, imposta no banco por RLS forçado — não na aplicação.
3. **O caminho de upload depende de exatamente dois sistemas.** Todo o resto degrada, nunca falha.
4. **Nenhum hex literal em componente.** Um valor fixo é um lugar onde a identidade do casal não propaga — é bug de produto, não de estilo.

---

Sea Tecnologia · documentação em português por decisão de equipe. Identificadores de código em inglês ficam em `backticks`.
