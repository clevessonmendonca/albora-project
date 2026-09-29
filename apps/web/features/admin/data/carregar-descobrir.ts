import {
  comConta,
  lerPostDaComunidade,
  listarIdeias,
  listarPostsDaComunidade,
  listarRespostas,
  type FiltroDaComunidade,
  type TemaDeInspiracao,
} from "@albora/db";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getPool } from "@/lib/db";
import { HOST_COOKIE, hostFromToken } from "@/lib/host-session";
import type { IdeiaNaTela, PostNaTela, RespostaNaTela } from "@/features/admin/lib/descobrir-tela";

/**
 * Descobrir lê sob `comConta` (ADR 0023) — nunca sob `comEvento`. A URL da
 * tela carrega um `eventId` porque ela mora no painel do evento, mas nenhuma
 * consulta aqui o usa: o que abre a porta é `app.account_id`.
 */

export const PAGINA = 20;

async function contaDaSessao(): Promise<string> {
  const host = await hostFromToken((await cookies()).get(HOST_COOKIE)?.value);
  if (!host) redirect("/admin/sign-in");
  return host.accountId;
}

export async function carregarFeed(filtro: FiltroDaComunidade): Promise<{
  posts: PostNaTela[];
  temMais: boolean;
}> {
  const contaId = await contaDaSessao();
  const limite = filtro.limite ?? PAGINA;

  // Pede um a mais para saber se há página seguinte sem um COUNT(*) sobre o
  // feed inteiro, e devolve só os que cabem.
  const linhas = await comConta(getPool(), contaId, (c) =>
    listarPostsDaComunidade(c, contaId, { ...filtro, limite: limite + 1 }),
  );

  const posts = linhas.slice(0, limite).map(
    (p): PostNaTela => ({
      id: p.id,
      topico: p.topico,
      titulo: p.titulo,
      corpo: p.corpo,
      criadoEm: p.criadoEm.toISOString(),
      respostas: p.respostas,
      meu: p.meu,
    }),
  );

  return { posts, temMais: linhas.length > limite };
}

export async function carregarConversa(postId: string): Promise<{
  post: PostNaTela;
  respostas: RespostaNaTela[];
}> {
  const contaId = await contaDaSessao();

  const dados = await comConta(getPool(), contaId, async (c) => {
    const post = await lerPostDaComunidade(c, contaId, postId);
    if (!post) return null;
    return { post, respostas: await listarRespostas(c, contaId, postId) };
  });

  if (!dados) notFound();

  return {
    post: {
      id: dados.post.id,
      topico: dados.post.topico,
      titulo: dados.post.titulo,
      corpo: dados.post.corpo,
      criadoEm: dados.post.criadoEm.toISOString(),
      respostas: dados.post.respostas,
      meu: dados.post.meu,
    },
    respostas: dados.respostas.map((r) => ({
      id: r.id,
      corpo: r.corpo,
      criadoEm: r.criadoEm.toISOString(),
      meu: r.meu,
    })),
  };
}

export async function carregarIdeias(tema?: TemaDeInspiracao): Promise<IdeiaNaTela[]> {
  const contaId = await contaDaSessao();

  const linhas = await comConta(getPool(), contaId, (c) => listarIdeias(c, contaId, tema));

  return linhas.map((i) => ({
    id: i.id,
    tema: i.tema,
    titulo: i.titulo,
    corpo: i.corpo,
    salva: i.salva,
  }));
}
