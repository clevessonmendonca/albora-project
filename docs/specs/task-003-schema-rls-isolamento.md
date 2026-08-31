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
