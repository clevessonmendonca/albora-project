import type { ModeloDeTelao } from "@albora/core";

export type ItemApi = {
  id: string;
  autor: string;
  mime: string;
  criadaEm: string;
  reacoes: number;
  thumb: string;
  full: string;
  expiraEm: number;
};

export type Cena = { modelo: ModeloDeTelao; ids: string[] };

export type FaseWall = "pareando" | "exibindo";

export const POLL_PAREAMENTO_MS = 3_000;
export const POLL_MIDIA_MS = 6_000;
export const ROTACAO_MS = 8_000;
export const FOLGA_DE_RENOVACAO_MS = 90_000;

export const SHELL =
  "fixed inset-0 overflow-hidden bg-bg font-corpo text-ink";
