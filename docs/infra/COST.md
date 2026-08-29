# Custo — Opção A (econômica)

Orçamento alvo: **R$ 0–100/mês**, preferência por R$ 0 no MVP. Domínio `.social.br` (Registro.br) é o gasto fixo quase certo (~R$ 40/ano).

## Mapa de free tiers (agosto 2026 — conferir no provedor)

| Serviço | Grátis (ordem de grandeza) | Primeiro upgrade | O que estoura primeiro |
|---|---|---|---|
| Cloudflare Workers + Pages | ~100k req/dia | Workers Paid | Pico de sábado + telão fazendo poll |
| Neon | ~0,5 GB storage, compute suspende | Scale | Storage de metadados + compute acordado a noite toda |
| R2 | 10 GB, 1M Class A, 10M Class B | storage US$ 0,015/GB | Fotos acumuladas (3 MB × N) |
| Resend | ~3k e-mails/mês | Pro | Magic links de admin, não convidado |
| GitHub Actions | minutos da org | — | carga `gate` (20 min) + Lighthouse |

Sem Redis, sem k8s, sem k6 cloud, sem Sentry pago no MVP. Logs: Pino no Worker (custo de CPU, não de SaaS).

## Projeção MVP (5–10 eventos/mês, ~300 fotos/evento)

- Storage R2: ~1–9 GB/mês de entrada; free tier segura os primeiros meses.
- Neon: linhas de `uploads`/`sessions` são pequenas; o teto é **objeto**, não linha.
- Workers: poll do telão + feed pesam mais que o PUT (PUT nem passa no Worker).

Planilha viva = esta tabela + fatura mensal colada no PR de "ops(custo)" quando algo sair de zero. Sem `.xlsx` no git.

## Alertas de custo (manuais no MVP)

No dashboard de cada provedor, alarme de 50% e 80% do free tier:

- Neon storage e compute hours
- R2 storage e Class A (presign/PUT)
- Workers requests e CPU-ms
- Resend volume

Quando o alarme disparar: `docs/infra/CAPACITY-PLAN.md` (quando pular de A para B).

## Quick wins (sem gastar)

1. TTL de mídia na borda (`docs/infra/CDN.md`) — reduz Class B se a leitura deixar de ser 100% presigned.
2. Cache 60 s de identidade — menos round-trips Neon no QR da fila.
3. Índices 0052 — menos compute no feed filtrado.
4. Job de retenção D365 — storage não cresce para sempre (já é regra de produto).
5. Não rodar `soak`/`gate` no CI por rotina; `fumaca` semanal basta.

## O que **não** fazer para "economizar"

- Desligar PITR / versionamento R2
- Cachear feed
- Colocar o servidor no caminho dos bytes
- Compartilhar `SESSION_SECRET` entre staging e prod
