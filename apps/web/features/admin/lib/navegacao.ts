export type DestinoId =
  | "inicio"
  | "fotos"
  | "convidados"
  | "experiencia"
  | "compartilhar"
  | "ajustes";

export type Destino = {
  id: DestinoId;
  rotulo: string;
  /** A rota que o destino abre hoje. */
  suffix: string;
  /** Rotas que este destino vai absorver nas ondas seguintes; até lá, mantêm o item marcado. */
  absorve: readonly string[];
};

export const DESTINOS: readonly Destino[] = [
  { id: "inicio", rotulo: "Início", suffix: "", absorve: ["/pre-event"] },
  { id: "fotos", rotulo: "Fotos", suffix: "/album", absorve: ["/moderation"] },
  { id: "convidados", rotulo: "Convidados", suffix: "/guests", absorve: ["/insights"] },
  {
    id: "experiencia",
    rotulo: "Experiência",
    suffix: "/experiencia",
    absorve: ["/identity", "/missions", "/guestbook"],
  },
  { id: "compartilhar", rotulo: "Compartilhar", suffix: "/qrcode", absorve: [] },
  { id: "ajustes", rotulo: "Ajustes", suffix: "/consent", absorve: [] },
];

function casa(pathname: string, rota: string): boolean {
  return pathname === rota || pathname.startsWith(`${rota}/`);
}

export function destinoAtivo(pathname: string, base: string): DestinoId | null {
  const limpo =
    pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  if (!casa(limpo, base)) return null;

  for (const destino of DESTINOS) {
    const rotas = [...(destino.suffix ? [destino.suffix] : []), ...destino.absorve];
    if (rotas.some((r) => casa(limpo, `${base}${r}`))) return destino.id;
  }

  return limpo === base ? "inicio" : null;
}
