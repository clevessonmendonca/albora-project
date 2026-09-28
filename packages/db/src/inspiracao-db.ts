import type { PoolClient } from "pg";
import type { TemaDeInspiracao } from "@albora/core";

/**
 * Inspiração (ADR 0017). O acervo é **editorial**: entra por migration e sai
 * por migration, e a aplicação não tem política de escrita nele. O que é do
 * anfitrião são os salvos, e esses ninguém mais vê.
 */

export type { TemaDeInspiracao } from "@albora/core";
export { TEMAS_DE_INSPIRACAO, ehTemaDeInspiracao } from "@albora/core";

export type IdeiaDeInspiracao = {
  id: string;
  slug: string;
  tema: TemaDeInspiracao;
  titulo: string;
  corpo: string;
  imagemKey: string | null;
  salva: boolean;
};

export async function listarIdeias(
  cliente: PoolClient,
  contaId: string,
  tema?: TemaDeInspiracao,
): Promise<IdeiaDeInspiracao[]> {
  const { rows } = await cliente.query<{
    id: string;
    slug: string;
    theme: TemaDeInspiracao;
    title: string;
    body: string;
    image_key: string | null;
    salva: boolean;
  }>(
    `SELECT i.id, i.slug, i.theme, i.title, i.body, i.image_key,
            EXISTS (
              SELECT 1 FROM inspiration_saves s
               WHERE s.idea_id = i.id AND s.account_id = $1
            ) AS salva
       FROM inspiration_ideas i
      WHERE ($2::text IS NULL OR i.theme = $2)
      ORDER BY i.theme, i.position, i.created_at`,
    [contaId, tema ?? null],
  );

  return rows.map((l) => ({
    id: l.id,
    slug: l.slug,
    tema: l.theme,
    titulo: l.title,
    corpo: l.body,
    imagemKey: l.image_key,
    salva: l.salva,
  }));
}

export async function listarIdeiasSalvas(
  cliente: PoolClient,
  contaId: string,
): Promise<IdeiaDeInspiracao[]> {
  const { rows } = await cliente.query<{
    id: string;
    slug: string;
    theme: TemaDeInspiracao;
    title: string;
    body: string;
    image_key: string | null;
  }>(
    `SELECT i.id, i.slug, i.theme, i.title, i.body, i.image_key
       FROM inspiration_saves s
       JOIN inspiration_ideas i ON i.id = s.idea_id
      WHERE s.account_id = $1
      ORDER BY s.created_at DESC`,
    [contaId],
  );

  return rows.map((l) => ({
    id: l.id,
    slug: l.slug,
    tema: l.theme,
    titulo: l.title,
    corpo: l.body,
    imagemKey: l.image_key,
    salva: true,
  }));
}

export async function salvarIdeia(
  cliente: PoolClient,
  contaId: string,
  ideiaId: string,
): Promise<void> {
  await cliente.query(
    `INSERT INTO inspiration_saves (account_id, idea_id)
     VALUES ($1, $2)
     ON CONFLICT (account_id, idea_id) DO NOTHING`,
    [contaId, ideiaId],
  );
}

export async function removerIdeiaSalva(
  cliente: PoolClient,
  contaId: string,
  ideiaId: string,
): Promise<void> {
  await cliente.query(
    `DELETE FROM inspiration_saves WHERE account_id = $1 AND idea_id = $2`,
    [contaId, ideiaId],
  );
}
