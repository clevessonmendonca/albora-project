import { describe, expect, it } from "vitest";
import type { ServedAlbum, ServedPage, ServedPhoto } from "@/lib/album";
import {
  bandsFromAlbum,
  chaptersFromAlbum,
  firstCoverUrl,
  flattenChapterPhotos,
  flattenPhotos,
} from "./bands";

function foto(id: string, missaoId: string | null = null): ServedPhoto {
  return {
    id,
    url: `https://r2/${id}`,
    urlThumb: `https://r2/${id}/t`,
    mime: "image/jpeg",
    missaoId,
    slot: { id: "a", proporcao: "retrato", fracao: 1 },
  };
}

function pagina(parcial: Partial<ServedPage> & { fotos: ServedPhoto[] }): ServedPage {
  return {
    layoutId: "cheia-retrato",
    amanhecer: false,
    hora: 21,
    inicioDaHora: "2026-08-09T00:00:00.000Z",
    lugarId: null,
    ...parcial,
  };
}

function album(paginas: ServedPage[]): ServedAlbum {
  return {
    capitulos: [{ id: "a-noite", titulo: "A noite", comecaEm: null, paginas }],
    totalDePaginas: paginas.length,
    contadores: { fotos: paginas.reduce((n, p) => n + p.fotos.length, 0), convidados: 1, missoes: 0 },
    interacao: "espelho",
    expiraEm: Date.now() + 60_000,
  };
}

describe("faixas do álbum agrupam pela hora", () => {
  it("páginas da mesma hora viram uma faixa, na ordem em que o núcleo montou", () => {
    const faixas = bandsFromAlbum(
      album([
        pagina({ fotos: [foto("a"), foto("b")] }),
        pagina({ lugarId: "pista", fotos: [foto("c")] }),
        pagina({
          hora: 22,
          inicioDaHora: "2026-08-09T01:00:00.000Z",
          fotos: [foto("d")],
        }),
      ]),
    );

    expect(faixas.map((f) => f.fotos.map((p) => p.id))).toEqual([["a", "b", "c"], ["d"]]);
    expect(faixas[0]?.hora).toBe(21);
    expect(faixas[1]?.hora).toBe(22);
  });

  it("amanhecer marca a faixa inteira", () => {
    const faixas = bandsFromAlbum(
      album([
        pagina({
          hora: 5,
          inicioDaHora: "2026-08-09T08:00:00.000Z",
          amanhecer: true,
          fotos: [foto("alvorada")],
        }),
      ]),
    );

    expect(faixas[0]?.amanhecer).toBe(true);
  });

  it("foto sem hora cai numa faixa própria, e não some", () => {
    const faixas = bandsFromAlbum(
      album([
        pagina({ fotos: [foto("noite")] }),
        pagina({
          hora: null,
          inicioDaHora: null,
          fotos: [foto("perdida")],
        }),
      ]),
    );

    expect(faixas.map((f) => f.chave)).toEqual(["2026-08-09T00:00:00.000Z", "sem-hora"]);
    expect(faixas[1]?.fotos.map((p) => p.id)).toEqual(["perdida"]);
  });

  it("filtro de missão não tira a foto da noite — só esconde a faixa vazia", () => {
    const faixas = bandsFromAlbum(
      album([
        pagina({ fotos: [foto("a", "m1"), foto("b", "m2")] }),
        pagina({
          hora: 22,
          inicioDaHora: "2026-08-09T01:00:00.000Z",
          fotos: [foto("c", "m2")],
        }),
      ]),
      "m1",
    );

    expect(faixas).toHaveLength(1);
    expect(faixas[0]?.fotos.map((p) => p.id)).toEqual(["a"]);
  });
});

describe("capa e lista plana", () => {
  it("a capa é a primeira foto que o núcleo colocou", () => {
    expect(firstCoverUrl(album([pagina({ fotos: [foto("a"), foto("b")] })]))).toBe(
      "https://r2/a",
    );
    expect(firstCoverUrl(album([]))).toBeNull();
  });

  it("a lista plana preserva a ordem das faixas", () => {
    const faixas = bandsFromAlbum(
      album([
        pagina({ fotos: [foto("a")] }),
        pagina({
          hora: 22,
          inicioDaHora: "2026-08-09T01:00:00.000Z",
          fotos: [foto("b")],
        }),
      ]),
    );

    expect(flattenPhotos(faixas).map((p) => p.id)).toEqual(["a", "b"]);
  });
});

describe("capítulos envolvem as faixas de hora, sem misturá-las", () => {
  it("cada capítulo guarda as próprias faixas, na ordem do núcleo", () => {
    const servido: ServedAlbum = {
      capitulos: [
        {
          id: "cerimonia",
          titulo: "A cerimônia",
          comecaEm: "2026-08-08T23:00:00.000Z",
          paginas: [pagina({ fotos: [foto("a")] })],
        },
        {
          id: "pista",
          titulo: "A pista",
          comecaEm: "2026-08-09T01:00:00.000Z",
          paginas: [
            pagina({
              hora: 22,
              inicioDaHora: "2026-08-09T01:00:00.000Z",
              fotos: [foto("b")],
            }),
          ],
        },
      ],
      totalDePaginas: 2,
      contadores: { fotos: 2, convidados: 1, missoes: 0 },
      interacao: "espelho",
      expiraEm: Date.now() + 60_000,
    };

    const capitulos = chaptersFromAlbum(servido);

    expect(capitulos.map((c) => c.id)).toEqual(["cerimonia", "pista"]);
    expect(capitulos.map((c) => c.titulo)).toEqual(["A cerimônia", "A pista"]);
    expect(capitulos.map((c) => c.nomear)).toEqual([true, true]);
    expect(capitulos[0]?.faixas[0]?.hora).toBe(21);
    expect(capitulos[1]?.faixas[0]?.hora).toBe(22);
    expect(flattenChapterPhotos(capitulos).map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("a-noite não ganha título à parte — os discos de hora já são a navegação", () => {
    const capitulos = chaptersFromAlbum(album([pagina({ fotos: [foto("a")] })]));
    expect(capitulos).toHaveLength(1);
    expect(capitulos[0]?.id).toBe("a-noite");
    expect(capitulos[0]?.nomear).toBe(false);
    expect(capitulos[0]?.faixas).toHaveLength(1);
  });

  it("filtro de missão esconde o capítulo vazio, não o disco da outra hora", () => {
    const servido: ServedAlbum = {
      capitulos: [
        {
          id: "antes",
          titulo: "Antes de tudo",
          comecaEm: "2026-08-08T22:00:00.000Z",
          paginas: [pagina({ fotos: [foto("a", "m1")] })],
        },
        {
          id: "pista",
          titulo: "A pista",
          comecaEm: "2026-08-09T01:00:00.000Z",
          paginas: [
            pagina({
              hora: 22,
              inicioDaHora: "2026-08-09T01:00:00.000Z",
              fotos: [foto("b", "m2")],
            }),
          ],
        },
      ],
      totalDePaginas: 2,
      contadores: { fotos: 2, convidados: 1, missoes: 2 },
      interacao: "espelho",
      expiraEm: Date.now() + 60_000,
    };

    const capitulos = chaptersFromAlbum(servido, "m1");
    expect(capitulos.map((c) => c.id)).toEqual(["antes"]);
    expect(capitulos[0]?.faixas[0]?.fotos.map((p) => p.id)).toEqual(["a"]);
  });
});
