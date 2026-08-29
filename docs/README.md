# Albora — Índice da documentação

Este diretório é a fonte da verdade de tudo que não é código: arquitetura, decisões, produto, especificações e procedimentos operacionais.

## Se você está chegando agora, leia nesta ordem

1. [`product/albora-produto-arquitetura.md`](./product/albora-produto-arquitetura.md) — **o quê e por quê.** Mercado, posicionamento, produto moldado, modelo de negócio, roadmap, riscos. É o documento que origina todos os outros.
2. [`architecture.md`](./architecture.md) — **as fronteiras.** Restrições que governam, superfícies, isolamento, sessão do convidado, caminho crítico de upload, propagação de identidade, packs, modelo de dados.
3. [`flows.md`](./flows.md) — **o que acontece.** Cada fluxo, cada desvio, cada nuance. Termina com os buracos de produto que ainda não têm resposta.
4. [`security.md`](./security.md) — **o que pode dar errado.** Modelo de ameaça, controles por camada, LGPD. Leitura obrigatória antes de tocar em upload, mídia ou sessão.
5. [`../CLAUDE.md`](../CLAUDE.md) — **como se trabalha aqui.** Regras não negociáveis, convenções, ladder de deploy, gates escalonados.
6. [`../DESIGN.md`](../DESIGN.md) — **como deve parecer e soar.** Tokens, escala tipográfica, componentes, movimento, voz, anti-padrões. Legível por agentes de design.
7. [`engineering.md`](./engineering.md) — **como o código se organiza.** Regra de dependência, onde cada lógica mora, estratégia de teste.
8. [`adr/README.md`](./adr/README.md) — **as decisões vinculantes**, e por quê.

## Mapa da árvore

| Pasta | O que vive lá |
|---|---|
| [`adr/`](./adr/README.md) | Architecture Decision Records — cada decisão vinculante, datada e imutável |
| [`product/`](./product/) | Os documentos de produto e branding. Origem de tudo — ver [`product/plano-implementacao-produto.md`](./product/plano-implementacao-produto.md) para prioridades atuais |
| `design/` | Artefatos do trabalho de design: DNA, tokens, sistema, mockups |
| `runbooks/` | Procedimentos operacionais: dev local, deploy, dia do evento, restore |
| `specs/` | Contrato por tarefa, escrito antes do código |
| [`roadmap.md`](./roadmap.md) | Estado operacional: o que falta no código para o 1º evento real |

## Quem manda quando dois lugares discordam

| Assunto | Fonte autoritativa |
|---|---|
| Fronteiras, isolamento, caminho crítico, modelo de dados | `architecture.md` |
| Comportamento de um fluxo, incluindo desvios e casos de borda | `flows.md` |
| Ameaças, controles, LGPD, resposta a incidente | `security.md` |
| Camadas, dependências, onde a lógica mora, teste | `engineering.md` |
| Decisões arquiteturais vinculantes | `adr/` |
| Posicionamento, escopo, roadmap, riscos | `product/albora-produto-arquitetura.md` |
| Prioridades pós-discovery (NOW/NEXT/LATER) | `product/plano-implementacao-produto.md` |
| Concorrência e pricing (mercado) | `product/inteligencia-competitiva.md` · `product/estrategia-precificacao.md` |
| Dia do evento (ops) | `runbooks/dia-do-evento.md` |
| Deploy produção | `runbooks/deploy-producao.md` |
| Teste de carga 150/20 | `runbooks/carga.md` · `pnpm carga` · `pnpm carga:smoke` |
| O que a landing **mostra** (planos e preço na UI) | `apps/web/app/landing/landing-page.tsx` — rascunhos em `product/README.md` |
| Modelo de negócio / preço **draft** | `product/albora-produto-arquitetura.md` §5.2 (não é a UI) |
| Voz, tom, copy, anti-padrões de comunicação | `product/albora-branding-marketing.md` |
| Tokens, tipografia, componentes, movimento, voz | `../DESIGN.md` |
| Protótipos e artefatos de design | `design/` |
| Regras de trabalho para humanos e assistentes | `../CLAUDE.md` |
| Contrato de implementação de uma tarefa | `specs/task-N.md` |
| O que falta no código para o 1º evento | `roadmap.md` |
| Procedimento operacional | `runbooks/` |

Quando `architecture.md` e um ADR discordam, o ADR vence e `architecture.md` está desatualizado — corrija na mesma MR.

## Convenções

- Nomes de arquivo em minúsculas com hífen (`task-12.md`, `dia-do-evento.md`).
- Título de primeiro nível declara a intenção (`# ADR 0002 — ...`, `# Runbook — dia do evento`).
- Referências cruzadas por caminho relativo.
- Blocos de código declaram a linguagem.
- Datas em ISO (`2026-08-09`).

## Mapa das rotas no ar

Canônico em inglês. Páginas PT redirecionam 308 (`apps/web/next.config.ts`). APIs PT reexportam o handler EN (ex.: `/api/parede` → `/api/wall`).

### Convidado — `/e/[slug]`

| Rota | O que é |
|---|---|
| `/e/[slug]` | QR: consentimento + nome + sessão. Query `?via=qr\|wa\|link` grava `guest_sessions.via` e o funil |
| `/e/[slug]/cover` | Hub depois da sessão (missão do momento, recado, atalhos) |
| `/e/[slug]/feed` | Feed do evento (abre no gate de interação) |
| `/e/[slug]/photo` | Câmera / editor / fila de upload |
| `/e/[slug]/missions` | Missões da festa |
| `/e/[slug]/album` | Álbum da noite, capítulos pelo pack |
| `/e/[slug]/my-photos` | Galeria pessoal + share Stories (moldura + consentimento externo) |
| `/e/[slug]/music` | Trilha do casal + sugestão do convidado (link, sem áudio — ADR 0011) |
| `/e/[slug]/pair` | Código de 4 dígitos web → app nativo |

### Anfitrião — `/admin`

| Rota | O que é |
|---|---|
| `/admin` | Lista de eventos da conta |
| `/admin/sign-in` | Magic link |
| `/admin/new` | Wizard: quando, identidade, missões, parede, peças |
| `/admin/e/[eventId]` | Painel ao vivo + pânico + peças PDF/SVG |
| `/admin/e/[eventId]/guests` | Funil e participação sobre `expected_guests` |
| `/admin/e/[eventId]/moderation` | Fila de revisão (denúncia / classificador) |
| `/admin/e/[eventId]/album` | Álbum do anfitrião |
| `/admin/e/[eventId]/missions` | Editor de missões do pack |
| `/admin/e/[eventId]/identity` | Tokens de identidade |
| `/admin/e/[eventId]/guestbook` | Recado dos anfitriões (texto e áudio curto) |

### Telão, resgate, landing

| Rota | O que é |
|---|---|
| `/` | Landing. Planos **no ar:** Grátis R$ 0 · Completo R$ 199 · Fornecedor sob consulta |
| `/scan` | Resgate por QR / código |
| `/wall-display` | Telão fullscreen. Poll em `GET /api/wall` (não há SSE) |
| `/wall-pair` | Autorizar a TV — distinto de `/e/[slug]/pair` |
| `/telas`, `/telas-admin` | Catálogo visual interno, não produto |

O código das telas mora em `apps/web/features/` (um diretório por superfície: `guest`, `feed`, `photo`, `album`, `music`, `admin`, `wall`, …). Handlers HTTP em `apps/web/app/api/`.

## Estado — 2026-08-15

- **Arquitetura:** runtime e hospedagem aceitos ([ADR 0005](./adr/0005-runtime-stack.md), [ADR 0006](./adr/0006-hosting-platform.md)). ADRs 0001–0013.
- **Código:** aplicação web (convidado, admin, telão, landing) em `apps/web`. App nativo (`apps/mobile`) ainda é stub da [spec 017](./specs/task-017-app-expo-e-lojas.md).
- **Packs no catálogo:** casamento e 15 anos (`packages/packs`).
- **1º evento real:** ainda bloqueado por peças impressas (prova com celulares), produção, carga e jurídico — [`roadmap.md`](./roadmap.md).
