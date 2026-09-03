# Load Test — 150 uploads em 20 min

Gate MVP explícito no CLAUDE.md: este teste valida que o pipeline de upload sobrevive à participação do casamento (150 convidados fazendo upload em 20 minutos).

## O que testa

O script percorre o fluxo completo de upload:

1. **Presign** (`POST /api/uploads/presign`) — cliente solicita URL presignada para R2
2. **Upload para R2** (`PUT` para presigned URL) — cliente faz upload direto para Cloudflare R2
3. **Confirm** (`POST /api/uploads/confirm`) — servidor valida arrival de full + thumb e confirma na DB

A métrica crítica é **P95 < 3 segundos por upload completo**. O teste rampeia para 30 usuários simultâneos ao longo de 2 minutos, sustenta por 16 minutos (≈ 150 uploads totais em 20 minutos = 7.5 uploads/min), e depois rampa para zero.

## Pré-requisitos

- **k6** instalado:
  ```bash
  brew install k6
  # OU
  docker run -v "$PWD:$PWD" -w "$PWD" grafana/k6:latest run tools/load-test/upload-stress.mjs ...
  ```
- **Staging deployed** com evento de teste criado
- **Guest token** válido para o evento (obtido após escanear QR e confirmar)
- `sample-400kb.jpg` deve estar no mesmo diretório (gerado com `tools/load-test/sample-400kb.jpg`)

## Rodar o teste

```bash
# Substituir valores pelas suas URL de staging, ID do evento e token
k6 run tools/load-test/upload-stress.mjs \
  --env BASE_URL=https://staging.albora.app \
  --env EVENT_ID=550e8400-e29b-41d4-a716-446655440000 \
  --env GUEST_TOKEN=eyJ... \
  --summary-export=tools/load-test/results.json
```

## Critérios de aceite (MVP gate)

- ✓ P95 latência de upload < 3s
- ✓ Error rate < 1%
- ✓ Zero HTTP 500 (todos os erros precisam ser tratados graciosamente)
- ✓ 150+ uploads completados e confirmados em 20 minutos

## Métricas no output

O k6 emite:

```
upload_latency: tempo total presign + R2 + confirm
presign_latency: só a chamada presign
r2_upload_latency: só o PUT para R2
confirm_latency: só a chamada confirm
upload_fail_rate: taxa de uploads que falharam em qualquer etapa
http_req_failed: taxa de requisições HTTP que retornaram erro
```

A threshold crítica está em `upload_latency` com `p(95)<3000` (3 segundos). Se qualquer upload levar mais de 3s (P95), a pipeline faz `FAIL`.

## Troubleshooting

**"Presign falha com 403"**  
Token expirou ou evento_id não bate. Gerar novo token.

**"Confirm retorna 409 (upload.thumb_ausente)"**  
Arquivo ainda não chegou a R2. Validar que R2 está acessível de staging e que credentials estão corretas.

**"P95 > 3s"**  
Upload pipeline está lento. Verificar:
- Latência de rede até R2
- CPU/memória do backend
- Timeout de storage/DB
- Rate limiting está sendo acionado?

**"HTTP 500 em presign/confirm"**  
Bug no servidor. Verificar logs de staging.

## Replicar localmente (dev)

```bash
# Terminal 1: rodar app local
npm run dev

# Terminal 2: criar evento e guest session de teste
# (requer acesso ao DB de dev ou uso de script de seed)

# Terminal 3: rodar teste
k6 run tools/load-test/upload-stress.mjs \
  --env BASE_URL=http://localhost:3000 \
  --env EVENT_ID=<uuid> \
  --env GUEST_TOKEN=<token>
```

## Referência de pipeline

Ver [`docs/architecture.md` §2.0 - Upload pipeline](../../docs/architecture.md) para especificação completa.
