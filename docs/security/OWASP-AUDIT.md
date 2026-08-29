# Auditoria OWASP — Albora

> Revisão contra OWASP Top 10 aplicada ao código atual (agosto 2026).
> Complementa [`docs/security.md`](../security.md).

## Resumo

| Risco | Status | Controle principal |
|---|---|---|
| A01 Broken Access Control | Mitigado | RLS forçado + `event_id` da sessão, nunca do corpo |
| A02 Cryptographic Failures | Mitigado | HTTPS, tokens opacos, mídia em origem separada |
| A03 Injection | Mitigado | SQL parametrizado (`pg`); XSS no template React |
| A04 Insecure Design | Mitigado | Chave de storage derivada no servidor; EXIF no cliente |
| A05 Security Misconfiguration | Parcial | Headers globais + CSP; Dependabot/audit report-only |
| A06 Vulnerable Components | Parcial | `pnpm audit` no CI (report-only até zerar HIGH) |
| A07 Identification/Auth Failures | Mitigado | Magic link por e-mail; guest token escopado a 1 evento |
| A08 Data Integrity Failures | Mitigado | Magic bytes no confirm; MIME fechado |
| A09 Logging/Monitoring Failures | Parcial | Logger com redação de PII; health checks; alertas ainda manuais |
| A10 SSRF | Mitigado | Presign gera URL; cliente não escolhe host de storage |

## Achados abertos (não bloqueantes para MVP)

1. Rate limit em memória por instância — não segura ataque distribuído (já documentado no store). Mitigação futura: Cloudflare Rate Limiting no edge.
2. CSP ainda permite `'unsafe-inline'` / `'unsafe-eval'` (Next.js). Apertar depois de nonces.
3. `pnpm audit` está report-only. Promover a gate quando o backlog HIGH for zero.

## O que não é bug

- Comentários **não** são HTML-escapados no banco de propósito (`packages/core/src/comment.ts`). XSS é responsabilidade do React (texto, não `dangerouslySetInnerHTML`).
- `Permissions-Policy` libera `camera=(self)` e `microphone=(self)` — o produto captura foto/vídeo.
- Health checks (`/api/health/*`) não exigem sessão de convidado.
