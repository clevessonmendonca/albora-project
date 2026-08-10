# Albora — Índice da documentação

Este diretório é a fonte da verdade de tudo que não é código: arquitetura, decisões, produto, especificações e procedimentos operacionais.

## Se você está chegando agora, leia nesta ordem

1. [`product/albora-produto-arquitetura.md`](./product/albora-produto-arquitetura.md) — **o quê e por quê.** Mercado, posicionamento, produto moldado, modelo de negócio, roadmap, riscos. É o documento que origina todos os outros.
2. [`architecture.md`](./architecture.md) — **as fronteiras.** Restrições que governam, superfícies, isolamento, sessão do convidado, caminho crítico de upload, propagação de identidade, packs, modelo de dados.
3. [`flows.md`](./flows.md) — **o que acontece.** Cada fluxo, cada desvio, cada nuance. Termina com os buracos de produto que ainda não têm resposta.
4. [`security.md`](./security.md) — **o que pode dar errado.** Modelo de ameaça, controles por camada, LGPD. Leitura obrigatória antes de tocar em upload, mídia ou sessão.
5. [`../CLAUDE.md`](../CLAUDE.md) — **como se trabalha aqui.** Regras não negociáveis, convenções, ladder de deploy, gates escalonados.
6. [`../DESIGN.md`](../DESIGN.md) — **como deve parecer e soar.** Tokens, escala tipográfica, componentes, movimento, voz, anti-padrões. Legível por agentes de design.
6. [`engineering.md`](./engineering.md) — **como o código se organiza.** Regra de dependência, onde cada lógica mora, estratégia de teste.
7. [`adr/README.md`](./adr/README.md) — **as decisões vinculantes**, e por quê.

## Mapa da árvore

| Pasta | O que vive lá |
|---|---|
| [`adr/`](./adr/README.md) | Architecture Decision Records — cada decisão vinculante, datada e imutável |
| [`product/`](./product/) | Os documentos de produto e branding. Origem de tudo |
| `design/` | Artefatos do trabalho de design: DNA, tokens, sistema, mockups |
| `runbooks/` | Procedimentos operacionais: dev local, deploy, dia do evento, restore |
| `specs/` | Contrato por tarefa, escrito antes do código |

## Quem manda quando dois lugares discordam

| Assunto | Fonte autoritativa |
|---|---|
| Fronteiras, isolamento, caminho crítico, modelo de dados | `architecture.md` |
| Comportamento de um fluxo, incluindo desvios e casos de borda | `flows.md` |
| Ameaças, controles, LGPD, resposta a incidente | `security.md` |
| Camadas, dependências, onde a lógica mora, teste | `engineering.md` |
| Decisões arquiteturais vinculantes | `adr/` |
| Posicionamento, escopo, preço, roadmap, riscos | `product/albora-produto-arquitetura.md` |
| Voz, tom, copy, anti-padrões de comunicação | `product/albora-branding-marketing.md` |
| Tokens, tipografia, componentes, movimento, voz | `../DESIGN.md` |
| Protótipos e artefatos de design | `design/` |
| Regras de trabalho para humanos e assistentes | `../CLAUDE.md` |
| Contrato de implementação de uma tarefa | `specs/task-N.md` |
| Procedimento operacional | `runbooks/` |

Quando `architecture.md` e um ADR discordam, o ADR vence e `architecture.md` está desatualizado — corrija na mesma MR.

## Convenções

- Nomes de arquivo em minúsculas com hífen (`task-12.md`, `dia-do-evento.md`).
- Título de primeiro nível declara a intenção (`# ADR 0002 — ...`, `# Runbook — dia do evento`).
- Referências cruzadas por caminho relativo.
- Blocos de código declaram a linguagem.
- Datas em ISO (`2026-08-09`).

## Estado — 2026-08-09

- **Arquitetura:** fundação escrita. Runtime em aberto ([ADR 0005](./adr/0005-runtime-stack.md)), por decisão deliberada de esperar o trabalho de design.
- **ADRs:** 0001–0004 aceitos; 0005 proposto.
- **Design:** direção definida (ofício Apple/HIG sobre a paleta Albora, sem glassmorphism). Quatro superfícies a desenhar: convidado, landing, admin, telão.
- **Código:** nenhum. O repositório é greenfield por escolha — a fundação vem antes.
