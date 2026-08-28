-- 0013 — acesso por conta (spec 009, ADR 0013)
--
-- Migrations sao forward-only em producao. Nunca reescreva este arquivo depois
-- de ele ter rodado em qualquer ambiente real — escreva outro.
--
-- events ja tem a politica de isolamento por evento (app.event_id, migration
-- 0001). Esta e a SEGUNDA porta, para o anfitriao: com app.account_id, uma
-- conta ve e cria os SEUS eventos.
--
-- Politicas permissivas se somam por OR. O convidado seta app.event_id (ve um
-- evento), o host seta app.account_id (ve os seus), e um nao abre nada para o
-- outro: sem o GUC, a expressao vira `account_id = NULL`, que nao casa. O
-- NULLIF e obrigatorio pelo mesmo motivo da 0001 — apos um SET LOCAL, ao
-- commitar, o GUC volta a string vazia, e ''::uuid estoura.
--
-- 🔴 O WITH CHECK e o que impede uma conta de CRIAR evento para outra: sem ele,
-- um INSERT com account_id alheio passaria.

CREATE POLICY conta_evento ON events
  USING      (account_id = NULLIF(current_setting('app.account_id', true), '')::uuid)
  WITH CHECK (account_id = NULLIF(current_setting('app.account_id', true), '')::uuid);
