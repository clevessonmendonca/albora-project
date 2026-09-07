# Task 026 — wizard: convidados presentes (expected_guests)

## Objetivo

Denominador da North Star (`sessoes_com_upload / expected_guests`) **nunca** sai do wizard sem intenção explícita do anfitrião.

## Contexto

- [`../product/plano-implementacao-produto.md`](../product/plano-implementacao-produto.md) P5
- `packages/core/src/funnel.ts` — `taxaDeParticipacao` lança se `expected_guests <= 0`

## Escopo

**Entra:**
- Pergunta "Quantos convidados presentes?" no wizard de criação
- Hint: usamos para medir participação
- Campo numérico obrigatório + slider de ajuste rápido
- Mesma copy no editor de identidade (`/admin/e/[id]/identity`)

**Não entra:**
- Bloquear criação se valor for estimativa grosseira
- Sync automático com lista de convidados

## Como se verifica

1. Wizard passo Evento: sem número válido, "Continuar" desabilitado
2. Resumo mostra "Convidados presentes"
3. POST `/api/admin/events` sempre envia `expectedGuests > 0`

## Status

Implementado em `create-event-wizard.tsx` e `identity-editor.tsx` (2026-08-29).
