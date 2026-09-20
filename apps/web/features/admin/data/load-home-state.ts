import {
  eventGuestbook,
  listChallenges,
  listarMidiaDoAlbum,
  marcosDeRetencaoDoEvento,
  withEvent,
  type EventoDoHost,
} from "@albora/db";
import type { MarcoCru } from "@/features/admin/lib/linha-de-retencao";
import { getPool } from "@/lib/db";
import { diasAte } from "@/features/admin/lib/contagem";

/**
 * Momento do evento. Dirige o que a Home mostra — a mesma tela a 180 dias e na
 * véspera é o que fazia o painel parecer um menu em vez de um assistente.
 */
export type FaseDoEvento =
  | "recem"
  | "distante"
  | "aproximando"
  | "semana"
  | "vespera"
  | "hoje"
  | "aovivo"
  | "depois";

export type ItemDePreparo = {
  chave: string;
  titulo: string;
  /** Por que vale a pena — some quando o item já está feito. */
  porque: string;
  feito: boolean;
  href: string;
  cta: string;
};

export type EstadoDaHome = {
  fase: FaseDoEvento;
  /** Dias até o começo. Negativo depois da festa. */
  dias: number;
  itens: ItemDePreparo[];
  feitos: number;
  total: number;
  pct: number;
  /** A única ação que a Home destaca. `null` = tudo pronto. */
  proxima: ItemDePreparo | null;
  /** Jobs de retenção deste evento — vazio se a leitura falhar. */
  marcosDeRetencao: MarcoCru[];
  /** Fase "depois": o payoff. `null` quando a leitura falha. */
  payoff: Payoff | null;
};

export type Payoff = {
  fotos: number;
  pessoas: number;
  destacadas: number;
  /** Fotos que chegaram depois da última visita ao álbum. */
  novas: number;
};

function faseDe(evento: EventoDoHost, dias: number, feitos: number): FaseDoEvento {
  const agora = Date.now();
  if (evento.status === "ended" || agora > evento.terminaEm.getTime()) return "depois";
  if (agora >= evento.comecaEm.getTime()) return "aovivo";
  if (dias <= 0) return "hoje";
  if (feitos === 0) return "recem";
  if (dias === 1) return "vespera";
  if (dias <= 7) return "semana";
  if (dias <= 45) return "aproximando";
  return "distante";
}

/**
 * Os seis essenciais. Capa, recado e missões têm sinal próprio no banco; os três
 * restantes não deixam rastro (identidade nasce preenchida pelo wizard, QR é
 * gerado on-demand, "ver como convidado" é uma visita) e por isso viram marcos
 * gravados no evento — nunca no navegador, como era antes.
 */
function montarItens(
  base: string,
  evento: EventoDoHost,
  temRecado: boolean,
  missoes: number,
): ItemDePreparo[] {
  const m = evento.marcosDePreparo;
  return [
    {
      chave: "capa",
      titulo: "Capa do álbum",
      porque: "É a primeira coisa que seus convidados veem ao entrar.",
      feito: evento.coverImageKey !== null,
      href: `${base}/identity`,
      cta: "Escolher capa",
    },
    {
      chave: "identidade",
      titulo: "Cara de vocês",
      porque: "Cor e fonte do evento aparecem no álbum, no telão e nas placas.",
      feito: m.identidade === true,
      href: `${base}/identity`,
      cta: "Ajustar identidade",
    },
    {
      chave: "recado",
      titulo: "Recado para os convidados",
      porque: "Aparece antes da primeira foto e deixa o álbum pessoal.",
      feito: temRecado,
      href: `${base}/guestbook`,
      cta: "Gravar recado",
    },
    {
      chave: "missoes",
      titulo: "Missões do álbum",
      porque: "São os desafios que fazem todo mundo fotografar.",
      feito: missoes > 0,
      href: `${base}/missions`,
      cta: "Ver missões",
    },
    {
      chave: "previaConvidado",
      titulo: "Ver como convidado",
      porque: "Entrar como eles entram é o jeito mais rápido de conferir tudo.",
      feito: m.previaConvidado === true,
      href: `${base}`,
      cta: "Abrir prévia",
    },
    {
      chave: "qr",
      titulo: "QR das mesas",
      porque: "É por ele que os convidados entram na festa.",
      feito: m.qr === true,
      href: `${base}/qrcode`,
      cta: "Preparar QR",
    },
  ];
}

/** Perto da festa o que importa é entrar e fotografar; antes, é dar cara ao álbum. */
function ordemDaFase(fase: FaseDoEvento): string[] {
  if (fase === "semana" || fase === "vespera" || fase === "hoje") {
    return ["qr", "previaConvidado", "recado", "capa", "missoes", "identidade"];
  }
  return ["capa", "recado", "identidade", "missoes", "previaConvidado", "qr"];
}

export async function loadHomeState(evento: EventoDoHost): Promise<EstadoDaHome> {
  const base = `/admin/e/${evento.eventoId}`;
  const pool = getPool();

  // Terceiro no caminho: se qualquer leitura falhar, a Home degrada para "não
  // feito" em vez de quebrar — o painel nunca é o que impede o casal de entrar.
  const [recado, desafios, marcos] = await Promise.all([
    withEvent(pool, evento.eventoId, (c) => eventGuestbook(c, evento.eventoId)).catch(() => null),
    withEvent(pool, evento.eventoId, (c) => listChallenges(c, evento.eventoId, null)).catch(() => []),
    withEvent(pool, evento.eventoId, (c) =>
      marcosDeRetencaoDoEvento(c, evento.eventoId),
    ).catch(() => []),
  ]);

  // Só a fase Depois usa o payoff — antes da festa é consulta jogada fora.
  const depois =
    evento.status === "ended" || Date.now() > evento.terminaEm.getTime();
  const midias = depois
    ? await withEvent(pool, evento.eventoId, (c) =>
        listarMidiaDoAlbum(c, evento.eventoId),
      ).catch(() => null)
    : null;

  const payoff: Payoff | null = midias
    ? {
        fotos: midias.length,
        pessoas: new Set(midias.map((m) => m.sessaoId)).size,
        destacadas: midias.filter((m) => m.destacadaEm !== null).length,
        novas: evento.albumVistoEm
          ? midias.filter((m) => m.recebidaEm > (evento.albumVistoEm as Date)).length
          : midias.length,
      }
    : null;

  const itens = montarItens(base, evento, recado !== null, desafios.length);
  const feitos = itens.filter((i) => i.feito).length;
  const dias = diasAte(evento.comecaEm);
  const fase = faseDe(evento, dias, feitos);

  const ordem = ordemDaFase(fase);
  const proxima =
    [...itens]
      .sort((a, b) => ordem.indexOf(a.chave) - ordem.indexOf(b.chave))
      .find((i) => !i.feito) ?? null;

  return {
    fase,
    dias,
    itens,
    feitos,
    total: itens.length,
    pct: Math.round((feitos / itens.length) * 100),
    proxima,
    payoff,
    marcosDeRetencao: marcos.map((m) => ({
      kind: m.kind,
      status: m.status,
      dueAt: m.dueAt.toISOString(),
      completedAt: m.completedAt?.toISOString() ?? null,
    })),
  };
}
