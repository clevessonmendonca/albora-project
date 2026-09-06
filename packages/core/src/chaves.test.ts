import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  chaveExportValida,
  chaveImagemCapaValida,
  chaveRecadoValida,
  chaveThumbDeFull,
  derivarChaveExport,
  derivarChaveImagemCapa,
  derivarChaveMidia,
  derivarChaveRecado,
  prefixoDoEvento,
} from "./chaves";

const EVENTO = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const OUTRO = "ffffffff-bbbb-cccc-dddd-eeeeeeeeeeee";
const UUID = "11111111-2222-3333-4444-555555555555";

describe("a chave do recado é derivada no servidor", () => {
  it("mora em events/{id}/recado/{uuid}", () => {
    expect(derivarChaveRecado(EVENTO, UUID)).toBe(`events/${EVENTO}/recado/${UUID}`);
  });

  it("aceita só a forma que derivarChaveRecado produz", () => {
    expect(chaveRecadoValida(EVENTO, derivarChaveRecado(EVENTO, UUID))).toBe(true);
  });

  it("recusa chave de outro evento e chave de foto de convidado", () => {
    expect(chaveRecadoValida(EVENTO, derivarChaveRecado(OUTRO, UUID))).toBe(false);
    expect(chaveRecadoValida(EVENTO, `${prefixoDoEvento(EVENTO)}2026/08/${UUID}/full`)).toBe(false);
    expect(chaveRecadoValida(EVENTO, `events/${EVENTO}/recado/nao-e-uuid`)).toBe(false);
    expect(chaveRecadoValida(EVENTO, `events/${EVENTO}/recado/${UUID}/extra`)).toBe(false);
  });
});

describe("a chave do ZIP de export é derivada no servidor", () => {
  it("mora em events/{id}/export/{job}.zip", () => {
    expect(derivarChaveExport(EVENTO, UUID)).toBe(`events/${EVENTO}/export/${UUID}.zip`);
  });

  it("recusa chave de outro evento, foto de convidado e travessia", () => {
    expect(chaveExportValida(EVENTO, derivarChaveExport(EVENTO, UUID))).toBe(true);
    expect(chaveExportValida(EVENTO, derivarChaveExport(OUTRO, UUID))).toBe(false);
    expect(chaveExportValida(EVENTO, `${prefixoDoEvento(EVENTO)}2026/08/${UUID}/full`)).toBe(false);
    expect(chaveExportValida(EVENTO, `events/${EVENTO}/export/../${UUID}.zip`)).toBe(false);
  });
});

describe("a chave da mídia do convidado é derivada no servidor (nunca informada pelo cliente)", () => {
  beforeEach(() => {
    // Congela o relógio pra travar ano/mês na chave sem depender da data em que o teste roda.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("mora em events/{id}/{ano}/{mes}/{uuid}/{variante}, ano e mês vêm do relógio do servidor", () => {
    expect(derivarChaveMidia(EVENTO, UUID, "full")).toBe(`events/${EVENTO}/2026/08/${UUID}/full`);
    expect(derivarChaveMidia(EVENTO, UUID, "thumb")).toBe(`events/${EVENTO}/2026/08/${UUID}/thumb`);
  });

  it("mês vira 2 dígitos mesmo em janeiro (padStart)", () => {
    vi.setSystemTime(new Date("2026-01-05T00:00:00.000Z"));
    expect(derivarChaveMidia(EVENTO, UUID, "full")).toBe(`events/${EVENTO}/2026/01/${UUID}/full`);
  });

  it("evento diferente muda o prefixo — a chave nunca é escolhida pelo cliente", () => {
    expect(derivarChaveMidia(EVENTO, UUID, "full")).not.toBe(derivarChaveMidia(OUTRO, UUID, "full"));
  });
});

describe("a chave da imagem de capa é derivada no servidor, uma por evento", () => {
  it("mora em events/{id}/cover/image", () => {
    expect(derivarChaveImagemCapa(EVENTO)).toBe(`events/${EVENTO}/cover/image`);
  });

  it("aceita só a forma que derivarChaveImagemCapa produz para aquele evento", () => {
    expect(chaveImagemCapaValida(EVENTO, derivarChaveImagemCapa(EVENTO))).toBe(true);
  });

  it("recusa evento malformado, chave de outro evento e chave de foto de convidado", () => {
    expect(chaveImagemCapaValida("nao-e-uuid", `events/nao-e-uuid/cover/image`)).toBe(false);
    expect(chaveImagemCapaValida(EVENTO, derivarChaveImagemCapa(OUTRO))).toBe(false);
    expect(chaveImagemCapaValida(EVENTO, `${prefixoDoEvento(EVENTO)}2026/08/${UUID}/full`)).toBe(false);
  });
});

describe("a chave da thumb deriva da chave da full já persistida", () => {
  it("troca o sufixo /full por /thumb", () => {
    expect(chaveThumbDeFull(`events/${EVENTO}/2026/08/${UUID}/full`)).toBe(
      `events/${EVENTO}/2026/08/${UUID}/thumb`,
    );
  });

  it("entrada malformada (sem sufixo /full) apenas acrescenta /thumb, sem derrubar a chave", () => {
    expect(chaveThumbDeFull(`events/${EVENTO}/2026/08/${UUID}`)).toBe(
      `events/${EVENTO}/2026/08/${UUID}/thumb`,
    );
  });
});
