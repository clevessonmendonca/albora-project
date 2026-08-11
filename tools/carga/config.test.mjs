import { describe, expect, it } from "vitest";
import { ehLocal, ErroDeConfig, guardarAlvo, lerConfig } from "./config.mjs";

describe("guardarAlvo", () => {
  it("deixa passar localhost sem confirmação", () => {
    expect(() => guardarAlvo("http://localhost:3000", undefined)).not.toThrow();
    expect(() => guardarAlvo("http://127.0.0.1:3000", undefined)).not.toThrow();
    expect(() => guardarAlvo("http://albora.localhost:3000", undefined)).not.toThrow();
  });

  it("recusa alvo remoto sem confirmação", () => {
    expect(() => guardarAlvo("https://albora.com.br", undefined)).toThrow(ErroDeConfig);
  });

  it("recusa confirmação genérica", () => {
    // "sim" não é evidência de que a pessoa sabe para onde está apontando.
    expect(() => guardarAlvo("https://albora.com.br", "sim")).toThrow(ErroDeConfig);
    expect(() => guardarAlvo("https://albora.com.br", "true")).toThrow(ErroDeConfig);
  });

  it("recusa confirmação de outro host", () => {
    expect(() => guardarAlvo("https://prod.albora.com.br", "homol.albora.com.br")).toThrow(
      ErroDeConfig,
    );
  });

  it("aceita a confirmação com o host exato, porta inclusa", () => {
    expect(() => guardarAlvo("https://homol.albora.com.br", "homol.albora.com.br")).not.toThrow();
    expect(() => guardarAlvo("http://10.0.0.4:3000", "10.0.0.4:3000")).not.toThrow();
    expect(() => guardarAlvo("http://10.0.0.4:3000", "10.0.0.4")).toThrow(ErroDeConfig);
  });
});

describe("ehLocal", () => {
  it("reconhece as formas de localhost", () => {
    expect(ehLocal("http://localhost:3000")).toBe(true);
    expect(ehLocal("http://127.0.0.1")).toBe(true);
    expect(ehLocal("http://[::1]:3000")).toBe(true);
  });

  it("não confunde host que só contém 'localhost'", () => {
    expect(ehLocal("https://localhost.albora.com.br")).toBe(false);
    expect(ehLocal("https://naolocalhost")).toBe(false);
  });
});

describe("lerConfig", () => {
  it("tem padrão local que roda sem nenhuma variável", () => {
    const c = lerConfig({});
    expect(c.alvo).toBe("http://localhost:3000");
    expect(c.evento).toBe("festa-demo");
    expect(c.total).toBe(150);
    expect(c.duracaoMs).toBe(20 * 60_000);
  });

  it("exige evento explícito quando o alvo é remoto", () => {
    const remoto = { ALVO: "https://homol.albora.com.br", CARGA_CONFIRMO_ALVO: "homol.albora.com.br" };
    expect(() => lerConfig(remoto)).toThrow(/CARGA_EVENTO/);
    expect(lerConfig({ ...remoto, CARGA_EVENTO: "carga-teste" }).evento).toBe("carga-teste");
  });

  it("tira a barra final do alvo", () => {
    expect(lerConfig({ ALVO: "http://localhost:3000/" }).alvo).toBe("http://localhost:3000");
  });

  it("recusa alvo que não é URL", () => {
    expect(() => lerConfig({ ALVO: "localhost:3000" })).toThrow(ErroDeConfig);
  });

  it("recusa evento id que não é uuid", () => {
    expect(() => lerConfig({ CARGA_EVENTO_ID: "festa-demo" })).toThrow(ErroDeConfig);
    expect(lerConfig({ CARGA_EVENTO_ID: "8bae9e4e-1820-46ed-bf8e-6193c83a9395" }).eventoId).toBe(
      "8bae9e4e-1820-46ed-bf8e-6193c83a9395",
    );
  });

  it("recusa número inválido em vez de virar NaN silencioso", () => {
    expect(() => lerConfig({ CARGA_TOTAL: "muitos" })).toThrow(ErroDeConfig);
    expect(() => lerConfig({ CARGA_TOTAL: "0" })).toThrow(ErroDeConfig);
    expect(() => lerConfig({ CARGA_CONVIDADOS: "0" })).toThrow(ErroDeConfig);
    expect(() => lerConfig({ CARGA_DURACAO_MIN: "0" })).toThrow(ErroDeConfig);
  });

  it("recusa mais provas de idempotência que uploads", () => {
    expect(() => lerConfig({ CARGA_TOTAL: "2", CARGA_IDEMPOTENCIA: "5" })).toThrow(ErroDeConfig);
  });

  it("ip por convidado só liga com 1 explícito", () => {
    expect(lerConfig({}).ipPorConvidado).toBe(false);
    expect(lerConfig({ CARGA_IP_POR_CONVIDADO: "true" }).ipPorConvidado).toBe(false);
    expect(lerConfig({ CARGA_IP_POR_CONVIDADO: "1" }).ipPorConvidado).toBe(true);
  });
});
