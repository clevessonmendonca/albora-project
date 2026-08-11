# Architecture Decision Records

Toda decisão arquitetural vinculante do Albora, datada e imutável. O formato e as regras estão em [ADR 0001](./0001-record-architecture-decisions.md).

Um ADR aceito **não é editado**. Se a decisão muda, escreve-se um novo que o supersede.

## Índice

| # | Título | Status |
|---|---|---|
| [0001](./0001-record-architecture-decisions.md) | Registrar decisões de arquitetura | Accepted |
| [0002](./0002-event-as-tenancy-boundary.md) | O evento é a fronteira de isolamento | Accepted |
| [0003](./0003-runtime-token-resolution.md) | Tokens de identidade resolvidos em runtime, um resolvedor para todos os renderizadores | Accepted |
| [0004](./0004-anonymous-guest-session.md) | Sessão anônima do convidado, sem provedor de identidade | Accepted |
| [0005](./0005-runtime-stack.md) | Runtime e stack: TypeScript ponta a ponta com Next.js no Cloudflare | Accepted |
| [0006](./0006-hosting-platform.md) | Plataforma de hospedagem: Cloudflare Workers + R2 + Neon | Accepted |
| [0007](./0007-ai-policy-luts-not-generation.md) | IA: classificação sim, geração não. O visual sai de LUT | Accepted |
| [0008](./0008-app-nativo-como-segunda-porta.md) | App nativo como segunda porta, nunca como a primeira | Superseded por [0009](./0009-app-social-do-convidado.md) |
| [0009](./0009-app-social-do-convidado.md) | O app do convidado é social, e o social vive dentro do evento | Accepted |
| [0010](./0010-expo-para-o-app-do-convidado.md) | Expo para o app do convidado, com o domínio compartilhado | Accepted |
| [0011](./0011-musica-do-evento-sem-direito-de-sincronizacao.md) | Música do evento: link e sugestão sim, áudio embutido não | Accepted |

## Status

| Status | Significado |
|---|---|
| `Proposed` | Escrito, ainda não vinculante |
| `Accepted` | Vinculante. Imutável |
| `Superseded` | Substituído por um ADR posterior, que fica linkado |
| `Declined` | Analisado e recusado. **De primeira classe** — é o que impede a proposta de voltar todo trimestre |

## Decisões de produto já tomadas que ainda não viraram ADR

Vivem em [`../product/`](../product/) e devem virar ADR quando tocarem implementação:

- Site, convite, RSVP e lista de presentes adiados para a Fase 4, com condições de entrada explícitas
- Lista de presentes como bifurcação estratégica — registrada para não ser tomada por impulso
- Sem editor de canvas; diagramação por slots
- Sem comentários em foto
- Sem comunidade
- Assinatura mensal só para fornecedor; nunca para o casal
- Nunca limitar convidados
- Núcleo genérico, experiência especializada, marketing vertical
