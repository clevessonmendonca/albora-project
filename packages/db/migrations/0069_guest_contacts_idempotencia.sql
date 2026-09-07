-- 0069 — idempotência concorrente do contato verificado do convidado
--
-- claimGuestPhotosByEmail fazia SELECT-then-INSERT: sob concorrência (duas
-- abas do convidado, retry do callback OIDC) os dois lados passavam o SELECT
-- vazio e gravavam linha duplicada. Esta UNIQUE dá a chave natural do contato
-- — um valor por canal por sessão-de-evento — e torna a gravação um upsert
-- atômico (ON CONFLICT), fechando a janela de corrida sem tocar o isolamento
-- (event_id continua na chave, a RLS de guest_contacts continua valendo).
CREATE UNIQUE INDEX guest_contacts_sessao_canal_valor_uniq
  ON guest_contacts (event_id, session_id, channel, value);
