# Logging

Logger canônico: `logger` / `childLogger` / `maskPii` em `@albora/core` (Pino).

- Nível: `LOG_LEVEL` (default `info`)
- Redação: `authorization`, `cookie`, `password`, `token`, `email`, `phone`, `nome`
- Contexto útil: `eventId`, `requestId`, `uploadId`, `route` — **não** logar token de sessão

Erros HTTP inesperados passam por `unexpectedError` → `logger.error` + métrica `http.errors`.

Não usar `console.log` em caminho de produção novo. PII crua é violação (CLAUDE.md).
