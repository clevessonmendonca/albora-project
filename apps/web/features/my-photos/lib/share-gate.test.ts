import { VERSAO_DO_CONSENTIMENTO_EXTERNO } from "@albora/core";
import { describe, expect, it } from "vitest";
import {
  mapExternalConsent,
  shareMessage,
  needsExternalConsent,
} from "./share-gate";

const AGORA = new Date("2026-08-15T20:00:00.000Z");

describe("needsExternalConsent", () => {
  it("sem aceite, o sheet abre antes da folha nativa", () => {
    expect(needsExternalConsent(null, AGORA)).toBe(true);
  });

  it("aceite vigente libera o share", () => {
    const consentimento = mapExternalConsent({
      versao: VERSAO_DO_CONSENTIMENTO_EXTERNO,
      em: "2026-08-15T19:00:00.000Z",
      revogadoEm: null,
      nomeNaMoldura: true,
    });
    expect(needsExternalConsent(consentimento, AGORA)).toBe(false);
  });

  it("versão velha, sem data ou revogado pedem de novo", () => {
    expect(
      needsExternalConsent(
        mapExternalConsent({
          versao: "externo-v0",
          em: "2026-08-15T19:00:00.000Z",
          revogadoEm: null,
          nomeNaMoldura: false,
        }),
        AGORA,
      ),
    ).toBe(true);

    expect(
      needsExternalConsent(
        {
          versao: VERSAO_DO_CONSENTIMENTO_EXTERNO,
          em: new Date("invalid"),
          revogadoEm: null,
          nomeNaMoldura: true,
        },
        AGORA,
      ),
    ).toBe(true);

    expect(
      needsExternalConsent(
        mapExternalConsent({
          versao: VERSAO_DO_CONSENTIMENTO_EXTERNO,
          em: "2026-08-15T18:00:00.000Z",
          revogadoEm: "2026-08-15T19:30:00.000Z",
          nomeNaMoldura: true,
        }),
        AGORA,
      ),
    ).toBe(true);
  });
});

describe("shareMessage", () => {
  it("cada recusa da spec tem copy em PT-BR, não o código cru", () => {
    expect(shareMessage("compartilhar.desligado_pelo_anfitriao")).toMatch(/festa/);
    expect(shareMessage("compartilhar.sem_consentimento_externo")).toMatch(/aceitar/);
    expect(shareMessage("compartilhar.bloqueado_pela_moderacao")).toMatch(/ainda não/);
    expect(shareMessage("compartilhar.nao_e_autor")).toMatch(/suas/);
    expect(shareMessage("compartilhar.colagem_vazia")).toMatch(/colagem/);
  });
});
