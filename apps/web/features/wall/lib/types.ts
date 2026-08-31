import type { WallDisplayModel } from "@albora/core";

export type ItemApi = {
  id: string;
  autor: string;
  mime: string;
  criadaEm: string;
  reacoes: number;
  thumb: string;
  full: string;
  expiraEm: number;
  largura?: number;
  altura?: number;
};

export type Cena = { modelo: WallDisplayModel; ids: string[] };

/** O contador público (spec A4) — só fotos publicadas e convidados do evento corrente. */
export type ContadoresDaParede = { fotos: number; convidados: number };

export type FaseWall = "pareando" | "exibindo";

export const POLL_PAREAMENTO_MS = 3_000;
export const POLL_MIDIA_MS = 6_000;
export const ROTACAO_MS = 8_000;
export const FOLGA_DE_RENOVACAO_MS = 90_000;

export const SHELL =
  "fixed inset-0 overflow-hidden bg-bg font-corpo text-ink";
