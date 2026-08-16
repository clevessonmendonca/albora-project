import { describe, expect, it } from "vitest";
import { TETO_DE_SUGESTOES_POR_SESSAO } from "@albora/core";
import { providerLabel, suggestionMessage, typeLabel, suggestionLabel } from "./suggestion-copy";

describe("suggestionMessage", () => {
  it("usa o teto que a API mandou, e o do núcleo se faltar", () => {
    expect(suggestionMessage("musica.teto_de_sugestoes", { teto: 3 })).toBe(
      "Você já sugeriu 3 faixas. Pode votar nas que já estão na lista.",
    );
    expect(suggestionMessage("musica.teto_de_sugestoes")).toContain(
      String(TETO_DE_SUGESTOES_POR_SESSAO),
    );
  });

  it("repete a copy do handler no gate fechado", () => {
    expect(suggestionMessage("musica.interacao_fechada")).toBe(
      "A interação ainda não abriu",
    );
  });

  it("link recusado aponta os provedores que o núcleo aceita", () => {
    expect(suggestionMessage("musica.provedor_fora_da_lista")).toMatch(/Spotify/);
    expect(suggestionMessage("musica.url_ilegivel")).toMatch(/Link não aceito/);
    expect(suggestionMessage("validation_error")).toBe("Cole o link da faixa");
  });

  it("código desconhecido não vaza interno", () => {
    expect(suggestionMessage("erro.interno")).toBe("Não deu agora. Tente de novo.");
  });
});

describe("rótulos na lista", () => {
  it("nomeia o provedor e o tipo em PT-BR", () => {
    expect(providerLabel("youtube-music")).toBe("YouTube Music");
    expect(typeLabel("album")).toBe("álbum");
  });

  it("provedor fora da lista não inventa nome", () => {
    expect(providerLabel("bandcamp")).toBe("bandcamp");
  });

  it("prefere título e artista; sem metadado cai no provedor · tipo", () => {
    expect(
      suggestionLabel({
        provedor: "spotify",
        tipo: "faixa",
        titulo: "Perfect",
        artista: "Ed Sheeran",
      }),
    ).toBe("Perfect — Ed Sheeran");
    expect(
      suggestionLabel({ provedor: "spotify", tipo: "faixa", titulo: "Perfect", artista: null }),
    ).toBe("Perfect");
    expect(suggestionLabel({ provedor: "spotify", tipo: "faixa" })).toBe("Spotify · faixa");
  });
});
