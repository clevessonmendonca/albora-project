# ADR 0012 — Menores: nivelar por cima em vez de perguntar idade

**Status:** aceito · 11/08/2026
**Contexto legal:** precisa de revisão jurídica antes do primeiro evento. Este
ADR decide o **desenho**; ele não substitui parecer.

## Contexto

Menor de idade não é caso de borda no Albora. O pack de 15 anos é uma festa
cheia de gente entre 14 e 16 anos, e mesmo num casamento há criança em quase
toda mesa. Qualquer desenho que trate menor como exceção quebra num dos dois
packs que já existem.

Duas saídas óbvias foram consideradas e recusadas.

### Recusado: caixa de "sou maior de 18"

- **Não tem valor probatório.** Autodeclaração sem verificação não protege
  ninguém; protege a sensação de quem desenhou o formulário.
- **Coleta idade.** Passa a existir um dado novo, sensível por definição, que
  precisa ser guardado, mascarado em log, exportado e apagado. Aumenta o risco
  para reduzir a sensação de risco.
- **Fica no caminho da primeira foto.** É o caminho que decide a H1, e cada
  toque a mais nele é participação a menos.

### Recusado: declarar que é menor ao entrar

O convidado **não tem login** ([ADR 0004](./0004-anonymous-guest-session.md)), e
não é para ter. Não existe momento de cadastro onde essa pergunta caberia sem
inventar exatamente a tela que o produto recusa.

E se coubesse, seria pior: um adolescente que se declara menor e é bloqueado
não usa o produto na festa **dele**.

## Decisão

**Não perguntamos idade. Em lugar nenhum.**

As proteções que a lei exige para criança viram o **padrão para todo mundo**.
Se o piso já é o mais alto, identificar quem é menor deixa de ser necessário —
e a identificação era justamente o que criaria o dado perigoso.

O que já está no produto e passa a ser justificado também por aqui:

| Proteção | Onde já vive |
|---|---|
| Sem conta, sem login, sem identidade entre eventos | [ADR 0004](./0004-anonymous-guest-session.md) |
| Sem perfilamento e sem publicidade | Não existe no modelo de negócio |
| Sem reconhecimento facial | `security.md` §5.1, dado biométrico |
| Visibilidade restrita a um evento | RLS por `event_id`, `CLAUDE.md` |
| Remoção da própria foto em um toque | ADR 0004 e spec 008 |
| Retenção curta e apagamento no dia 365 | `CLAUDE.md` |
| Sem notificação | [ADR 0009](./0009-app-social-do-convidado.md) |

### O interruptor do anfitrião

Um controle novo, por evento, no admin: **"há menores nesta festa"**.

Ligado, ele sobe os padrões sem identificar ninguém:

- Compartilhamento para fora **desligado por padrão** (spec 015).
- Modo endurecido de moderação disponível em um toque (spec 011).
- Gate de interação começa fechado (ADR 0009).

É controle de evento, não de pessoa. Ninguém é marcado, nenhuma idade é
guardada, e o anfitrião — que conhece os convidados — decide com a informação
que ele já tem e nós nunca teremos.

## O buraco real, que não é o que a pergunta supunha

O consentimento que existe hoje é o de **quem envia**. Não existe consentimento
de **quem aparece** na foto — e esse buraco é igual para adulto e para menor,
só que com menor ele dói mais.

Não há solução técnica honesta para isso. Reconhecer quem está na foto para
pedir consentimento exigiria biometria, que está barrada, e que seria um risco
maior que o problema.

Quem tem a relação e o dever é o **anfitrião**: ele convidou, ele conhece as
pessoas, e é ele quem responde pela festa. O produto não resolve isso por ele;
dá as ferramentas — remoção rápida, denúncia por qualquer convidado, pânico,
telão que ele controla — e diz isso com todas as letras nos termos.

## Onde a idade entra de verdade

**Classificação etária das lojas** (spec 017). É metadado da ficha do app, não
pergunta ao usuário, e sai da política de conteúdo — não de um formulário.

**Conteúdo ilegal com menor** continua sendo obrigação legal separada, com
procedimento escrito que a spec 011 exige **antes do primeiro evento** e que
ainda não existe. Não é moderação e não é resolvido por este ADR.

## Consequências

- Nenhum campo de idade nasce no schema. Se um dia nascer, este ADR é reaberto.
- O interruptor do anfitrião precisa entrar na spec 009 (admin).
- Os termos precisam dizer explicitamente de quem é o dever sobre quem aparece
  na foto. Redação por advogado, não por nós.
- **A revisão jurídica é bloqueante para o primeiro evento**, junto com o
  procedimento da 011.
