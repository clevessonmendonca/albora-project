# Runbook — carga em produção (N3)

> **Status:** operacional — portão bloqueante antes do 1º casamento real
> **Última revisão:** 2026-08-29
> **Origem:** [`plano-implementacao-produto.md`](../product/plano-implementacao-produto.md) N3 · [`carga.md`](./carga.md)
> **Pré-requisito:** deploy N2 concluído ([`deploy-producao.md`](./deploy-producao.md))

---

## 1. Objetivo

Provar que o **pipeline de upload** aguenta **150 uploads em 20 minutos** contra a infra de produção (ou homol idêntica), com rajadas realistas — gate não negociável do `CLAUDE.md`.

O arnês mede só: `POST /api/sessions` → `presign` → `PUT` R2 → `confirm`. Não exercita telão, feed nem admin.

---

## 2. Pré-requisitos

| Item | Detalhe |
|---|---|
| Host HTTPS | Deploy estável ou homol — ex. `https://stable.albora.app` |
| Evento de teste | Slug dedicado (não evento real de cliente) — ex. `carga-gate-2026` |
| R2 configurado | Presign e PUT reais no bucket prod |
| Neon prod | `DATABASE_URL` com driver transação (WebSocket) |
| Janela | ~25 min sem deploy concorrente |
| CI opcional | Workflow **Teste de carga** → perfil `gate` (requer secrets R2) |

---

## 3. Comando — portão completo

Substitua host e slug. A confirmação **deve ser o hostname exato** (sem `https://`):

```bash
ALVO=https://stable.albora.app \
CARGA_CONFIRMO_ALVO=stable.albora.app \
CARGA_EVENTO=carga-gate-2026 \
CARGA_TOTAL=150 \
CARGA_DURACAO_MIN=20 \
CARGA_CONVIDADOS=50 \
CARGA_SAIDA=docs/runbooks/carga-registros/gate-$(date +%Y%m%d).json \
pnpm carga
```

**Limpeza depois** (exporte `DATABASE_URL` e `R2_*` no shell):

```bash
node tools/carga/limpar.mjs docs/runbooks/carga-registros/gate-YYYYMMDD.json
```

---

## 4. Critérios de aprovação

| Métrica | Aprovado se |
|---|---|
| Uploads concluídos | ≥145/150 (≥97%) |
| Erros 5xx | 0 em presign, PUT e confirm |
| Erros 429 | Aceitável se documentado — rate limit por IP; use `CARGA_IP_POR_CONVIDADO=1` para medir pipeline sem teto de sessão |
| p99 confirm | <10 s (ajustar se latência regional justificar) |
| Idempotência | Prova paralela passa (1 linha no banco) |

**429 ≠ defeito.** 5xx e status 0 na rede do servidor = defeito.

Relatório completo: p50/p95/p99 **por etapa** — não use média global.

---

## 5. Registrar resultado

1. Salvar JSON em [`carga-registros/`](./carga-registros/) (commitar só metadados, sem PII).
2. Preencher tabela abaixo no README de `carga-registros/`.
3. Atualizar [`carga.md`](./carga.md) §5 quando o portão fechar.

| Data | Host | Evento | OK/total | p99 confirm | Responsável | Artefato |
|---|---|---|---:|---|---|---|
| _pendente_ | | | | | | |

---

## 6. Fumaça local / CI

Antes do portão completo, validar que o arnês sobe:

```bash
pnpm carga:smoke
```

GitHub Actions: **Actions → Teste de carga → Run workflow → fumaca** (domingo 06:00 UTC automático).

Perfil `gate` no CI usa Postgres service + dev local — **não substitui** carga contra Workers + R2 prod. É validação do arnês; N3 exige alvo remoto.

---

## 7. Troubleshooting

| Sintoma | Causa provável | Ação |
|---|---|---|
| presign 403/500 | R2 ou env no Worker | Conferir secrets CF + binding |
| confirm lento p99 | Neon cold start / pool | Aquecer com smoke; revisar plano Neon |
| Muitos 429 | Rate limit sessão | `CARGA_IP_POR_CONVIDADO=1` ou aumentar janela |
| status 0 no PUT | Rede ou CORS R2 | Conferir bucket CORS e região |
| Idempotência falha | Bug confirm | Parar; abrir issue — gate vermelho |

---

## 8. Changelog

| Data | Mudança |
|---|---|
| 2026-08-29 | Runbook N3 criado pós-discovery |
