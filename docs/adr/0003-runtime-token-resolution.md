# 0003 — Tokens de identidade resolvidos em runtime, um resolvedor para todos os renderizadores

- **Status:** Accepted
- **Data:** 2026-08-09
- **Relaciona-se com:** [0002](./0002-event-as-tenancy-boundary.md)

## Contexto

A tese do produto é que a identidade visual do evento se propaga por todas as peças: placa de mesa, cards de missão, preset aplicado às fotos, layout do telão, álbum final e papelaria impressa. É o território que nenhum concorrente ocupa, e é o único fosso defensável do negócio.

Isso impõe uma exigência incomum na camada de estilo. Um design system convencional — inclusive o do Nereus, cuja disciplina herdamos — tem **um** conjunto de tokens que N aplicações consomem, compilado em build. O Albora precisa do inverso: **N conjuntos de tokens** (um por evento, vindos de `events.identity_tokens`) atravessando **um** sistema de componentes, resolvidos em runtime.

E há uma exigência adicional que quebra a solução ingênua: os renderizadores não compartilham runtime. A placa vai para gráfica via pipeline SVG→PDF; o telão é uma superfície de exibição; o preset é uma transformação sobre a imagem. Se cada um resolver tokens do seu jeito, a placa impressa não combina com o telão — e essa coerência **é** o produto.

## Decisão

1. **Um resolvedor único**, em package compartilhado, com cadeia de fallback `evento → pack → marca Albora`. Todo renderizador consome esse resolvedor. Nenhum implementa o seu.
2. **Na web, tokens viram custom properties CSS** resolvidas por evento e injetadas no documento. Componentes referenciam a variável, nunca o valor.
3. **Nenhum valor concreto dentro de componente.** Sem hex, sem nome de fonte, sem raio literal, sem tamanho fora de escala.
4. **Um guard bloqueante no CI** falha em: hex literal ou classe de cor arbitrária em componente, fork do bloco de tokens fora do package compartilhado. Roda desde o primeiro commit, com auto-teste que usa fixtures deliberadamente violadoras — para que o guard não possa passar a não fazer nada em silêncio.
5. **Exceções são enumeradas, com motivo por arquivo**, dentro do guard. Nunca resolvidas afrouxando a regra.
6. **A marca Albora é o fallback, nunca a camada dominante.** No telão a presença da marca é zero; no fluxo do convidado, quase nula. "A marca é a moldura, o evento é o quadro" não é slogan — é a restrição que mantém a paleta da marca compatível com qualquer paleta de evento por cima.

## Consequências

**A mudança de enquadramento que importa:** o guard de conformidade não é higiene de estilo, é **teste de regressão da funcionalidade principal**. Um hex hardcodado é, literalmente, um lugar onde a identidade do casal não propaga — um pixel do produto que o cliente pagou e não recebeu. Tratá-lo como lint opcional é classificar errado a severidade.

**Positivas** — coerência entre superfícies passa a ser estrutural em vez de disciplinar. Adicionar um renderizador novo (papelaria, livro de fotos) custa consumir o resolvedor, não reimplementar a paleta.

**Custo** — resolução em runtime é mais cara que em build, e a superfície do convidado é a mais sensível a latência do produto inteiro. Mitigação: o conjunto de tokens de um evento é pequeno, imutável durante a festa e cacheável agressivamente por evento.

**Restrição de aceitação de tokens.** Como os tokens vêm de dado do usuário, o resolvedor valida contra conjunto fechado — formato de cor, fontes do catálogo licenciado, escala de raio/espaçamento. Token não é instrução: um valor arbitrário nunca chega a uma custom property sem passar por validação. Isso também protege a fronteira de impressão, onde fonte não licenciada é problema jurídico, não estético.

**Anti-padrões visuais bloqueantes**, herdados do documento de branding: glassmorphism, neon, gradiente roxo, dark mode "tech", fonte script, verde sage, rosa blush, ícone de aliança/pombinha/coração. São proibições de produto, não preferência de gosto — a categoria inteira usa verde sage e rosa blush, e usar também é desaparecer.
