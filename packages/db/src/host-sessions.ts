import { nomeNeutroDoTelao, validarNomeDeExibicao } from "@albora/core";
import type { Pool, PoolClient } from "pg";
import { comConta, comEvento } from "./event";
import { ErroNomeInvalido } from "./sessions";

export type SessaoDoHost = {
  id: string;
  nome: string;
  fotos: number;
};

export type AcaoNomeDaSessao =
  | { acao: "ocultar" }
  | { acao: "renomear"; nome: string };

type Linha = {
  id: string;
  display_name: string;
  fotos: number;
};

function paraSessao(l: Linha): SessaoDoHost {
  return { id: l.id, nome: l.display_name, fotos: l.fotos };
}

export async function listarSessoesDoHost(
  cliente: PoolClient,
  eventoId: string,
): Promise<SessaoDoHost[]> {
  const { rows } = await cliente.query<Linha>(
    `SELECT s.id, s.display_name,
            count(u.id)::int AS fotos
       FROM guest_sessions s
       JOIN uploads u
         ON u.session_id = s.id
        AND u.event_id = s.event_id
        AND u.state = 'published'
      WHERE s.event_id = $1
      GROUP BY s.id, s.display_name
      ORDER BY max(u.created_at) DESC, s.id DESC
      LIMIT 200`,
    [eventoId],
  );
  return rows.map(paraSessao);
}

export async function definirNomeDaSessaoDoHost(
  pool: Pool,
  accountId: string,
  eventoId: string,
  sessaoId: string,
  acao: AcaoNomeDaSessao,
): Promise<SessaoDoHost | null> {
  const pertence = await comConta(pool, accountId, async (c) => {
    const { rowCount } = await c.query("SELECT 1 FROM events WHERE id = $1", [eventoId]);
    return (rowCount ?? 0) > 0;
  });
  if (!pertence) return null;

  return comEvento(pool, eventoId, async (c) => {
    const { rows: atuais } = await c.query<{ display_name: string }>(
      `SELECT display_name FROM guest_sessions WHERE id = $1 AND event_id = $2`,
      [sessaoId, eventoId],
    );
    const atual = atuais[0];
    if (!atual) return null;

    const nome =
      acao.acao === "ocultar"
        ? nomeNeutroDoTelao(atual.display_name)
        : validarNomeDeExibicao(acao.nome);
    if (!nome) throw new ErroNomeInvalido(acao.acao === "renomear" ? acao.nome.length : 0);

    const { rows } = await c.query<Linha>(
      `UPDATE guest_sessions
          SET display_name = $3
        WHERE id = $1 AND event_id = $2
      RETURNING id, display_name,
                (SELECT count(*)::int FROM uploads u
                  WHERE u.session_id = guest_sessions.id
                    AND u.event_id = $2
                    AND u.state = 'published') AS fotos`,
      [sessaoId, eventoId, nome],
    );
    return rows[0] ? paraSessao(rows[0]) : null;
  });
}
