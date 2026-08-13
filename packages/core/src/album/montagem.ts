import { agruparEmBlocos, diagramarBloco } from "./blocos";
import { resolver } from "./resolver";
import { selecionarParaAlbum } from "./selecao";
import type { Album, Contadores, MidiaDoAlbum, PlanoDoAlbum } from "./types";

export function contarAcervo(midias: readonly MidiaDoAlbum[]): Contadores {
  return {
    fotos: midias.length,
    convidados: new Set(midias.map((m) => m.sessaoId)).size,
    missoes: new Set(midias.map((m) => m.missaoId).filter((id): id is string => id !== null)).size,
  };
}

export function montarAlbum(midias: readonly MidiaDoAlbum[], plano: PlanoDoAlbum): Album {
  const resolvidas = resolver(midias, plano);
  const { mantidas, descartadas } = selecionarParaAlbum(resolvidas, plano);
  const paginas = agruparEmBlocos(mantidas, plano).flatMap(diagramarBloco);

  const comecoDoCapitulo = new Map<string, Date>();
  for (const capitulo of plano.capitulos) comecoDoCapitulo.set(capitulo.id, capitulo.comecaEm);

  const capitulos = [];
  for (const pagina of paginas) {
    const ultimo = capitulos[capitulos.length - 1];
    if (ultimo && ultimo.id === pagina.capituloId) {
      ultimo.paginas.push(pagina);
      continue;
    }
    capitulos.push({
      id: pagina.capituloId,
      comecaEm: comecoDoCapitulo.get(pagina.capituloId) ?? null,
      paginas: [pagina],
    });
  }

  return {
    capitulos,
    totalDePaginas: paginas.length,
    contadores: contarAcervo(midias),
    descartadas: descartadas.map((m) => m.id),
  };
}
