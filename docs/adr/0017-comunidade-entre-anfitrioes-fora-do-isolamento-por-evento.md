# ADR 0017 — Comunidade entre anfitriões fora do isolamento por evento

**Status:** proposto
**Data:** 2026-09-28
**Contexto:** ADR 0002 (evento como fronteira de tenancy), ADR 0013 (acesso por conta sob RLS), ADR 0016 (navegação de onze destinos).

## O problema

O protótipo do painel traz duas superfícies que o produto não tinha: **Comunidade** (anfitriões perguntando e respondendo entre si) e **Inspiração** (ideias editoriais, com "salvos" por anfitrião).

Comunidade colide de frente com a regra mais dura do projeto: *toda tabela com dado de evento tem `event_id`, RLS forçada, política casando `event_id = app.event_id`; nunca escreva query que cruza eventos*. Um post de comunidade **não é dado de evento**. Ele nasce de uma pessoa que organiza um evento, é lido por pessoas que organizam **outros** eventos, e continua fazendo sentido depois que o evento de quem escreveu acabou. Forçar `event_id` nele produziria um fórum onde ninguém vê o post de ninguém — ou seja, não produziria fórum nenhum.

O `CLAUDE.md` também diz que o Álbora "não é uma rede social **entre eventos**". Vale reler o que essa frase protege: ela protege o **convidado**, cujo feed vive dentro de um evento e morre com ele (ADR 0009). Comunidade é outra população — é o anfitrião, que já tem conta, já tem sessão persistente e já cruza eventos por natureza (ADR 0013 existe exatamente porque uma conta é dona de N eventos). As duas coisas não se contradizem; o que não pode é a fronteira de uma vazar para a outra.

## As opções

- **A — tabelas escopadas por conta, com leitura aberta a quem tem sessão de host.** `account_id` em vez de `event_id`, RLS forçada, escrita só na própria linha, leitura condicionada a existir `app.account_id`. Terceira porta de RLS, irmã das duas que já existem.
- **B — papel dedicado com `BYPASSRLS` e filtro no código.** Rejeitada pelo mesmo motivo do ADR 0013: joga o isolamento para a disciplina de código, que o guard não vigia.
- **C — `event_id` no post, com um caminho de agregação para montar o feed.** Modela errado o objeto (o post não pertence ao evento) e obriga todo feed a passar por `BYPASSRLS` — transforma o caminho normal na exceção auditada.
- **D — comunidade fora do Postgres do produto.** Evita a questão e cria outra: duas fontes de identidade de anfitrião e nenhuma forma barata de ligar um post a um plano ou a um fornecedor.

## Decisão

**Opção A.** Comunidade e "salvos" da Inspiração são **dados de conta**, não de evento.

Tabelas novas, todas com RLS **forçada**:

- `community_posts` — `account_id` (FK), `topic`, `title`, `body`, timestamps. Sem `event_id`.
- `community_replies` — `account_id`, `post_id` (FK), `body`, timestamps.
- `inspiration_ideas` — conteúdo **editorial**, sem dono: `slug`, `theme`, `title`, `body`, `image_key`. Semeada por migration, nunca escrita pelo app.
- `inspiration_saves` — `account_id`, `idea_id`, único por par.

Políticas, em duas formas distintas:

1. **Escrita e dado próprio** (`community_posts`, `community_replies`, `inspiration_saves`): `account_id = NULLIF(current_setting('app.account_id', true), '')::uuid` em `USING` **e** `WITH CHECK`, igual à política `conta_evento` de 0013. É o que impede uma conta de editar ou apagar post de outra.
2. **Leitura do acervo compartilhado** (`community_posts`, `community_replies`, `inspiration_ideas`): política `SELECT` separada, permissiva, com `USING (NULLIF(current_setting('app.account_id', true), '') IS NOT NULL)`.

A segunda política é o ponto crítico deste ADR e a razão de ele existir. Ela **não** é `USING (true)`. A sessão do convidado roda com `app.event_id` setado e **sem** `app.account_id`; com `true`, o convidado leria o fórum inteiro dos anfitriões. Exigir que o GUC de conta esteja presente faz a porta fechar sozinha para quem não é anfitrião — falha fechado, como o `NULLIF` do isolamento por evento.

Todo acesso continua por `comConta` (`SET LOCAL`, transação, conexão devolvida na saída). Nenhum caminho novo de `BYPASSRLS`.

## Consequências

- A suíte de isolamento ganha um terceiro eixo, testado como os outros dois: (a) a conta A não edita nem apaga post da conta B; (b) **uma sessão de convidado não lê nenhuma linha de comunidade** — este é o teste que não pode faltar; (c) sem GUC nenhum, nada aparece.
- O guard "toda tabela tem `event_id`" precisa aprender a exceção. Ela fica **nomeada e fechada**: a lista de tabelas de conta vive no próprio guard, e acrescentar uma tabela a essa lista é uma mudança visível na revisão, não um efeito colateral.
- Moderação de comunidade é problema real e fica **fora** deste ADR: por ora, post e resposta são do autor e ele pode apagar os seus. Denúncia, bloqueio e remoção por equipe entram quando houver volume que justifique.
- Comunidade e Inspiração **não entram no caminho crítico de sábado às 20h**. Nada no fluxo de upload passa a depender delas; se as duas caírem, o convidado não percebe.
- Mídia de convidado continua proibida de virar material de qualquer outra superfície: imagem de ideia editorial é de banco de imagens ou de autorização escrita, nunca foto de evento real.
