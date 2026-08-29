# Resposta a incidente

## Severidade

| Nível | Significado | Exemplo | Comunicação |
|---|---|---|---|
| SEV1 | Produto fora no horário de festa | health live/ready falha; 5xx em massa; upload morto | imediato; update a cada 30 min |
| SEV2 | Caminho crítico degradado | p95 confirm > 2 s; R2 403; rate limit 429 em massa por bug | 30 min; update 1–2 h |
| SEV3 | Degradação | Lighthouse piorou; um admin lento | após mitigar |
| SEV4 | Ruído | alerta flapping | pós-correção |

## Fluxo

1. **Detecção** — alerta, `GET /api/health/ready`, ou anfitrião no WhatsApp.
2. **Triagem (< 5 min)** — SEV, impacto (um evento vs. todos), dono.
3. **Investigação** — runbook da tabela abaixo; logs sem PII; **não** colar connection string.
4. **Mitigação** — rollback de Worker, acordar Neon, desligar feature. Preferir serviço no ar a causa raiz perfeita.
5. **Resolução** — causa raiz; smoke `scripts/ci/smoke-test.sh`.
6. **Pós-mortem** — 24–48 h, template abaixo. Sem culpa; ações com dono e data.

## Runbooks

| Sintoma | Documento |
|---|---|
| App fora | `docs/runbooks/app-down.md` |
| Banco | `docs/runbooks/database-unavailable.md` |
| Upload | `docs/runbooks/upload-pipeline-broken.md` |
| 5xx | `docs/runbooks/erro-500.md` |
| Latência | `docs/runbooks/latencia-alta.md` |
| CPU/memória (Worker) | `docs/runbooks/cpu-memoria-alta.md` |
| Deploy | `docs/runbooks/deploy-quebrado.md` |
| TLS | `docs/runbooks/ssl-expirando.md` |
| Storage | `docs/runbooks/storage-cheio.md` |
| Backup | `docs/runbooks/backup-falhou.md` |

## Template de pós-mortem

```markdown
# Pós-mortem — AAAA-MM-DD — título curto

SEV:
Início / detecção / mitigação / resolução (UTC):
Impacto (eventos, uploads perdidos — sim/não):

O que aconteceu:
Por que aconteceu:
Como detectamos (alerta ou humano):
O que fizemos:
Como prevenir (ações, dono, data):
```

Guardar em `docs/incidents/` quando houver o primeiro. Não anexar PII nem secrets.
