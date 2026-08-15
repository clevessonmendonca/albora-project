import { describe, expect, it } from "vitest";
import { TETO_DE_SUGESTOES_POR_SESSAO } from "@albora/core";
import { mensagemDaSugestao, rotuloDoProvedor, rotuloDoTipo } from "./sugestao-na-tela";

describe("mensagemDaSugestao", () => {
  it("usa o teto que a API mandou, e o do núcleo se faltar", () => {
    expect(mensagemDaSugestao("musica.teto_de_sugestoes", { teto: 3 })).toBe(
      "Você já sugeriu 3 faixas. Pode votar nas que já estão na lista.",
    );
    expect(mensagemDaSugestao("musica.teto_de_sugestoes")).toContain(
      String(TETO_DE_SUGESTOES_POR_SESSAO),
    );
  });

  it("repete a copy do handler no gate fechado", () => {
    expect(mensagemDaSugestao("musica.interacao_fechada")).toBe(
      "A interação ainda não abriu",
    );
  });

  it("link recusado aponta os provedores que o núcleo aceita", () => {
    expect(mensagemDaSugestao("musica.provedor_fora_da_lista")).toMatch(/Spotify/);
    expect(mensagemDaSugestao("musica.url_ilegivel")).toMatch(/Link não aceito/);
    expect(mensagemDaSugestao("validation_error")).toBe("Cole o link da faixa");
  });

  it("código desconhecido não vaza interno", () => {
    expect(mensagemDaSugestao("erro.interno")).toBe("Não deu agora. Tente de novo.");
  });
});

describe("rótulos na lista", () => {
  it("nomeia o provedor e o tipo em PT-BR", () => {
    expect(rotuloDoProvedor("youtube-music")).toBe("YouTube Music");
    expect(rotuloDoTipo("album")).toBe("álbum");
  });

  it("provedor fora da lista não inventa nome", () => {
    expect(rotuloDoProvedor("bandcamp")).toBe("bandcamp");
  });
});
