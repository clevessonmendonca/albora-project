-- 0050 — imagem de capa do evento
--
-- O casal pode enviar uma foto própria que aparece como hero no app do convidado,
-- em vez de (ou antes de) a primeira foto do álbum. A chave é derivada no
-- servidor — o cliente nunca informa nem escolhe (ADR 0002).
--
-- Nullable: eventos sem imagem personalizada continuam mostrando o album hero
-- com o comportamento atual.

ALTER TABLE events ADD COLUMN cover_image_key text;
