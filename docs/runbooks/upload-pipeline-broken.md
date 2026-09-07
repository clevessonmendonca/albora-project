# RUNBOOK: Upload pipeline quebrado

## Sintoma

Presign ou confirm em massa com 5xx/409; fotos não aparecem no feed; fila do convidado não esvazia.

## Diagnóstico

1. `/api/health/ready` — se 503, é banco, não R2
2. Logs `presign.emitido` vs `upload.confirmed` vs `http.errors`
3. 409 `upload.objeto_ausente` → PUT no R2 falhou (credencial, CORS, bucket)
4. Rate limit 429 → teto por sessão (`RATE_LIMITS.upload` = 30/min)

## Resolução imediata

1. Conferir secrets R2 do ambiente (não misturar staging/prod)
2. Bucket existe e a API token tem write
3. Se deploy recente quebrou o caminho: rollback do Worker
4. Story/moderação **não** podem bloquear confirm (degradação)

## Prevenção

Carga `pnpm carga` (150/20 min) antes do primeiro evento. EXIF continua no cliente.
