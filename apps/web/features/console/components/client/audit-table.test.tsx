import { describe, expect, it } from "vitest";
import { formatarMetadata } from "./audit-table";

describe("formatarMetadata", () => {
  // `metadata` é JSONB livre: o contrato diz "só id e contador", mas contrato
  // não é constraint. Uma tela de auditoria que vaza PII derrota o próprio
  // propósito de existir.
  it("mascara e-mail que tenha escapado para o metadata", () => {
    const saida = formatarMetadata({ conta: "joao@gmail.com", total: 3 });
    expect(saida).not.toContain("joao@gmail.com");
    expect(saida).toContain("«contato»");
  });

  it("preserva id e contador — são o dado que a tela existe para mostrar", () => {
    const saida = formatarMetadata({ eventId: "8f3a1c22", fotos: 412 });
    expect(saida).toContain("8f3a1c22");
    expect(saida).toContain("412");
  });

  it("trunca metadata muito grande", () => {
    const saida = formatarMetadata({ blob: "x".repeat(1000) });
    expect(saida.endsWith("…")).toBe(true);
  });

  it("metadata ausente vira objeto vazio, não quebra", () => {
    expect(formatarMetadata(null)).toBe("{}");
    expect(formatarMetadata(undefined)).toBe("{}");
  });
});

describe("auditoria é append-only por construção", () => {
  it("o componente não expõe nenhum controle de mutação", async () => {
    const fs = await import("node:fs/promises");
    const fonte = await fs.readFile(
      "apps/web/features/console/components/client/audit-table.tsx",
      "utf-8",
    );
    // Varre CÓDIGO, não prosa: o arquivo tem um comentário dizendo justamente
    // que não há botão de editar/excluir, e um teste que casasse com o texto
    // reprovaria a própria documentação da regra. Guard com falso positivo é
    // guard que a equipe desliga.
    const codigo = fonte
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");

    // Trilha que se edita não é trilha. O GRANT já revoga UPDATE/DELETE no
    // banco; isto trava a intenção também na UI.
    for (const proibido of ["onDelete", "onEdit", "handleDelete", "handleEdit", "mutate"]) {
      expect(codigo).not.toContain(proibido);
    }
    expect(codigo).not.toMatch(/method=["']post["']/i);
  });
});
