-- 0063 — escrita de staff na mesa de suporte (Onda C, T4)
--
-- support_tickets/support_messages (migration 0030) têm FORCE RLS com só
-- `conta_ticket` (host, por account_id) e `ops_ticket_lista` (SELECT
-- cross-conta via platform_operators). Staff não tem accounts.id — sem uma
-- porta de escrita própria, um UPDATE/INSERT de staff seria filtrado pela
-- RLS silenciosamente (zero linhas, sem erro). `app.staff_command` é
-- setado por `executeCommand` (packages/application) logo após o BEGIN de
-- toda transação de comando — é a mesma disciplina de "porta estreita e
-- nomeada" que `withPlatformAggregation` já aplica para leitura.
--
-- `FOR ALL`, não `FOR INSERT`/`FOR UPDATE`: verificado empiricamente nesta
-- instância (Postgres 18.6) que uma política com escopo de comando
-- específico (FOR INSERT / FOR UPDATE) que COEXISTE com uma política
-- `FOR ALL` na mesma tabela (aqui, `conta_ticket`/`conta_mensagem`, migration
-- 0030) não se combina via OR como a documentação do Postgres descreve — a
-- política de comando específico é silenciosamente ignorada, e a mutação
-- vira "0 linhas afetadas" (UPDATE) ou "viola RLS" (INSERT), mesmo com o
-- marcador setado. Duas políticas `FOR ALL` na mesma tabela combinam
-- corretamente (reproduzido isoladamente antes de escrever isto). A
-- superfície de acesso continua contida: `USING`/`WITH CHECK` exigem o
-- mesmo `app.staff_command`, que só existe dentro da transação de um
-- comando já autorizado por `authorize()`, e nenhum comando fora dos quatro
-- casos de uso desta task (`respondTicket`, `assignTicket`,
-- `updateTicketStatus`, `updateTicketPriority`) consulta estas tabelas.
CREATE POLICY staff_mutation_ticket ON support_tickets
  FOR ALL
  USING (current_setting('app.staff_command', true) = 'true')
  WITH CHECK (current_setting('app.staff_command', true) = 'true');

CREATE POLICY staff_mutation_mensagem ON support_messages
  FOR ALL
  USING (current_setting('app.staff_command', true) = 'true')
  WITH CHECK (current_setting('app.staff_command', true) = 'true');

-- support_messages não tinha como dizer QUAL staff respondeu — só
-- author_kind='operator', author_account_id sempre NULL nesse caso.
-- Sem author_staff_id, toda resposta de staff ficaria anônima no thread
-- (rastreável só via audit_log, que não é pensado pra popular UI de chat).
ALTER TABLE support_messages
  ADD COLUMN author_staff_id uuid REFERENCES staff_users(id) ON DELETE SET NULL;
