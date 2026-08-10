# 0001 — Registrar decisões de arquitetura

- **Status:** Accepted
- **Data:** 2026-08-09

## Contexto

O Albora nasce de dois documentos de produto densos, escritos ao longo de várias sessões de decisão. Muita coisa já foi decidida — e, mais valioso, muita coisa foi **descartada** com motivo. Cinco nomes morreram antes de "Albora"; site, convite e RSVP foram adiados para a Fase 4 com condições de entrada explícitas; lista de presentes foi registrada como bifurcação estratégica justamente para não ser tomada por impulso.

Sem um registro imutável, esse trabalho evapora. Daqui a quatro meses alguém — inclusive o próprio autor, inclusive um assistente de código — vai propor "e se a gente fizesse um site de casamento grátis?" e ninguém vai lembrar que a resposta já foi analisada e é não, e por quê.

## Decisão

Toda decisão arquitetural vinculante vira um ADR em `docs/adr/`, numerado sequencialmente, datado, **imutável depois de aceito**.

- Formato: contexto → decisão → consequências. Sem seções obrigatórias além dessas.
- Um ADR aceito não é editado. Se a decisão muda, escreve-se um novo que o supersede, e o antigo ganha `Superseded by ADR NNNN`.
- Status possíveis: `Proposed`, `Accepted`, `Superseded`, `Declined`.
- **`Declined` é de primeira classe.** Uma decisão de *não* fazer algo, com o motivo, é frequentemente mais valiosa que uma de fazer — é o que impede a proposta de voltar todo trimestre.
- Se uma MR muda arquitetura, ela atualiza `docs/architecture.md` na mesma MR. Se cria decisão vinculante, adiciona o ADR na mesma MR.

## Consequências

**Positivas** — o "por quê" sobrevive à rotatividade de contexto, humano ou de assistente. Propostas já analisadas são rejeitadas em segundos, com referência. O documento de arquitetura fica enxuto porque o histórico mora em outro lugar.

**Custo** — cada decisão relevante custa alguns minutos de escrita. É barato, mas só se a barra for mantida: ADR para o que é vinculante e caro de reverter, não para toda escolha de biblioteca.
