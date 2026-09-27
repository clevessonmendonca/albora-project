export type DestinoId =
  | "inicio"
  | "fotos"
  | "convidados"
  | "experiencia"
  | "compartilhar"
  | "ajustes"
  | "comunidade"
  | "inspiracao";

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
  { id: "comunidade", rotulo: "Comunidade", suffix: "/comunidade", absorve: [] },
  { id: "inspiracao", rotulo: "Inspiração", suffix: "/inspiracao", absorve: [] },
  { id: "ajustes", rotulo: "Ajustes", suffix: "/evento", absorve: ["/consent", "/team"] },
];

export type GrupoDeDestino = {
  /** Versalete acima do bloco, como o §3 pede para rótulo. */
  rotulo: string;
  destinos: readonly DestinoId[];
};

/**
 * O rail agrupa; a bottom-bar não.
 *
 * Seis itens soltos numa coluna não dizem qual se olha durante a festa e qual
 * se decide antes dela. No celular o agrupamento não cabe — rótulo de grupo
 * custa altura que a bottom-bar não tem, e ali a lista curta já é legível.
 */
export const GRUPOS_DE_DESTINO: readonly GrupoDeDestino[] = [
  { rotulo: "Seu evento", destinos: ["inicio", "fotos", "convidados"] },
  { rotulo: "Descobrir", destinos: ["comunidade", "inspiracao"] },
  { rotulo: "Personalização", destinos: ["experiencia", "compartilhar", "ajustes"] },
];

export function destinoDe(id: DestinoId): Destino | undefined {
  return DESTINOS.find((d) => d.id === id);
}

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
