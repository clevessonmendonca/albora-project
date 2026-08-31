# Ideias

O que ainda **não** é decisão. Uma ideia entra aqui no minuto em que aparece,
para não virar folclore de conversa nem ser tomada por impulso três meses
depois.

## As três regras

**Uma ideia aqui não tem compromisso nenhum.** Estar nesta lista não é
roadmap, não é promessa e não pode ser citado em copy de venda. Se aparecer
numa landing antes de existir, é afirmação sem lastro.

**Toda ideia registra de onde veio.** Conversa, evento real, pedido de casal,
concorrente. Sem origem, daqui a seis meses ninguém sabe se era intuição ou
observação, e as duas se defendem de formas diferentes.

**A graduação é uma spec, não uma discussão.** Quando a ideia amadurece, ela
vira `docs/specs/task-NNN-*.md` no formato de lá — objetivo, escopo, contrato,
como se verifica, riscos — e sai desta lista com o link. Se não couber no
formato da spec, é sinal de que ainda não está madura.

## O filtro que mata ideia cedo

Do [ADR 0009](./adr/0009-app-social-do-convidado.md), e vale para tudo:

> **Isso aumenta a chance de a tia mandar a foto que está no rolo dela?**

Ideia que não move upload não é errada — é depois. E qualquer ideia que
**atrapalhe** o caminho da primeira foto é recusada mesmo sendo boa, porque a
H1 decide se o negócio existe.

## Em maturação

| Ideia | Origem | O que falta decidir |
|---|---|---|
| **Recado dos anfitriões** — áudio e texto do casal, entregue uma vez dentro do app | Conversa 11/08/2026 | Já virou a [spec 019](./specs/task-019-recado-dos-anfitrioes.md), ainda sem data. O risco não é técnico: é o anfitrião não saber o que dizer |
| **Chão claro ou escuro por convidado** | Conversa 11/08/2026 | O resolvedor já entrega os dois. Falta onde guardar a preferência sem criar conta — provavelmente no próprio token de sessão |
| **Compartilhar direto para outras redes** | Conversa 11/08/2026 | Encosta na [015](./specs/task-015-compartilhar.md), que já existe e tem pendência de consentimento. Decidir se é a mesma tarefa ou duas |
| **Feed vertical de tela cheia**, com vídeo curto | Conversa 11/08/2026 | Vídeo muda o pipeline: peso, transcodificação e o teto de 60 s do plano. Não entra sem medir custo de egress |

## Recusadas, e por quê

Registrar a recusa vale tanto quanto registrar a ideia — sem isso a mesma
proposta volta a cada trimestre e é rediscutida do zero.

| Ideia | Por que não |
|---|---|
| Aba de planejamento (cronograma, local, traje) | Fase 4 com condições de entrada explícitas. É a primeira coisa que a referência destaca, e desenhar agora seria vender o que não existe |
| Áudio gravado por **convidado** | Superfície de moderação nova: o classificador de imagem não varre áudio, e transcrever para moderar é custo e latência no dia da festa |
| Notificação avisando de recado ou de foto nova | Desligada até ter ADR próprio. Notificação é o caminho mais curto para o produto virar chato |
| Agrupamento facial | Bloqueado em parecer jurídico |
| IA generativa na mídia do convidado | [ADR 0007](./adr/0007-ai-policy-luts-not-generation.md). A coerência que o produto vende vem de LUT, que é igual em todas as fotos |

## Onde as ideias moram depois

- Vira tarefa → [`docs/specs/`](./specs/README.md)
- Vira decisão de arquitetura → [`docs/adr/`](./adr/)
- Vira fronteira de produto → [`docs/product/`](./product/)
