# 0002 — O evento é a fronteira de isolamento

- **Status:** Accepted
- **Data:** 2026-08-09
- **Relaciona-se com:** [0004](./0004-anonymous-guest-session.md)

## Contexto

O Albora é multi-tenant, mas com cardinalidade oposta à de um SaaS B2B típico. A referência interna mais próxima — o Nereus — isola por **organização**: dezenas de tenants, cada um enorme, permanente, com realm de autenticação próprio e infraestrutura provisionada por tenant. Esse desenho é correto lá e seria ruinoso aqui.

O Albora tem: milhares de eventos por ano, cada um com ~150 sessões anônimas concentradas em quatro horas, vida útil de doze meses e então deleção. Provisionar infra por evento é absurdo. Mas o isolamento precisa ser real — as fotos do casamento da Ana não podem vazar para o casamento da Beatriz, e o vazamento aqui não é um incidente de compliance abstrato: é a foto da família de alguém aparecendo na festa de um estranho.

Há também um segundo eixo de escopo que não é o evento: o fornecedor enxerga seus quarenta eventos, e a plataforma enxerga todos.

## Decisão

**O `event_id` é a fronteira de isolamento, imposta no banco por Row Level Security.**

1. Toda tabela com dado de evento carrega `event_id` UUID NOT NULL com FK.
2. `FORCE ROW LEVEL SECURITY` em todas elas, com política filtrando por `event_id = current_setting('app.event_id', true)::uuid`. O terceiro argumento `true` faz a função retornar NULL em vez de erro quando o setting falta — a política não casa com nada e o sistema **falha fechado**.
3. Toda transação define `SET LOCAL app.event_id`. **Nunca `SET`.**
4. Chaves de object storage são `events/{event_id}/...`, derivadas no servidor a partir da sessão. O cliente nunca informa a chave.
5. Leituras que cruzam eventos — dashboard do fornecedor, observabilidade — não relaxam a política. Usam papel dedicado com `BYPASSRLS`, restrito a caminhos de agregação, auditado por chamada.

`accounts`, `vendors` e `packs` ficam fora do escopo de evento por definição.

## Consequências

**Positivas** — o isolamento vive na camada mais baixa possível. Um bug de aplicação que esqueça um `WHERE` não vaza dado; a política ainda filtra. É a única topologia que sobrevive a um assistente de código escrevendo query nova sem contexto completo.

**Custo e armadilhas** — RLS só funciona se o pooling estiver correto, e as três armadilhas são conhecidas e reais:

- **Pooling em modo transação** devolve a conexão a cada COMMIT. Um `SET` de sessão é herdado pelo próximo cliente a pegar aquela conexão. Daí a regra dura do `SET LOCAL`.
- **Locks de sessão** (`pg_advisory_lock`) sobrevivem ao checkout do pool pelo mesmo motivo. Só a variante transacional é permitida.
- **Jobs em background** rodam fora do ciclo de request, então ninguém definiu o setting por eles. O entrypoint do worker define a partir do payload antes de qualquer chamada ao banco, e um job sem `event_id` **falha alto** em vez de assumir um padrão.

Um job que assume o padrão errado grava a foto no evento errado. Falhar alto é a única opção segura.

**Teste** — o isolamento é testado contra banco real com escopo definido, nunca contra mock, provando que o evento A não lê o B mesmo com id mal configurado. Esses testes rodam em job de CI dedicado e visível, para que um refactor não os apague em silêncio.
