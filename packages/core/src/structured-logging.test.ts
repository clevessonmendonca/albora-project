import { describe, it, expect } from "vitest";
import { addPiiField, erroParaRegistro, maskObject, maskPii, sanitizarTextoDeErro } from "./structured-logging";

describe("maskPii", () => {
  it("mascara nome completo", () => {
    expect(maskPii("João Silva")).toBe("J***a");
  });

  it("mascara email", () => {
    expect(maskPii("joao@example.com")).toBe("j***@e***");
  });

  it("mascara telefone", () => {
    expect(maskPii("11987654321")).toBe("119****4321");
  });

  it("mascara CPF", () => {
    expect(maskPii("12345678900")).toBe("123****8900");
  });

  it("retorna *** para strings muito curtas", () => {
    expect(maskPii("ab")).toBe("***");
    expect(maskPii("")).toBe("***");
  });
});

describe("maskObject", () => {
  it("mascara campos de PII", () => {
    const obj = {
      name: "João Silva",
      email: "joao@example.com",
      eventId: "evt-123",
      sessionId: "sess-456",
    };

    const masked = maskObject(obj);

    expect(masked.name).toBe("J***a");
    expect(masked.email).toBe("j***@e***");
    expect(masked.eventId).toBe("evt-123");
    expect(masked.sessionId).toBe("sess-456");
  });

  it("mascara PII em objetos aninhados", () => {
    const obj = {
      user: {
        name: "Maria Santos",
        phone: "11987654321",
      },
      eventId: "evt-123",
    };

    const masked = maskObject(obj);

    expect((masked.user as Record<string, unknown>).name).toBe("M***s");
    expect((masked.user as Record<string, unknown>).phone).toBe("119****4321");
    expect(masked.eventId).toBe("evt-123");
  });

  it("não quebra com valores null ou undefined", () => {
    const obj = {
      name: null,
      email: undefined,
      eventId: "evt-123",
    };

    const masked = maskObject(obj);

    expect(masked.name).toBeNull();
    expect(masked.email).toBeUndefined();
    expect(masked.eventId).toBe("evt-123");
  });
});

describe("addPiiField", () => {
  it("adiciona campo customizado para mascarar", () => {
    addPiiField("customerId");

    const obj = {
      customerId: "12345678900",
      eventId: "evt-123",
    };

    const masked = maskObject(obj);

    expect(masked.customerId).toBe("123****8900");
    expect(masked.eventId).toBe("evt-123");
  });
});

describe("sanitizarTextoDeErro", () => {
  it("mascara e-mail e telefone soltos no texto da exceção", () => {
    expect(sanitizarTextoDeErro("Drive: invalid_grant for maria+tag@empresa.com.br")).toBe(
      "Drive: invalid_grant for [e-mail]",
    );
    expect(sanitizarTextoDeErro("WhatsApp falhou para 5561999998888")).toBe(
      "WhatsApp falhou para [telefone]",
    );
    expect(sanitizarTextoDeErro("SMS para (61) 99999-8888 recusado")).toBe("SMS para [telefone] recusado");
  });

  it("preserva UUID e timestamp — mascarar o identificador cega o diagnóstico sem proteger ninguém", () => {
    const comUuid = "event 550e8400-e29b-41d4-a716-446655440000 nao encontrado";
    expect(sanitizarTextoDeErro(comUuid)).toBe(comUuid);
    const comData = "expirou em 2026-09-09T16:00:29Z";
    expect(sanitizarTextoDeErro(comData)).toBe(comData);
  });

  it("mascara o valor em conflito do Postgres, preservando o nome da constraint", () => {
    const limpo = sanitizarTextoDeErro(
      'duplicate key value violates unique constraint "accounts_email_key" Key (email)=(joao@gmail.com) already exists',
    );
    expect(limpo).toContain("accounts_email_key");
    expect(limpo).not.toContain("joao@gmail.com");
  });

  it("valor com parêntese não deixa o resto da linha cru", () => {
    expect(sanitizarTextoDeErro("Failing row contains (1, Ana (Silva), 61999998888, ativo).")).toBe(
      "Failing row contains ([linha])",
    );
    expect(sanitizarTextoDeErro("Key (nome)=(Ana (Silva)) already exists")).toBe(
      "Key (nome)=([valor]) already exists",
    );
  });

  it("mascara query string — é onde a URL assinada carrega credencial", () => {
    const limpo = sanitizarTextoDeErro("GET https://r2.example/obj?X-Amz-Signature=deadbeef falhou");
    expect(limpo).not.toContain("deadbeef");
    expect(limpo).toContain("?[query]");
  });

  it("trunca em 160 — o limite que a tela de Retenção já praticava — e preserva null", () => {
    expect(sanitizarTextoDeErro(null)).toBeNull();
    const longo = sanitizarTextoDeErro("x".repeat(500))!;
    expect(longo).toHaveLength(161);
    expect(longo.endsWith("…")).toBe(true);
  });
});

describe("erroParaRegistro", () => {
  it("prefixa código estruturado: SQLSTATE do pg, senão name do Error", () => {
    expect(erroParaRegistro(Object.assign(new Error("duplicate key"), { code: "23505" }))).toBe(
      "23505: duplicate key",
    );
    expect(erroParaRegistro(new TypeError("x is not a function"))).toBe("TypeError: x is not a function");
    expect(erroParaRegistro("string solta")).toBe("desconhecido: string solta");
  });

  it("o código sobrevive ao mascaramento da mensagem", () => {
    const e = Object.assign(new Error("Key (email)=(joao@gmail.com) already exists"), { code: "23505" });
    const reg = erroParaRegistro(e);
    expect(reg.startsWith("23505: ")).toBe(true);
    expect(reg).not.toContain("joao@gmail.com");
  });
});

