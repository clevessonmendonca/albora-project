export type DestinoId =
  | "inicio"
  | "convidados"
  | "album"
  | "telao"
  | "missoes"
  | "insights"
  | "comunidade"
  | "inspiracao"
  | "identidade"
  | "convite"
  | "configuracoes";

export type GrupoId = "evento" | "descobrir" | "personalizacao";

export type Destino = {
  id: DestinoId;
  rotulo: string;
  grupo: GrupoId;
  /** A rota que o destino abre. */
  suffix: string;
  /** Rotas que caem neste destino — mantêm o item marcado e alimentam os redirects. */
  absorve: readonly string[];
};

export const GRUPOS: readonly { id: GrupoId; rotulo: string }[] = [
  { id: "evento", rotulo: "Seu evento" },
  { id: "descobrir", rotulo: "Descobrir" },
  { id: "personalizacao", rotulo: "Personalização" },
];

export const DESTINOS: readonly Destino[] = [
  { id: "inicio", rotulo: "Visão geral", grupo: "evento", suffix: "", absorve: ["/pre-event"] },
  { id: "convidados", rotulo: "Convidados", grupo: "evento", suffix: "/guests", absorve: [] },
  { id: "album", rotulo: "Álbum", grupo: "evento", suffix: "/album", absorve: ["/moderation"] },
  { id: "telao", rotulo: "Telão ao vivo", grupo: "evento", suffix: "/telao", absorve: [] },
  {
    id: "missoes",
    rotulo: "Missões",
    grupo: "evento",
    suffix: "/missions",
    absorve: ["/guestbook", "/experiencia"],
  },
  { id: "insights", rotulo: "Insights", grupo: "evento", suffix: "/insights", absorve: [] },
  { id: "comunidade", rotulo: "Comunidade", grupo: "descobrir", suffix: "/comunidade", absorve: [] },
  { id: "inspiracao", rotulo: "Inspiração", grupo: "descobrir", suffix: "/inspiracao", absorve: [] },
  {
    id: "identidade",
    rotulo: "Identidade",
    grupo: "personalizacao",
    suffix: "/identity",
    absorve: [],
  },
  { id: "convite", rotulo: "QR e convite", grupo: "personalizacao", suffix: "/qrcode", absorve: [] },
  {
    id: "configuracoes",
    rotulo: "Configurações",
    grupo: "personalizacao",
    suffix: "/ajustes",
    absorve: ["/consent"],
  },
];

/** A seleção fixa da barra inferior do mobile: quatro destinos + "Mais", que abre o menu inteiro. */
export const DESTINOS_MOBILE: readonly DestinoId[] = [
  "inicio",
  "album",
  "comunidade",
  "inspiracao",
];

export function destinosDoGrupo(grupo: GrupoId): readonly Destino[] {
  return DESTINOS.filter((destino) => destino.grupo === grupo);
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
