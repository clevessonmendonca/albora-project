import { describe, expect, it } from "vitest";
import { z } from "zod";
import { validateBody, validateRequestBody } from "./validate-body";

const schema = z.object({
  codigo: z.string().min(1),
});

describe("validateBody", () => {
  it("devolve os dados quando o schema passa", () => {
    const result = validateBody({ codigo: "1234" }, schema);
    expect(result).toEqual({ codigo: "1234" });
  });

  it("devolve 422 quando o body não casa com o schema", async () => {
    const result = validateBody({ codigo: "" }, schema);
    expect(result).toBeInstanceOf(Response);
    const response = result as Response;
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({ code: "validation.failed" });
  });
});

describe("validateRequestBody", () => {
  it("parseia JSON e valida", async () => {
    const req = new Request("http://localhost/x", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ codigo: "1234" }),
    });
    await expect(validateRequestBody(req, schema)).resolves.toEqual({ codigo: "1234" });
  });

  it("não trata Request como body — JSON inválido vira 422", async () => {
    const req = new Request("http://localhost/x", { method: "POST", body: "não-json" });
    const result = await validateRequestBody(req, schema);
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(422);
  });

  it("rejeita JSON válido que falha no schema", async () => {
    const req = new Request("http://localhost/x", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ codigo: "" }),
    });
    const result = await validateRequestBody(req, schema);
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(422);
  });
});
