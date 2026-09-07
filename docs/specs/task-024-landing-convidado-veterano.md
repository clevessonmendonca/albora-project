# Task 024 — landing: visitante que já usou Albora

## Objetivo

Capturar **maior intenção** — convidado que esteve num casamento e quer no seu.

## Contexto

- [`../product/README.md`](../product/README.md) § conflitos #3 lacuna
- [`../product/plano-implementacao-produto.md`](../product/plano-implementacao-produto.md) P4

## Escopo

**Entra:**
- Bloco na landing (hero secundário ou faixa antes pricing):
  - Headline: "Você esteve num casamento com Albora?"
  - Sub: "Quer o mesmo no seu?"
  - CTA: `Criar meu álbum` → `/admin/new`
- Evento analytics: `landing_veteran_cta`

**Não entra:**
- Login convidado cross-evento
- Lista de eventos passados

## Como se verifica

1. `/` renderiza bloco; CTA dispara beacon
2. Tokens/marca respeitados (modo claro)
3. Lighthouse budget landing não regredir >5%

## Riscos

- Diluir hero casamento → bloco **abaixo** do hero principal
