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

/**
 * De quem é o dado que o destino abre.
 *
 * `conta` existe porque Comunidade e Inspiração são do anfitrião, não do
 * evento (ADR 0017): o mesmo feed aparece igual em qualquer evento dele.
 * Pendurá-las em `/admin/e/{id}/…` faria a URL prometer um escopo que os
 * dados não têm.
 */
export type EscopoDoDestino = "evento" | "conta";

export type Destino = {
  id: DestinoId;
  rotulo: string;
  grupo: GrupoId;
  escopo: EscopoDoDestino;
  /** Sufixo depois da raiz do escopo: a do evento, ou `/admin`. */
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
  { id: "inicio", rotulo: "Visão geral", grupo: "evento", escopo: "evento", suffix: "", absorve: ["/pre-event"] },
  { id: "convidados", rotulo: "Convidados", grupo: "evento", escopo: "evento", suffix: "/guests", absorve: [] },
  { id: "album", rotulo: "Álbum", grupo: "evento", escopo: "evento", suffix: "/album", absorve: ["/moderation"] },
  { id: "telao", rotulo: "Telão ao vivo", grupo: "evento", escopo: "evento", suffix: "/telao", absorve: [] },
  {
    id: "missoes",
    rotulo: "Missões",
    grupo: "evento",
    escopo: "evento",
    suffix: "/missions",
    absorve: ["/guestbook", "/experiencia"],
  },
  { id: "insights", rotulo: "Insights", grupo: "evento", escopo: "evento", suffix: "/insights", absorve: [] },
  { id: "comunidade", rotulo: "Comunidade", grupo: "descobrir", escopo: "conta", suffix: "/comunidade", absorve: [] },
  { id: "inspiracao", rotulo: "Inspiração", grupo: "descobrir", escopo: "conta", suffix: "/inspiracao", absorve: [] },
  {
    id: "identidade",
    rotulo: "Identidade",
    grupo: "personalizacao",
    escopo: "evento",
    suffix: "/identity",
    absorve: [],
  },
  { id: "convite", rotulo: "QR e convite", grupo: "personalizacao", escopo: "evento", suffix: "/qrcode", absorve: [] },
  {
    id: "configuracoes",
    rotulo: "Configurações",
    grupo: "personalizacao",
    escopo: "evento",
    suffix: "/ajustes",
    absorve: ["/consent"],
  },
];

export const RAIZ_DA_CONTA = "/admin";

/** Quatro destinos + "Mais" na barra inferior do mobile. */
export const DESTINOS_MOBILE: readonly DestinoId[] = [
  "inicio",
  "album",
  "comunidade",
  "inspiracao",
];

export function destinosDoGrupo(grupo: GrupoId): readonly Destino[] {
  return DESTINOS.filter((destino) => destino.grupo === grupo);
}

/** Os grupos que fazem sentido no escopo atual: sem evento escolhido, só o que é da conta. */
export function gruposVisiveis(temEvento: boolean): readonly { id: GrupoId; rotulo: string }[] {
  if (temEvento) return GRUPOS;
  return GRUPOS.filter((g) => destinosDoGrupo(g.id).some((d) => d.escopo === "conta"));
}

export function destinosVisiveis(grupo: GrupoId, temEvento: boolean): readonly Destino[] {
  const doGrupo = destinosDoGrupo(grupo);
  return temEvento ? doGrupo : doGrupo.filter((d) => d.escopo === "conta");
}

/** O href do destino. `base` é a raiz do evento; destino de conta ignora ela. */
export function hrefDoDestino(destino: Destino, base: string): string {
  return destino.escopo === "conta"
    ? `${RAIZ_DA_CONTA}${destino.suffix}`
    : `${base}${destino.suffix}`;
}

function casa(pathname: string, rota: string): boolean {
  return pathname === rota || pathname.startsWith(`${rota}/`);
}

function limpar(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

/**
 * O destino marcado. Destino de conta é avaliado **antes** do escopo do evento:
 * ele vale em qualquer lugar do painel, inclusive dentro de um evento.
 */
export function destinoAtivo(pathname: string, base: string): DestinoId | null {
  const limpo = limpar(pathname);

  for (const destino of DESTINOS) {
    if (destino.escopo !== "conta") continue;
    if (casa(limpo, `${RAIZ_DA_CONTA}${destino.suffix}`)) return destino.id;
  }

  if (!casa(limpo, base)) return null;

  for (const destino of DESTINOS) {
    if (destino.escopo !== "evento") continue;
    const rotas = [...(destino.suffix ? [destino.suffix] : []), ...destino.absorve];
    if (rotas.some((r) => casa(limpo, `${base}${r}`))) return destino.id;
  }

  return limpo === base ? "inicio" : null;
}
