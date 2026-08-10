# 0006 — Plataforma de hospedagem: Cloudflare Workers + R2 + Neon

- **Status:** Accepted
- **Data:** 2026-08-09
- **Relaciona-se com:** [0002](./0002-event-as-tenancy-boundary.md), [0005](./0005-runtime-stack.md)

## Contexto

O perfil de carga do Albora é hostil ao modelo de hospedagem tradicional e amigável a exatamente um modelo.

- **~80% dos uploads em quatro horas**, aos sábados, concentrados em maio–junho e outubro–dezembro. Uma instância fixa fica ociosa seis dias por semana e onze horas por dia no sétimo.
- **Custo marginal por evento precisa ficar abaixo de R$ 3** para que o preço de R$ 199 tenha margem de 98%.
- **Egress é o assassino silencioso.** Cada ZIP baixado, cada foto no telão, cada galeria aberta é saída de dados. Em provedor com egress cobrado, o custo cresce com o sucesso.
- **Seis semanas, uma pessoa, noites e fins de semana.** Toda hora gasta em infraestrutura é hora não gasta no caminho crítico de upload.

## Decisão

### A observação que determina o desenho

A carga se divide em duas metades com necessidades opostas, e tentar servir as duas com uma tecnologia só é a origem de quase todo desperdício aqui.

| | **Caminho de rajada** | **Caminho de render pesado** |
|---|---|---|
| O quê | presign, confirm, leitura de galeria, stream do telão | PDF de placa e cards, ZIP do evento, livro de fotos, export |
| Concorrência | alta, imprevisível | uma por vez |
| Payload | minúsculo (JSON) | centenas de MB |
| Latência | crítica — cold start é participação perdida | irrelevante, é job |
| Frequência | 4h por semana, em rajada | raro |

O caminho de rajada quer runtime sem cold start, cobrado por request. O caminho de render quer CPU e memória por minutos. **São plataformas diferentes, e forçar uma só significa pagar instância ociosa para ter CPU, ou brigar com limite de CPU para ter elasticidade.**

### A plataforma

| Camada | Escolha | Por quê |
|---|---|---|
| API + superfícies | **Cloudflare Workers** | Sem cold start, cobrado por request, escala a zero de verdade. Binding nativo para R2 elimina egress *e* custo de API entre compute e storage |
| Mídia | **Cloudflare R2** | **Egress zero.** É a decisão que faz a economia fechar |
| Banco | **Neon** (Postgres serverless) | Postgres 16 real, portanto RLS real ([ADR 0002](./0002-event-as-tenancy-boundary.md)). Compute suspende após 5 min ocioso — casa com o perfil de sábado. Branching por ambiente |
| Fila / cron | **Cloudflare Queues + Cron Triggers** | Retenção (dia 330, dia 365), entrega pós-evento, jobs de export |
| Fan-out do telão | **Durable Objects** (opcional) | Um objeto por evento coordenando os clientes conectados. Disponível no plano free com backend SQLite. **Não é requisito** — polling resolve o MVP |
| E-mail | **Resend** | Free tier suficiente para magic link e avisos |
| Render pesado | **adiado** | Placa e cards cabem no Worker. O livro de fotos (Fase 3) ganha container com scale-to-zero quando existir |

### O que fica fora, e por quê

**Vercel.** O plano Hobby proíbe uso comercial de forma explícita — "processar pagamento", "anunciar produto ou serviço", "ser pago para criar ou hospedar o site". O Albora vende plano de R$ 199; estaria em violação no dia em que ligasse o Pix. O plano Pro custa US$ 20/mês, e a saída de dados é cobrada. Não é caro em absoluto, mas é ~20× o custo da alternativa sem comprar nada que o produto precise.

**Cloudflare D1.** Seria o banco mais barato e mais próximo do compute, mas é SQLite: **não tem Row Level Security**. Como o ADR 0002 colocou o isolamento entre eventos no banco, e não na aplicação, D1 é desqualificado por construção. Não vale trocar a garantia estrutural de isolamento por latência.

**Instância fixa** (Fly, Railway, Render sem scale-to-zero). Contradiz o perfil de carga. Se um dia o caminho de render pesado exigir container, ele será scale-to-zero e fora do caminho crítico.

**Keycloak.** Overhead enorme para autenticar duas pessoas por evento, num produto cujo usuário principal não tem login ([ADR 0004](./0004-anonymous-guest-session.md)). Magic link por e-mail resolve o admin.

## Custo real

Os limites gratuitos verificados em agosto de 2026, confrontados com um evento típico (150 convidados, ~3.000 fotos, ~1,2 GB):

| Recurso | Free tier | Consumo por evento | Eventos até pagar |
|---|---|---|---|
| R2 armazenamento | 10 GB-mês | ~1,2 GB | **~8** ← o gargalo |
| R2 Class A (escrita) | 1M/mês | ~6.000 (full + thumb) | ~160/mês |
| R2 Class B (leitura) | 10M/mês | ~50.000 | ~200/mês |
| R2 egress | **ilimitado, zero** | — | ∞ |
| Workers requests | 100k/dia | ~12.000 | ~8 no mesmo sábado |
| Neon armazenamento | 0,5 GB | ~1,5 MB (só metadado) | ~300 |

**Resultado: R$ 0 até por volta do oitavo evento.** Depois disso, R2 cobra US$ 0,015/GB-mês — cerca de **R$ 0,10 por evento por mês**, exatamente como o documento de produto projetou.

**Uma ressalva honesta sobre o free tier de Workers:** o plano gratuito limita **10 ms de CPU por request**. Isso é folgado para presign e query (I/O não conta como CPU), e insuficiente para gerar PDF. O plano pago custa **US$ 5/mês** e eleva o teto para 30 s de CPU. A recomendação é assinar desde o dia 1: R$ 30/mês compra o fim de uma classe inteira de contorção arquitetural, e é ruído perto de um ticket de R$ 199.

Custo total realista no primeiro ano: **US$ 5/mês + domínio `.com.br` (~R$ 40/ano)**, subindo para talvez US$ 25/mês lá pelo centésimo evento.

## Consequências

**Positivas** — a economia unitária do documento de produto (margem de 98%) deixa de ser projeção e vira propriedade da plataforma. Escalar de 1 para 100 eventos não exige nenhuma decisão de infraestrutura nova. O binding R2↔Workers significa que o telão e o ZIP, que são os maiores consumidores de saída de dados, custam literalmente nada.

**A armadilha que precisa estar escrita.** O driver serverless do Neon tem dois modos: HTTP (uma instrução por vez, **sem transação**) e WebSocket (sessão completa, com transação). O ADR 0002 exige `SET LOCAL app.event_id`, e `SET LOCAL` **só existe dentro de uma transação**. Portanto: todo caminho que toca dado de evento usa o driver com transação. O modo HTTP fica restrito a leituras fora do escopo de evento. Errar isso não dá erro — dá uma política de RLS que não casa com nada, e o sintoma aparece como "sumiu tudo", não como "vazou tudo". É a falha mais provável de toda esta arquitetura, e é por isso que está aqui e não num comentário no código.

**Limite de CPU é um teto real, não uma métrica.** Qualquer coisa que processe imagem ou gere documento precisa ser medida contra o teto de 30 s antes de entrar no caminho de request. Na dúvida: fila.

**Dependência de fornecedor, avaliada.** R2 é o ponto de aprisionamento — mas fala API compatível com S3, então migrar é trocar endpoint e pagar egress uma vez. Neon é Postgres padrão; um dump restaura em qualquer lugar. Workers é o mais específico dos três, e é onde a lógica de negócio mora — mitigação é manter o domínio em código puro, com o handler do Worker como camada fina de transporte. Isso é boa prática de qualquer forma.

**Verificar antes de assinar.** Limites de free tier mudam. Os números acima são de agosto de 2026 e devem ser reconferidos antes de qualquer compromisso comercial.

## Fontes

- [Cloudflare Workers — pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [Cloudflare R2 — pricing](https://developers.cloudflare.com/r2/pricing)
- [Durable Objects — free tier](https://developers.cloudflare.com/changelog/2025-04-07-durable-objects-free-tier/)
- [Neon — plans](https://neon.com/docs/introduction/plans)
- [Vercel — Hobby plan](https://vercel.com/docs/plans/hobby)
