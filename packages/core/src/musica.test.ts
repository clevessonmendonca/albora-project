import { describe, expect, it } from "vitest";
import type { GateDeInteracao } from "./interacao";
import {
  CAMPOS_DA_SUGESTAO,
  FRONTEIRA_ADR_0011,
  HOSTS_ACEITOS,
  TETO_DE_SUGESTOES_POR_SESSAO,
  chaveDaFaixa,
  exibirMusica,
  lerLinkDeMusica,
  montarSugestaoDeCompartilhamento,
  ordenarSugestoes,
  registrarSugestao,
  validarSaidaDeCompartilhamento as validarSaida,
  votos,
  type FaixaSugerida,
  type LinkDeMusica,
  type SugestaoDeCompartilhamento,
} from "./musica";

const FAIXA_SPOTIFY = "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT";

function link(colado: string): LinkDeMusica {
  const resultado = lerLinkDeMusica(colado);
  if (!resultado.ok) throw new Error(`esperava link válido: ${resultado.erro.code}`);
  return resultado.link;
}

function erro(colado: string): string {
  const resultado = lerLinkDeMusica(colado);
  if (resultado.ok) throw new Error("esperava recusa, veio link");
  return resultado.erro.code;
}

describe("o catálogo é fechado, e é fechado num lugar só", () => {
  it("aceita faixa, álbum e playlist de cada provedor da lista", () => {
    expect(link(FAIXA_SPOTIFY)).toEqual({
      provedor: "spotify",
      tipo: "faixa",
      identificador: "4cOdK2wGLETKBW3PvgPWqT",
      regiao: null,
      url: FAIXA_SPOTIFY,
    });

    expect(link("https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M").tipo).toBe("playlist");

    expect(link("https://music.youtube.com/watch?v=dQw4w9WgXcQ")).toEqual({
      provedor: "youtube-music",
      tipo: "faixa",
      identificador: "dQw4w9WgXcQ",
      regiao: null,
      url: "https://music.youtube.com/watch?v=dQw4w9WgXcQ",
    });

    expect(link("https://www.youtube.com/watch?v=dQw4w9WgXcQ").provedor).toBe("youtube");
    expect(link("https://youtu.be/dQw4w9WgXcQ").url).toBe(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    );

    expect(link("https://music.apple.com/br/album/nome/1440857781?i=1440857785")).toEqual({
      provedor: "apple-music",
      tipo: "faixa",
      identificador: "1440857785",
      regiao: "br",
      url: "https://music.apple.com/br/song/1440857785",
    });

    expect(link("https://www.deezer.com/br/track/3135556")).toEqual({
      provedor: "deezer",
      tipo: "faixa",
      identificador: "3135556",
      regiao: null,
      url: "https://www.deezer.com/track/3135556",
    });
  });

  it("host fora da lista é recusado, e o motivo diz qual host", () => {
    const resultado = lerLinkDeMusica("https://soundcloud.com/alguem/faixa");
    expect(resultado).toEqual({
      ok: false,
      erro: { code: "musica.provedor_fora_da_lista", details: { host: "soundcloud.com" } },
    });
  });

  it("host que apenas termina em um host aceito é recusado", () => {
    // Impede comparar com `endsWith`: `notspotify.com` termina em `spotify.com`, e `open.spotify.com.evil.com` termina em qualquer coisa — comparação é igualdade, sempre.
    expect(erro("https://notspotify.com/track/4cOdK2wGLETKBW3PvgPWqT")).toBe(
      "musica.provedor_fora_da_lista",
    );
    expect(erro("https://open.spotify.com.evil.com/track/4cOdK2wGLETKBW3PvgPWqT")).toBe(
      "musica.provedor_fora_da_lista",
    );
  });

  it("encurtador é recusado, porque resolvê-lo exigiria seguir redirecionamento", () => {
    // Seguir redirecionamento transformaria o link colado no admin em requisição de saída para host que quem colou escolhe.
    expect(erro("https://spotify.link/abc123")).toBe("musica.provedor_fora_da_lista");
    expect(erro("https://deezer.page.link/abc123")).toBe("musica.provedor_fora_da_lista");
  });

  it("a lista de hosts não cresce sem alguém decidir", () => {
    expect(HOSTS_ACEITOS).toEqual([
      "open.spotify.com",
      "music.youtube.com",
      "www.youtube.com",
      "youtube.com",
      "m.youtube.com",
      "youtu.be",
      "music.apple.com",
      "www.deezer.com",
      "deezer.com",
    ]);
  });
});

describe("a URL é entrada não confiável", () => {
  it("recusa esquema que não seja https", () => {
    expect(erro("javascript:alert(1)")).toBe("musica.esquema_recusado");
    expect(erro("data:text/html,<script>alert(1)</script>")).toBe("musica.esquema_recusado");
    expect(erro("file:///etc/passwd")).toBe("musica.esquema_recusado");
    expect(erro("http://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT")).toBe(
      "musica.esquema_recusado",
    );
  });

  it("recusa credenciais embutidas, que fazem o host mentir para quem lê", () => {
    // `https://open.spotify.com@evil.com/x` tem host `evil.com`.
    expect(erro("https://open.spotify.com@evil.com/track/4cOdK2wGLETKBW3PvgPWqT")).toBe(
      "musica.credenciais_na_url",
    );
  });

  it("recusa porta explícita", () => {
    expect(erro("https://open.spotify.com:8443/track/4cOdK2wGLETKBW3PvgPWqT")).toBe(
      "musica.porta_recusada",
    );
  });

  it("recusa host homógrafo, que vira punycode e some da lista", () => {
    expect(erro("https://ореn.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT")).toBe(
      "musica.provedor_fora_da_lista",
    );
  });

  it("`constructor` não é provedor nem é tipo de conteúdo", () => {
    // Impede a tabela de consulta ser objeto literal: `{}["constructor"]` responde com algo herdado do protótipo, e o tipo `Record<string, T>` esconde isso em tempo de compilação.
    expect(erro("https://constructor/track/4cOdK2wGLETKBW3PvgPWqT")).toBe(
      "musica.provedor_fora_da_lista",
    );
    expect(erro("https://open.spotify.com/constructor/4cOdK2wGLETKBW3PvgPWqT")).toBe(
      "musica.conteudo_nao_suportado",
    );
    expect(erro("https://open.spotify.com/__proto__/4cOdK2wGLETKBW3PvgPWqT")).toBe(
      "musica.conteudo_nao_suportado",
    );
  });

  it("identificador é conjunto de caracteres, não `qualquer coisa até a barra`", () => {
    expect(erro("https://open.spotify.com/track/..%2f..%2fetc%2fpasswd")).toBe(
      "musica.identificador_invalido",
    );
    expect(erro("https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWq")).toBe(
      "musica.identificador_invalido",
    );
    expect(erro("https://www.youtube.com/watch?v=<script>")).toBe("musica.identificador_invalido");
    expect(erro("https://www.deezer.com/track/3135556abc")).toBe("musica.identificador_invalido");
  });

  it("string ilegível é recusada sem eco do que foi colado", () => {
    const resultado = lerLinkDeMusica("não é url nenhuma");
    expect(resultado).toEqual({ ok: false, erro: { code: "musica.url_ilegivel", details: {} } });
  });

  it("recusa o que não é faixa, álbum nem playlist", () => {
    expect(erro("https://open.spotify.com/artist/4cOdK2wGLETKBW3PvgPWqT")).toBe(
      "musica.conteudo_nao_suportado",
    );
    expect(erro("https://open.spotify.com/episode/4cOdK2wGLETKBW3PvgPWqT")).toBe(
      "musica.conteudo_nao_suportado",
    );
    expect(erro("https://www.youtube.com/@algumcanal")).toBe("musica.conteudo_nao_suportado");
    expect(erro("https://music.apple.com/br/artist/nome/123")).toBe(
      "musica.conteudo_nao_suportado",
    );
  });
});

describe("a URL devolvida é recomposta, nunca a colada", () => {
  it("descarta rastreamento, query estranha e fragmento", () => {
    // O que volta é o que 150 convidados vão abrir. Devolver a string colada seria propagar `?si=` — e qualquer outra coisa pendurada nela.
    expect(link(`${FAIXA_SPOTIFY}?si=abc123&utm_source=x#pedaco`).url).toBe(FAIXA_SPOTIFY);
    expect(link("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42&list=PLabc").url).toBe(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    );
  });

  it("prefixo de idioma do Spotify não impede a leitura", () => {
    expect(link("https://open.spotify.com/intl-pt/track/4cOdK2wGLETKBW3PvgPWqT").url).toBe(
      FAIXA_SPOTIFY,
    );
  });

  it("faixa dentro de lista resolve para a faixa", () => {
    // Quem compartilhou estava ouvindo uma faixa dentro de uma lista, e o que ele escolheu foi a faixa.
    const resolvido = link("https://music.youtube.com/watch?v=dQw4w9WgXcQ&list=PLabc");
    expect(resolvido.tipo).toBe("faixa");
    expect(resolvido.identificador).toBe("dQw4w9WgXcQ");
  });

  it("álbum sem `?i=` continua álbum", () => {
    expect(link("https://music.apple.com/br/album/nome/1440857781")).toMatchObject({
      tipo: "album",
      identificador: "1440857781",
      url: "https://music.apple.com/br/album/1440857781",
    });
  });

  it("playlist da Apple exige o prefixo `pl.`", () => {
    expect(link("https://music.apple.com/br/playlist/festa/pl.u-abc123").tipo).toBe("playlist");
    expect(erro("https://music.apple.com/br/playlist/festa/1440857781")).toBe(
      "musica.identificador_invalido",
    );
  });

  it("Deezer funciona com e sem região no caminho", () => {
    expect(link("https://deezer.com/album/302127").url).toBe("https://www.deezer.com/album/302127");
    expect(link("https://www.deezer.com/br/album/302127").url).toBe(
      "https://www.deezer.com/album/302127",
    );
  });
});

describe("o metadado é enriquecimento, e a exibição degrada", () => {
  it("sem metadado exibe o link cru, e não some da tela", () => {
    // Provedor fora do ar não pode segurar salvamento no admin nem carregamento do telão (verificação 4 da spec).
    expect(exibirMusica(link(FAIXA_SPOTIFY), null)).toEqual({
      rotulo: FAIXA_SPOTIFY,
      url: FAIXA_SPOTIFY,
      capaUrl: null,
      resolvida: false,
    });
  });

  it("título vazio conta como metadado ausente", () => {
    const exibicao = exibirMusica(link(FAIXA_SPOTIFY), {
      titulo: "   ",
      artista: "Alguém",
      capaUrl: "https://cdn.exemplo/capa.jpg",
    });

    expect(exibicao.resolvida).toBe(false);
    expect(exibicao.rotulo).toBe(FAIXA_SPOTIFY);
  });

  it("junta título e artista, e aceita artista ausente", () => {
    expect(
      exibirMusica(link(FAIXA_SPOTIFY), {
        titulo: "A música",
        artista: "Alguém",
        capaUrl: null,
      }).rotulo,
    ).toBe("A música — Alguém");

    expect(
      exibirMusica(link(FAIXA_SPOTIFY), { titulo: "A música", artista: null, capaUrl: null })
        .rotulo,
    ).toBe("A música");
  });

  it("capa que não é https vira ausente", () => {
    for (const capaUrl of ["data:image/png;base64,AAAA", "javascript:alert(1)", "capa.jpg"]) {
      expect(
        exibirMusica(link(FAIXA_SPOTIFY), { titulo: "A música", artista: null, capaUrl })
          .capaUrl,
      ).toBeNull();
    }
  });
});

describe("a fronteira do ADR 0011", () => {
  it("está declarada, e o que ela declara é que não produzimos áudio", () => {
    expect(FRONTEIRA_ADR_0011.produzArquivoComAudio).toBe(false);
    expect(FRONTEIRA_ADR_0011.saidaPermitida).toEqual(["imagem", "texto", "link"]);
  });

  it("recusa saída com faixa de áudio ou vídeo", () => {
    // Camada 3: vídeo com a foto do convidado e a música embutida é obra derivada com sincronização, e sincronização exige direito que não temos.
    for (const mime of ["audio/mpeg", "audio/mp4", "video/mp4", "video/quicktime"]) {
      expect(validarSaida({ mime, musica: null })).toEqual({
        code: "musica.midia_com_audio",
        details: { mime },
      });
    }
  });

  it("o portão é o conjunto fechado de mídia, não a lista de áudios conhecidos", () => {
    // Sem isto, um contêiner novo com trilha de áudio passaria só por não estar na lista de proibidos.
    expect(validarSaida({ mime: "application/octet-stream", musica: null })).toEqual({
      code: "musica.saida_nao_e_imagem",
      details: { mime: "application/octet-stream" },
    });
  });

  it("imagem com texto e link passa", () => {
    const sugestao = montarSugestaoDeCompartilhamento({
      link: link(FAIXA_SPOTIFY),
      metadado: { titulo: "A música", artista: "Alguém", capaUrl: null },
    });

    expect(validarSaida({ mime: "image/jpeg", musica: sugestao })).toBeNull();
  });

  it("campo fora do contrato da sugestão é recusado", () => {
    // É por onde a camada 3 entraria sem ninguém notar: um `audioUrl` no objeto que o compartilhamento serializa.
    const contrabando = {
      provedor: "spotify",
      rotulo: "A música — Alguém",
      url: FAIXA_SPOTIFY,
      audioUrl: "https://cdn.exemplo/faixa.mp3",
    } as unknown as SugestaoDeCompartilhamento;

    expect(validarSaida({ mime: "image/jpeg", musica: contrabando })).toEqual({
      code: "musica.campo_fora_do_contrato",
      details: { campo: "audioUrl" },
    });
  });

  it("a sugestão tem três campos, e nenhum deles carrega bytes", () => {
    const sugestao = montarSugestaoDeCompartilhamento({
      link: link(FAIXA_SPOTIFY),
      metadado: { titulo: "A música", artista: "Alguém", capaUrl: null },
    });

    expect(Object.keys(sugestao ?? {}).sort()).toEqual([...CAMPOS_DA_SUGESTAO].sort());
    expect(sugestao).toEqual({
      provedor: "spotify",
      rotulo: "A música — Alguém",
      url: FAIXA_SPOTIFY,
    });
  });

  it("evento sem música configurada não vira buraco: devolve nada", () => {
    expect(montarSugestaoDeCompartilhamento(null)).toBeNull();
    expect(validarSaida({ mime: "image/jpeg", musica: null })).toBeNull();
  });
});

describe("sugestão do convidado", () => {
  const ABERTO: GateDeInteracao = { interacaoAbreEm: new Date("2026-08-11T22:00:00Z") };
  const DEPOIS = new Date("2026-08-11T23:00:00Z");
  const ANTES = new Date("2026-08-11T21:00:00Z");

  function enfileirar(
    fila: readonly FaixaSugerida[],
    sessaoId: string,
    colado: string,
    agora: Date = DEPOIS,
  ): FaixaSugerida[] {
    const resultado = registrarSugestao(fila, { sessaoId, link: link(colado) }, ABERTO, agora);
    if (!resultado.ok) throw new Error(`esperava aceite: ${resultado.erro.code}`);
    return resultado.fila;
  }

  it("gate fechado recusa, e gate nunca configurado também", () => {
    // ADR 0009: quem decide quando a interação abre são os anfitriões, e `interacaoAbreEm === null` é fechado — falha fechada, não padrão aberto.
    const pedido = { sessaoId: "ses_1", link: link(FAIXA_SPOTIFY) };

    expect(registrarSugestao([], pedido, ABERTO, ANTES)).toEqual({
      ok: false,
      erro: { code: "musica.interacao_fechada", details: {} },
    });
    expect(registrarSugestao([], pedido, { interacaoAbreEm: null }, DEPOIS)).toEqual({
      ok: false,
      erro: { code: "musica.interacao_fechada", details: {} },
    });
  });

  it("a mesma faixa vinda de dez pessoas é uma linha com dez votos", () => {
    let fila: FaixaSugerida[] = [];
    for (let i = 0; i < 10; i += 1) {
      fila = enfileirar(fila, `ses_${i}`, FAIXA_SPOTIFY);
    }

    expect(fila).toHaveLength(1);
    expect(votos(fila[0] as FaixaSugerida)).toBe(10);
  });

  it("a mesma sessão sugerindo duas vezes continua valendo um voto", () => {
    // Idempotente por `(chave, sessaoId)`, pelo mesmo motivo da reação: toque duplo e retry de rede não podem inflar contagem.
    const fila = enfileirar(enfileirar([], "ses_1", FAIXA_SPOTIFY), "ses_1", FAIXA_SPOTIFY);

    expect(fila).toHaveLength(1);
    expect(votos(fila[0] as FaixaSugerida)).toBe(1);
  });

  it("o mesmo link em formatos diferentes é a mesma faixa", () => {
    // Um convidado cola o link com `?si=`, outro cola com prefixo de idioma. Se a chave saísse da URL colada, seriam duas linhas da mesma música.
    const fila = enfileirar(
      enfileirar([], "ses_1", `${FAIXA_SPOTIFY}?si=abc123`),
      "ses_2",
      "https://open.spotify.com/intl-pt/track/4cOdK2wGLETKBW3PvgPWqT",
    );

    expect(fila).toHaveLength(1);
    expect(votos(fila[0] as FaixaSugerida)).toBe(2);
  });

  it("faixas diferentes do mesmo provedor não se fundem", () => {
    const fila = enfileirar(
      enfileirar([], "ses_1", FAIXA_SPOTIFY),
      "ses_2",
      "https://open.spotify.com/track/37i9dQZF1DXcBWIGoYBM5M",
    );

    expect(fila).toHaveLength(2);
  });

  it("a chave separa provedor, tipo e identificador", () => {
    expect(chaveDaFaixa(link(FAIXA_SPOTIFY))).toBe("spotify:faixa:4cOdK2wGLETKBW3PvgPWqT");
  });

  it("ordena por votos, e empate desempata pela que chegou antes", () => {
    // Sem desempate estável a lista se reordena sozinha entre dois desenhos com os mesmos dados — no telão isso é linha pulando sem ninguém votar.
    let fila = enfileirar([], "ses_1", FAIXA_SPOTIFY, new Date("2026-08-11T23:00:00Z"));
    fila = enfileirar(
      fila,
      "ses_2",
      "https://www.deezer.com/br/track/3135556",
      new Date("2026-08-11T23:05:00Z"),
    );
    fila = enfileirar(
      fila,
      "ses_3",
      "https://music.youtube.com/watch?v=dQw4w9WgXcQ",
      new Date("2026-08-11T23:10:00Z"),
    );
    fila = enfileirar(fila, "ses_4", "https://www.deezer.com/br/track/3135556");

    const ordenada = ordenarSugestoes(fila);
    expect(ordenada.map((f) => f.chave)).toEqual([
      "deezer:faixa:3135556",
      "spotify:faixa:4cOdK2wGLETKBW3PvgPWqT",
      "youtube-music:faixa:dQw4w9WgXcQ",
    ]);
    expect(ordenarSugestoes(ordenada)).toEqual(ordenada);
  });

  it("ordenar não mexe na fila recebida", () => {
    const fila = enfileirar([], "ses_1", FAIXA_SPOTIFY);
    const copia = [...fila];
    ordenarSugestoes(fila);

    expect(fila).toEqual(copia);
  });
});

describe("o teto de sugestões por convidado", () => {
  const aberto = { interacaoAbreEm: new Date("2026-08-11T20:00:00Z") };
  const agora = new Date("2026-08-11T23:00:00Z");

  function sugerir(fila: FaixaSugerida[], sessaoId: string, id: string) {
    const lido = lerLinkDeMusica(`https://open.spotify.com/track/${id}`);
    if (!lido.ok) throw new Error("link de teste inválido");
    return registrarSugestao(fila, { sessaoId, link: lido.link }, aberto, agora);
  }

  it("aceita até o teto e recusa a seguinte", () => {
    // Sem teto, um entusiasta sozinho é dono da lista e os outros param de sugerir porque não adianta.
    let fila: FaixaSugerida[] = [];
    for (let i = 0; i < TETO_DE_SUGESTOES_POR_SESSAO; i += 1) {
      const r = sugerir(fila, "s1", `4cOdK2wGLETKBW3PvgPWq${i}`);
      expect(r.ok).toBe(true);
      if (r.ok) fila = r.fila;
    }

    const estourou = sugerir(fila, "s1", "4cOdK2wGLETKBW3PvgPWqZ");
    expect(estourou.ok).toBe(false);
    if (!estourou.ok) expect(estourou.erro.code).toBe("musica.teto_de_sugestoes");
  });

  it("votar em faixa que já existe não conta contra o teto", () => {
    // Contar voto puniria quem concorda — e é a concordância que faz a lista convergir em vez de virar cem faixas de uma vez cada.
    let fila: FaixaSugerida[] = [];
    for (let i = 0; i < TETO_DE_SUGESTOES_POR_SESSAO; i += 1) {
      const r = sugerir(fila, "s1", `4cOdK2wGLETKBW3PvgPWq${i}`);
      if (r.ok) fila = r.fila;
    }

    const outra = sugerir(fila, "s2", "4cOdK2wGLETKBW3PvgPWq0");
    expect(outra.ok).toBe(true);
    if (outra.ok) {
      const votou = sugerir(outra.fila, "s1", "4cOdK2wGLETKBW3PvgPWq0");
      expect(votou.ok).toBe(true);
    }
  });

  it("o teto é por sessão, não da festa", () => {
    let fila: FaixaSugerida[] = [];
    for (let i = 0; i < TETO_DE_SUGESTOES_POR_SESSAO; i += 1) {
      const r = sugerir(fila, "s1", `4cOdK2wGLETKBW3PvgPWq${i}`);
      if (r.ok) fila = r.fila;
    }

    expect(sugerir(fila, "s2", "4cOdK2wGLETKBW3PvgPWqZ").ok).toBe(true);
  });
});
