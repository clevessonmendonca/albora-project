# Task 021 — copy do gate na capa do convidado

## Objetivo

O convidado entende **sem surpresa** se feed/reações/comentários estão abertos ou fechados.

## Contexto

- Discovery produto 2026-08: CTA e feed antes do gate geram frustração
- [`../product/plano-implementacao-produto.md`](../product/plano-implementacao-produto.md) P1
- ADR 0009 — gate configurável pelo casal

## Escopo

**Entra:**
- Banner ou linha na `/e/[slug]/cover` com estado derivado de `interacao` / gate do evento
- Copy via pack (`usePack`) — sem string de casamento no núcleo
- Estados: espelho (fechado) vs completo (aberto); horário agendado se existir

**Não entra:**
- Mudar regra do gate
- Notificações

## Contrato

- Ler gate do payload público do evento (mesmo que feed usa)
- Texto exemplo fechado: "Interação abre após a cerimônia" (pack wedding)
- Texto exemplo aberto: "Feed liberado — veja o que rolou"

## Como se verifica

1. Evento com gate fechado → capa mostra mensagem fechado; feed não promete comentários
2. Anfitrião abre gate → capa atualiza (poll ou navegação)
3. Zero hex hardcodado; tokens do evento
4. Smoke E2E ou teste de componente da capa

## Riscos

- Copy longa demais na capa → manter 1 linha + link "saiba mais" opcional
