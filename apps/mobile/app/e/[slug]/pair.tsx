import { Redirect, useLocalSearchParams } from "expo-router";

/** Universal link cai aqui; a lógica de resgate fica centralizada em `/pair`. */
export default function UniversalPairEntry() {
  const { codigo, passagem } = useLocalSearchParams<{
    codigo?: string | string[];
    passagem?: string | string[];
  }>();

  const params = new URLSearchParams();
  const passagemRaw = Array.isArray(passagem) ? passagem[0] : passagem;
  const codigoRaw = Array.isArray(codigo) ? codigo[0] : codigo;
  if (typeof passagemRaw === "string" && passagemRaw.length > 0) {
    params.set("passagem", passagemRaw);
  } else if (typeof codigoRaw === "string" && codigoRaw.length > 0) {
    params.set("codigo", codigoRaw);
  }

  const q = params.toString();
  return <Redirect href={q.length > 0 ? `/pair?${q}` : "/pair"} />;
}
