# Task 003 — Schema, RLS e testes de isolamento

> **Origem:** [ADR 0002](../adr/0002-event-as-tenancy-boundary.md) · [`../architecture.md` §3 e §8](../architecture.md)
> **Depende de:** 002.

## Objetivo

O banco impedir vazamento entre eventos **sozinho** — sem depender de nenhum `WHERE` escrito na aplicação.

## Escopo

**Entra**

- Tabelas: `accounts`, `vendors`, `packs`, `events`, `challenges`, `guest_sessions`, `guest_contacts`, `uploads`, `reactions`, `funnel_events`
- RLS **forçado** em toda tabela com `event_id`
- O helper único que faz `SET LOCAL app.event_id` na abertura da transação
- Papel `BYPASSRLS` separado, para agregação de fornecedor e observabilidade
- Suíte de isolamento contra **banco real**

**Não entra**

- Qualquer endpoint, qualquer tela
- Seed de produção — só o mínimo para os testes

## Contrato

```sql
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads FORCE ROW LEVEL SECURITY;
CREATE POLICY p ON uploads USING (
  event_id = current_setting('app.event_id', true)::uuid
);
```

O terceiro argumento `true` devolve NULL em vez de erro quando o setting falta — a política não casa com nada e o sistema **falha fechado**.

**Nomes genéricos desde já.** Nunca `couple_names`, `wedding_date`, `bride`, `groom`. O núcleo não sabe que casamento existe.

## 🔴 As três armadilhas

| Armadilha | Regra |
|---|---|
| Pooling em modo transação | **Sempre `SET LOCAL`, nunca `SET`.** Um setting de sessão é herdado pelo próximo cliente |
| Lock de sessão | `pg_advisory_xact_lock`, nunca `pg_advisory_lock` |
| Driver do Neon | HTTP **não tem transação**, e `SET LOCAL` só existe dentro de uma. Caminho de evento usa o driver com transação ([ADR 0006](../adr/0006-hosting-platform.md)) |

A terceira é a mais provável de morder: errar não dá erro — dá política que não casa com nada, e o sintoma é *"sumiu tudo"*, não *"vazou tudo"*.

## Como se verifica

Contra banco real, **nunca mock** — testar isolamento contra mock prova que o mock está isolado.

1. Com `app.event_id = A`, consultar `uploads` sem `WHERE` → só linhas de A
2. Com `app.event_id = A`, buscar por id conhecido de B → zero linhas
3. Sem `app.event_id` definido → zero linhas em toda tabela
4. Worker de fila sem `event_id` no payload → **falha alto**, não assume padrão
5. Duas transações concorrentes com eventos diferentes na mesma conexão do pool → nenhuma enxerga a outra
6. Papel `BYPASSRLS` enxerga os dois — e a chamada fica registrada em auditoria

Job de CI **dedicado e visível**, para que um refactor não apague a rede de segurança em silêncio.

## Riscos

| Risco | Plano |
|---|---|
| Neon suspende compute e a primeira query do teste falha | Warm-up no setup da suíte |
| Migration esquece o RLS na tabela nova | Teste que varre `pg_tables` e reprova tabela com `event_id` sem política forçada |

---

## Resultado — 2026-08-10

15 testes de isolamento contra Postgres 18 real, em job de CI dedicado. Os seis critérios acima passam, mais a varredura de `pg_tables` do risco 2.

### 🔴 A quarta armadilha, que não estava na lista

**Depois de um `SET LOCAL`, ao commitar, um GUC customizado não volta a NULL — volta a string vazia.** E `''::uuid` não "não casa com nada": ele **estoura** com `invalid input syntax for type uuid`.

A política escrita como o contrato desta spec manda —

```sql
event_id = current_setting('app.event_id', true)::uuid
```

— se comporta de **duas formas diferentes na mesma pool**: em conexão nova devolve zero linhas, e em conexão já reciclada por outro evento devolve erro. O sintoma em produção seria intermitente e proporcional ao tráfego, aparecendo primeiro na festa mais cheia.

A forma correta:

```sql
event_id = NULLIF(current_setting('app.event_id', true), '')::uuid
```

O `NULLIF` não é defensivo, é obrigatório. O contrato acima está desatualizado de propósito — fica como registro do que parecia certo.

**Como apareceu:** o teste 3 ("sem `app.event_id`, zero linhas em toda tabela") passava sozinho e quebrava depois do teste 1. Rodar a suíte inteira, na mesma pool, é o que expôs — testes isolados em bancos limpos nunca teriam mostrado. Travado pelo teste *"conexão reciclada, que já serviu um evento, não estoura nem vaza"*.

### Dois falsos positivos corrigidos nos guards

Guard que reprova o que está certo ensina o time a afrouxar a regra, então os dois viraram correção e não exceção:

- O guard `isolamento` pegava o `SET` de um `UPDATE ... SET coluna =`. Passou a exigir GUC com namespace (`app.event_id`). Na mesma passada ganhou o padrão que faltava e é o mais provável em código de aplicação: **`set_config(..., false)`**, que é `SET` de sessão com outra roupa.
- O guard `packs` pegava `INSERT INTO packs (id) VALUES ('casamento')` no seed da suíte. O guard estava certo — o seed é que não tinha por que citar um vertical. Virou `pack-um` e `pack-dois`, o que também deixa o teste mais honesto: isolamento não tem nada a ver com casamento.

### Decisões de execução

**Postgres local em Docker, não Neon.** O risco 1 é o Neon suspender compute, e suíte de isolamento não pode ser lenta nem intermitente. O CI usa service container; `pnpm db:up` sobe o mesmo local.

**A suíte roda como papel comum, nunca como dono.** Superuser **ignora RLS mesmo com `FORCE`** — uma suíte conectada como dono do container passaria enxergando tudo e diria que o isolamento funciona. É a armadilha mais silenciosa das quatro, porque o resultado é verde.

**A suíte tem config e comando próprios** (`pnpm test:isolamento`). Uma falha de isolamento perdida no meio de "testes falharam" deixa de parecer o que é.
