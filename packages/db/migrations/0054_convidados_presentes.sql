-- 0054 — presença real confirmada depois da festa
--
-- `expected_guests` (0020) é estimativa preenchida antes do evento. A participação
-- é `sessoes_com_upload / expected_guests`, e é ela que decide a tese — então o
-- denominador ser um palpite pré-evento, nunca reconciliado, é risco direto sobre
-- a decisão mais cara do projeto.
--
-- Coluna separada em vez de sobrescrever `expected_guests`: manter as duas permite
-- saber se a estimativa do anfitrião foi boa, o que é aprendizado sobre o wizard.
--
-- NULL = ainda não confirmado. A leitura cai em `expected_guests` nesse caso.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS actual_guests integer
    CHECK (actual_guests IS NULL OR actual_guests > 0);

COMMENT ON COLUMN events.actual_guests IS
  'Presença real confirmada pelo anfitrião após a festa. NULL = não confirmado; a participação usa expected_guests.';
