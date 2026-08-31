# RPO e RTO

Acordo de recuperação para o MVP (Opção A: Cloudflare + Neon + R2). SLA de disponibilidade alvo: 99% (~7,2 h/mês).

| | Objetivo | Por quê |
|---|---|---|
| **RPO** | ≤ 24 horas | Dump diário implícito no PITR Neon; evento de sábado não recria a noite inteira se o banco voltar do dia anterior — mas 24 h é o teto aceito pelo produto neste estágio |
| **RTO** | ≤ 4 horas | Festa tem hora marcada; 4 h cobre restore Neon + reapontar Worker + validar health |

## Cenários

| Cenário | RPO efetivo | RTO alvo | Runbook |
|---|---|---|---|
| Banco corrompido / drop acidental | último PITR ou dump semanal | 2 h | `docs/runbooks/database-unavailable.md`, `docs/infra/BACKUP-RESTORE.md` |
| Neon fora do ar | 0 (dados no provedor) | depende do Neon; plano B = esperar | `docs/runbooks/database-unavailable.md` |
| R2 objeto apagado | 0 se versionamento on | 1 h | `docs/runbooks/storage-cheio.md` (versão) / Cloudflare dashboard |
| Código ruim em produção | 0 | 10 min | `docs/infra/ROLLBACK.md`, `docs/runbooks/deploy-quebrado.md` |
| Worker Cloudflare indisponível | 0 | fora do nosso controle (SLA CF) | `docs/runbooks/app-down.md` |
| Backup falhou | RPO em risco | — | `docs/runbooks/backup-falhou.md` |

## Última medição de restore

| Data | Ambiente | Origem | Duração | Notas |
|---|---|---|---|---|
| — | — | — | — | Preencher no primeiro teste mensal |

## O que RTO de 4 h **não** cobre

Janela de sábado 18h–23h: se o banco cair no meio da festa, 4 h é tarde demais para aquele evento. Mitigação operacional: não deployar nessa janela; health + alerta de ready; Neon Scale se um sábado real mostrar compute suspenso demais no free tier.
