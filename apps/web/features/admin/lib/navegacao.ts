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
  /** A rota que o destino abre. */
  suffix: string;
  /** Rotas que pertencem a este destino sem ter item próprio. Sem elas, a navegação não marca nada quando o anfitrião está numa delas. */
  absorve: readonly string[];
};

export const DESTINOS: readonly Destino[] = [
  { id: "inicio", rotulo: "Início", suffix: "", absorve: ["/pre-event"] },
  { id: "fotos", rotulo: "Fotos", suffix: "/album", absorve: ["/moderation"] },
  { id: "convidados", rotulo: "Convidados", suffix: "/guests", absorve: ["/insights"] },
  {
    id: "experiencia",
    rotulo: "Experiência",
    suffix: "/identity",
    absorve: ["/missions", "/guestbook"],
  },
  { id: "compartilhar", rotulo: "Compartilhar", suffix: "/qrcode", absorve: [] },
  { id: "ajustes", rotulo: "Ajustes", suffix: "/evento", absorve: ["/consent", "/team"] },
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
