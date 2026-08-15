import { describe, expect, it } from "vitest";
import { caminhoDoEvento, eventEntryPath, eventEntryUrl, extrairSlug, slugValido, whatsappInviteUrl } from "./qr";

describe("o QR pode trazer URL ou só o código, e os dois entram", () => {
  it("o código sozinho, que é o que está impresso ao lado do QR", () => {
    expect(extrairSlug("festa-demo")).toBe("festa-demo");
  });

  it("a URL completa da rota do produto", () => {
    expect(extrairSlug("https://albora.com.br/e/festa-demo")).toBe("festa-demo");
  });

  it("a URL curta impressa abaixo do QR (N1.4)", () => {
    expect(extrairSlug("https://albora.com.br/anaejoao")).toBe("anaejoao");
  });

  it("a URL curta sem esquema, que é como ela vai para a gráfica", () => {
    expect(extrairSlug("albora.com.br/anaejoao")).toBe("anaejoao");
  });

  it("caminho mais fundo continua resolvendo o evento, não o último segmento", () => {
    expect(extrairSlug("https://albora.com.br/e/festa-demo/foto")).toBe("festa-demo");
  });

  it("barra no fim, query e âncora não atrapalham", () => {
    expect(extrairSlug("https://albora.com.br/e/festa-demo/?x=1#topo")).toBe("festa-demo");
    expect(extrairSlug("https://albora.com.br/e/festa-demo?via=qr")).toBe("festa-demo");
  });

  it("percent-encoding é decodificado antes de validar, nunca depois", () => {
    expect(extrairSlug("https://albora.com.br/e/festa%2Ddemo")).toBe("festa-demo");
    expect(extrairSlug("https://albora.com.br/e/festa%2Fdemo")).toBeNull();
  });
});

describe("quem digita não digita igual ao que foi impresso", () => {
  it("espaço em volta some", () => {
    expect(extrairSlug("  festa-demo  ")).toBe("festa-demo");
  });

  it("o teclado do celular capitaliza sozinho, e isso não pode barrar", () => {
    expect(extrairSlug("Festa-Demo")).toBe("festa-demo");
  });

  it("acento digitado resolve para o código sem acento que está na placa", () => {
    expect(extrairSlug("anaejoão")).toBe("anaejoao");
  });
});

describe("nada que não passe no formato vira destino", () => {
  it.each([
    ["", "vazio"],
    ["   ", "só espaço"],
    ["festa demo", "espaço no meio"],
    ["-festa", "hífen na ponta"],
    ["festa-", "hífen na ponta"],
    ["festa--demo", "hífen duplo"],
    ["f", "curto demais"],
    ["festa_demo", "sublinhado"],
    ["festa.demo", "ponto"],
    ["https://albora.com.br/", "URL sem segmento"],
    ["https://albora.com.br/e/", "rota do evento sem slug"],
  ])("%s (%s)", (entrada) => {
    expect(extrairSlug(entrada)).toBeNull();
  });

  it("esquema executável não passa, mesmo sendo URL válida", () => {
    expect(extrairSlug("javascript:alert(1)")).toBeNull();
    expect(extrairSlug("data:text/html,festa-demo")).toBeNull();
  });

  it("slug longo demais não passa", () => {
    expect(extrairSlug("a".repeat(65))).toBeNull();
    expect(extrairSlug("a".repeat(64))).toBe("a".repeat(64));
  });

  it("conteúdo gigante é recusado sem ser processado", () => {
    expect(extrairSlug("a".repeat(2049))).toBeNull();
  });
});

describe("um QR colado por cima do original não redireciona ninguém", () => {
  it("o host do QR é descartado — só o slug sobrevive", () => {
    expect(extrairSlug("https://sitequalquer.example/e/festa-demo")).toBe("festa-demo");
  });

  it("o destino é sempre montado sobre a rota do produto", () => {
    const slug = extrairSlug("https://sitequalquer.example/e/festa-demo");
    expect(slug).not.toBeNull();
    expect(caminhoDoEvento(slug as string)).toBe("/e/festa-demo");
  });

  it("credencial embutida na URL não vira slug", () => {
    expect(extrairSlug("https://usuario:senha@albora.com.br/e/festa-demo")).toBe("festa-demo");
  });

  it("travessia de caminho vira um evento inexistente, nunca outra rota", () => {
    // Não basta o resultado ser `null`: o que garante a segurança é o destino
    // ser sempre remontado sob `/e/`, e é isso que este teste fixa.
    const slug = extrairSlug("../../admin");
    expect(slug).toBe("admin");
    expect(caminhoDoEvento(slug as string)).toBe("/e/admin");
  });
});

describe("via marca o canal sem mudar o slug", () => {
  it("peça impressa leva via=qr; convite, wa ou link", () => {
    expect(eventEntryPath("festa-demo", "qr")).toBe("/e/festa-demo?via=qr");
    expect(eventEntryUrl("https://albora.app", "festa-demo", "link")).toBe(
      "https://albora.app/e/festa-demo?via=link",
    );
    expect(whatsappInviteUrl("https://albora.app", "festa-demo")).toContain("via%3Dwa");
    expect(whatsappInviteUrl("https://albora.app", "festa-demo")).toContain("wa.me");
  });
});

describe("slugValido é o conjunto fechado", () => {
  it("aceita o que a semeadura de desenvolvimento usa", () => {
    for (const s of ["festa-demo", "festa-encerrada", "nao-existe", "anaejoao", "a1"]) {
      expect(slugValido(s)).toBe(true);
    }
  });

  it("recusa maiúscula — a normalização é responsabilidade de quem extrai", () => {
    expect(slugValido("Festa-Demo")).toBe(false);
  });
});
