import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DsarRequestActions } from "./dsar-request-actions";

const { updateDsarRequestActionMock } = vi.hoisted(() => ({
  updateDsarRequestActionMock: vi.fn().mockResolvedValue({ ok: true }),
}));
vi.mock("@/features/console/actions", () => ({ updateDsarRequestAction: updateDsarRequestActionMock }));

const rowBase = {
  id: "req-1",
  kind: "access" as const,
  subjectAccountId: "conta-1",
  receivedAt: new Date(),
  legalDueAt: new Date(Date.now() + 86_400_000),
  status: "open" as const,
  assigneeStaffId: null,
  evidenceUrl: null,
  completedAt: null,
  notes: null,
};

describe("DsarRequestActions", () => {
  it("exige motivo antes de salvar — não chama o comando sem justificativa", async () => {
    render(<DsarRequestActions row={rowBase} />);
    await userEvent.click(screen.getByRole("button", { name: "Atualizar" }));
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("motivo é obrigatório");
    expect(updateDsarRequestActionMock).not.toHaveBeenCalled();
  });

  it("com motivo preenchido, envia status e comprovante", async () => {
    render(<DsarRequestActions row={rowBase} />);
    await userEvent.click(screen.getByRole("button", { name: "Atualizar" }));
    await userEvent.selectOptions(screen.getByLabelText("Status"), "completed");
    await userEvent.type(screen.getByLabelText("Comprovante (link)"), "https://drive.example.test/pasta");
    await userEvent.type(screen.getByLabelText("Motivo"), "exportado e enviado ao titular");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(updateDsarRequestActionMock).toHaveBeenCalledWith(
      "req-1",
      "exportado e enviado ao titular",
      { status: "completed", evidenceUrl: "https://drive.example.test/pasta", notes: null },
    );
  });
});
