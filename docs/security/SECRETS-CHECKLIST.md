# Checklist de secrets

- [ ] `.env` e `.env.local` estão no `.gitignore`
- [ ] Nenhum secret real no Git (`git grep` por `npg_`, `re_`, `SESSION_SECRET=`)
- [ ] Dev, staging e produção usam secrets **diferentes**
- [ ] GitHub Secrets prefixados `STAGING_` / `PROD_` (ver `docs/infra/AMBIENTES.md`)
- [ ] Logs não imprimem connection string, JWT nem API key (logger redige `authorization`, `cookie`, `email`)
- [ ] Rotação após exposição: `docs/infra/ROTACAO-SECRETS-URGENTE.md`
- [ ] Próxima rotação agendada (máximo 90 dias)
