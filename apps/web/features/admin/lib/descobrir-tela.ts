import {
  TEMAS_DE_INSPIRACAO,
  TOPICOS_DA_COMUNIDADE,
  type TemaDeInspiracao,
  type TopicoDaComunidade,
} from "@albora/core";

/**
 * O que a tela de Descobrir recebe. Mora aqui, e não em `@albora/db`, porque
 * os formulários são componentes client.
 *
 * 🔴 Nenhum destes tipos carrega `accountId` nem e-mail. A comunidade é acervo
 * compartilhado: quem lê um post não é quem o escreveu, e mandar o
 * identificador da conta alheia para o navegador entregaria a um anfitrião a
 * chave de outro. O único traço de autoria que atravessa é `meu`, booleano.
 */

export type PostNaTela = {
  id: string;
  topico: TopicoDaComunidade;
  titulo: string;
  corpo: string;
  /** ISO. `quando()` o formata no servidor, com fuso fixo — ver lá. */
  criadoEm: string;
  /** `created_at` com microssegundo, só para o cursor. O `criadoEm` acima tem milissegundo e pularia linha. */
  chave: string;
  respostas: number;
  meu: boolean;
};

export type RespostaNaTela = {
  id: string;
  corpo: string;
  criadoEm: string;
  meu: boolean;
};

export type IdeiaNaTela = {
  id: string;
  tema: TemaDeInspiracao;
  titulo: string;
  corpo: string;
  salva: boolean;
};

export type Rotulo = { rotulo: string; descricao: string };

export const ROTULO_DO_TOPICO: Record<TopicoDaComunidade, Rotulo> = {
  duvida: { rotulo: "Dúvidas", descricao: "Perguntas de quem está preparando" },
  ideia: { rotulo: "Ideias", descricao: "O que deu certo na festa de alguém" },
  experiencia: { rotulo: "Experiências", descricao: "Relatos depois do evento" },
  indicacao: { rotulo: "Indicações", descricao: "Fornecedores e achados" },
};

export const ROTULO_DO_TEMA: Record<TemaDeInspiracao, Rotulo> = {
  fotos: { rotulo: "Fotos", descricao: "Como as fotos acontecem sem interromper a festa" },
  decoracao: { rotulo: "Decoração", descricao: "Onde o QR fica visível sem virar cartaz" },
  experiencia: { rotulo: "Experiência", descricao: "Missões que fazem as pessoas fotografarem" },
};

export const TOPICOS = TOPICOS_DA_COMUNIDADE;
export const TEMAS = TEMAS_DE_INSPIRACAO;

/**
 * O modelo não guarda nome de exibição — `accounts` tem id, e-mail e data — e
 * o e-mail não pode aparecer para outro anfitrião. Até existir um nome que a
 * pessoa escolha, a autoria só distingue quem está lendo de quem não está.
 */
export function autoria(meu: boolean): string {
  return meu ? "Você" : "Quem organiza";
}

/**
 * Roda no servidor, dentro do componente que desenha a assinatura.
 *
 * As formas relativas não dependem de fuso — só da diferença. A data absoluta
 * depende, e o servidor costuma estar em UTC: sem fixar o fuso, uma conversa
 * das 22h em Brasília aparece com a data do dia seguinte. O ano entra depois de
 * doze meses, senão um post do ano passado fica igual a um do mês passado.
 */
const FUSO = "America/Sao_Paulo";

export function quando(iso: string, agora: Date = new Date()): string {
  const data = new Date(iso);
  const minutos = Math.floor((agora.getTime() - data.getTime()) / 60_000);
  if (minutos < 1) return "agora";
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias < 7) return `há ${dias} d`;
  return data.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: FUSO,
    ...(dias >= 365 ? { year: "numeric" } : {}),
  });
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Os seis dígitos são obrigatórios: é a precisão que o `Date` do JS não tem. */
const CHAVE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/;

/**
 * Cursor da paginação por chave, `<chave>_<uuid>`, ida e volta pela URL.
 *
 * Os dois lados são validados antes de devolver, e nenhum é reconstruído como
 * `Date`: a chave segue como texto até o `::timestamptz` da consulta, com os
 * microssegundos intactos. Valor torto vira "sem cursor" — sem isso o `::uuid`
 * e o `::timestamptz` estouram e a página responde 500 em vez do topo do feed.
 */
export function lerCursor(valor: string | undefined): { chave: string; id: string } | undefined {
  if (!valor) return undefined;
  const corte = valor.lastIndexOf("_");
  if (corte <= 0) return undefined;
  const chave = valor.slice(0, corte);
  const id = valor.slice(corte + 1);
  if (!CHAVE.test(chave) || !UUID.test(id)) return undefined;
  return { chave, id };
}

export function escreverCursor(post: { chave: string; id: string }): string {
  return `${post.chave}_${post.id}`;
}
