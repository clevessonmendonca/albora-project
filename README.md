# Albora

**O álbum coletivo da sua festa.**

Produto web que coleta, organiza e devolve as fotos tiradas pelos convidados durante um casamento, usando **missões** fotográficas para aumentar a participação e a **identidade visual do evento** para dar coerência ao resultado.

> O fotógrafo profissional cobre o oficial. Ninguém cobre o espontâneo — e existem 100 a 200 câmeras na festa cujo material se perde em 200 rolos diferentes.

**A hipótese que decide tudo:** ≥ 40% dos convidados presentes enviam ao menos uma foto. Se falhar, nada mais importa.

---

## Estado

**Fundação.** Documentação e design prontos; código de aplicação ainda não começou.

## Por onde começar

| | |
|---|---|
| [`docs/README.md`](./docs/README.md) | **A porta de entrada.** Índice e a tabela de quem manda quando dois documentos discordam |
| [`docs/architecture.md`](./docs/architecture.md) | Fronteiras, isolamento, caminho crítico de upload, propagação de identidade |
| [`docs/flows.md`](./docs/flows.md) | Os oito fluxos, com cada nuance e o porquê dela |
| [`docs/security.md`](./docs/security.md) | Modelo de ameaça, controles por camada, LGPD |
| [`docs/adr/`](./docs/adr/README.md) | As sete decisões vinculantes |
| [`DESIGN.md`](./DESIGN.md) | Sistema de design, legível por agentes |
| [`CLAUDE.md`](./CLAUDE.md) | Regras não negociáveis para quem escreve código aqui |

**Protótipo:** abra [`docs/design/fluxos-principais.html`](./docs/design/fluxos-principais.html) no navegador. Ele funciona de verdade — usa a câmera do aparelho, edita a foto e joga no telão.

## Stack

Decidida nos ADRs [0005](./docs/adr/0005-runtime-stack.md) e [0006](./docs/adr/0006-hosting-platform.md).

| Camada | Escolha | Por quê |
|---|---|---|
| App | Next.js App Router + TypeScript | Uma linguagem nas quatro superfícies |
| Hospedagem | Cloudflare Workers (OpenNext) | Sem cold start, escala a zero |
| Mídia | Cloudflare R2 | **Egress zero** — é o que faz a economia fechar |
| Banco | Neon (Postgres 16) | RLS real; compute suspende quando ocioso |

Custo marginal projetado: **menos de R$ 3 por evento.**

## As quatro regras que governam tudo

1. **O convidado não tem login, e nunca terá.** A primeira foto nunca passa por loja de aplicativos nem por tela de autenticação.
2. **O evento é a fronteira de isolamento**, imposta no banco por RLS forçado — não na aplicação.
3. **O caminho de upload depende de exatamente dois sistemas.** Todo o resto degrada, nunca falha.
4. **Nenhum hex literal em componente.** Um valor fixo é um lugar onde a identidade do casal não propaga — é bug de produto, não de estilo.

## Primeiro passo da implementação

Escrito no [ADR 0005](./docs/adr/0005-runtime-stack.md): antes de qualquer tela, provar ponta a ponta que **Service Worker registra sob OpenNext, IndexedDB persiste entre sessões e o PUT presigned chega no R2**. É o risco técnico real — se o Next brigar com a fila offline, isso muda a stack, e é muito mais barato descobrir agora.

---

Sea Tecnologia · documentação em português por decisão de equipe.
