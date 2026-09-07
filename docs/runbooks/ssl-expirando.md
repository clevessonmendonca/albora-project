# RUNBOOK: Certificado TLS expirando / domínio

## Sintoma

Browser recusa HTTPS; Cloudflare Universal SSL em "expired"; `albora.social.br` ou `media.` falha.

## Severidade

SEV1 se o domínio de produção cai. Convidado no QR da mesa não tem plano B.

## Diagnóstico

1. Cloudflare → SSL/TLS → Edge Certificates
2. DNS do Registro.br aponta para os nameservers da Cloudflare?
3. Custom domain do Worker / Pages com status Active?

## Resolução imediata

- Universal SSL da Cloudflare renova sozinho se o domínio está Active nos nameservers CF. Se o domínio saiu da CF, recolocar NS no Registro.br.
- Certificado de custom hostname R2: revalidar TXT no dashboard.

## Prevenção

Alerta de expiração no dashboard CF (e-mail da conta). Domínio pago no Registro.br com auto-renew.
