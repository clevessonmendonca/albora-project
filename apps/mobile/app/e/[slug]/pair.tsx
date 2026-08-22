import { Redirect, useLocalSearchParams } from "expo-router";

/** Universal link cai aqui; a lógica de resgate fica centralizada em `/pair`. */
export default function UniversalPairEntry() {
  const { codigo } = useLocalSearchParams<{ codigo?: string | string[] }>();
  const raw = Array.isArray(codigo) ? codigo[0] : codigo;
  const q = typeof raw === "string" && raw.length > 0 ? `?codigo=${encodeURIComponent(raw)}` : "";
  return <Redirect href={`/pair${q}`} />;
}
