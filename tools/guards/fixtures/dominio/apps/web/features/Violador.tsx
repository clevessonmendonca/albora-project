import { CASAMENTO } from "@albora/packs";

export function ProvaQr() {
  return <p>Teste com 3 celulares antes do casamento.</p>;
}

/* ── daqui para baixo, a forma CERTA: não pode ser reprovada ── */

export function PorVocabulario() {
  return <p>{CASAMENTO.vocabulario["prova-qr.aviso"]}</p>;
}
