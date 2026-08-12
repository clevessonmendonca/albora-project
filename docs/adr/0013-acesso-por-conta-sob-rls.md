# ADR 0013 — Acesso por conta sob RLS

**Status:** aceito
**Data:** 2026-08-11
**Contexto:** spec 009 (admin), depende do ADR 0003 (isolamento por evento).

## O problema

O isolamento do produto é por **evento**: toda tabela de evento tem `event_id`, RLS forçada, e a política casa `event_id = app.event_id`. O convidado vive inteiramente nesse mundo — a sessão dele é escopada a um evento, e `comEvento` seta o GUC antes de qualquer consulta.

O anfitrião não. Uma conta é dona de **N eventos** (`events.account_id`), e o painel precisa **listar e criar** os eventos da conta. Sob a política de evento, uma consulta a `events` sem `app.event_id` não devolve nada — e não há um `app.event_id` único quando o que se quer é "todos os meus eventos". Criar um evento é pior: o `INSERT` gera o `id` na hora, então não há como setar `app.event_id` para o próprio evento que ainda não existe.

## As opções

- **A — GUC `app.account_id` + política de conta em `events`.** Simétrico ao isolamento por evento. Uma segunda política permissiva em `events` casa `account_id = app.account_id`; políticas permissivas se somam por **OR**, então o convidado (com `app.event_id`) vê um evento e o host (com `app.account_id`) vê os seus, sem um interferir no outro. `comConta` seta o GUC como `comEvento` seta o dele.
- **B — papel elevado com filtro por `account_id` no código.** Um caminho de host que usa `BYPASSRLS` e filtra por `account_id` na aplicação. Mais simples, mas o isolamento passa a depender de disciplina de código, que o guard não consegue vigiar — é exatamente o que o ADR 0003 recusou para o evento.
- **C — só na camada de conta, sem RLS.** Tratar `events` como tabela de conta e não de evento. Quebra o modelo: `events` **é** a raiz do isolamento por evento (a política casa por `id`), e tirá-la da RLS derruba o resto.

## Decisão

**Opção A.** O acesso por conta é uma segunda porta de RLS, com o mesmo formato da primeira:

- GUC `app.account_id`, setado por `comConta(pool, accountId, fn)` — irmão de `comEvento`, `SET LOCAL` sempre, transação sempre, conexão devolvida em toda saída.
- Política `conta_evento` em `events`, com `USING` **e** `WITH CHECK` sobre `account_id = NULLIF(current_setting('app.account_id', true), '')::uuid`. O `WITH CHECK` é o que impede uma conta de criar evento para outra.
- O `accountId` vem **sempre** da sessão de host resolvida (`resolverHostSessao`), nunca do cliente.

As duas políticas coexistem em `events` e não se cruzam: sem `app.account_id`, a expressão de conta vira `account_id = NULL`, que não casa com nada; sem `app.event_id`, a de evento vira `id = NULL`, idem.

## Consequências

- A suíte de isolamento ganha um eixo novo, testado como o primeiro: a conta A nunca vê o evento da conta B, e o `WITH CHECK` recusa criar evento alheio.
- Operações em tabelas-filhas (challenges, uploads) continuam por `comEvento`: o host cria o evento por `comConta`, e para semear missões seta `app.event_id` do evento recém-criado dentro da mesma transação.
- O guard de isolamento continua valendo: nenhuma tabela nova, nenhuma exceção de RLS. `events` já era forçada; ganhou só uma política a mais.
