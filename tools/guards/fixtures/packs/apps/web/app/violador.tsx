import { CASAMENTO } from "@albora/packs";

export function Heroi() {
  return <h1>O álbum do seu casamento</h1>;
}

/* ── daqui para baixo, as formas CERTAS: nada disto pode ser reprovado ── */

export function PorVocabulario() {
  return <h1>{CASAMENTO.vocabulario["landing.titulo"]}</h1>;
}
