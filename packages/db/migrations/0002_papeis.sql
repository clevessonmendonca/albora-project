-- 0002 — papeis
--
-- Exige privilegio elevado (superuser ou CREATEROLE + BYPASSRLS). No Neon,
-- rodar com o papel dono do projeto; se ele nao puder conceder BYPASSRLS,
-- abrir chamado em vez de afrouxar a politica das tabelas — a alternativa
-- "so um SELECT sem RLS" e como o isolamento morre.

-- Papel da aplicacao. NAO tem BYPASSRLS: toda consulta dele passa pela
-- politica, e sem `SET LOCAL app.event_id` ele nao enxerga nada.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'albora_app') THEN
    CREATE ROLE albora_app NOLOGIN;
  END IF;
END $$;

-- Papel de agregacao: painel do fornecedor e observabilidade. Estes sao os
-- unicos caminhos que cruzam eventos por desenho, e por isso sao auditados.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'albora_agregador') THEN
    CREATE ROLE albora_agregador NOLOGIN BYPASSRLS;
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO albora_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO albora_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO albora_app;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO albora_agregador;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO albora_agregador;
