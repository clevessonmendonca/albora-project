# Task 023 — copy de moderação na landing

## Objetivo

Landing alinhada ao comportamento real: **galeria publica**, **telão protegido**.

## Contexto

- [`../product/README.md`](../product/README.md) § conflitos copy #1
- Código: moderação fail-closed na parede; galeria publica (`architecture.md` §9)

## Escopo

**Entra:**
- Revisar objeções/FAQ em `apps/web/app/landing/` (seção moderação)
- Substituir "nada aparece sem você aprovar" por copy honesta (ver product README)

**Copy alvo:**

> Por padrão tudo aparece na galeria — porque no dia da festa ninguém fica aprovando fila. O que protege o telão é automático: o classificador segura o impróprio, qualquer convidado pode denunciar, e você tira do telão em um toque. Se preferir, dá pra ligar aprovação manual.

**Não entra:**
- Mudar moderação no backend
- Página marketing fora do repo

## Como se verifica

1. Grep landing: não resta "nada aparece sem passar por você" literal
2. Review produto + legal OK com galeria pública declarada

## Riscos

- Copy longa → versão curta na FAQ + expandir em modal
