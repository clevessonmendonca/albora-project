import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VendorTeamManager } from "./vendor-team-manager";

const VENDOR_ID = "22222222-2222-2222-2222-222222222222";
const ADMIN_ID = "11111111-1111-1111-1111-111111111111";
const STAFF_ID = "33333333-3333-3333-3333-333333333333";
const admin = { accountId: ADMIN_ID, email: "admin@aurora.test", role: "admin" as const, createdAt: new Date() };
const staff = { accountId: STAFF_ID, email: "foto@aurora.test", role: "staff" as const, createdAt: new Date() };

function response(members: unknown[], status = 200) {
  return new Response(JSON.stringify({ members, ...(status >= 400 ? { message: "Não foi possível" } : {}) }), { status });
}

afterEach(() => vi.unstubAllGlobals());

describe("VendorTeamManager", () => {
  it("convida e troca a lista pela resposta canônica da API", async () => {
    const fetchMock = vi.fn(async () => response([admin, staff]));
    vi.stubGlobal("fetch", fetchMock);
    render(<VendorTeamManager vendorId={VENDOR_ID} actorAccountId={ADMIN_ID} initialMembers={[admin]} teamLimit={5} />);

    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "foto@aurora.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar convite" }));

    expect(await screen.findByText("foto@aurora.test")).toBeInTheDocument();
    expect(screen.getByText("Convite enviado.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/vendors/${VENDOR_ID}/members`,
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("no limite explica a recuperação e não mostra um formulário inoperante", () => {
    render(<VendorTeamManager vendorId={VENDOR_ID} actorAccountId={ADMIN_ID} initialMembers={[admin]} teamLimit={1} />);
    expect(screen.getByText("O plano atual chegou ao limite da equipe.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver planos" })).toHaveAttribute(
      "href",
      `/admin/vendor/checkout?vendor=${VENDOR_ID}`,
    );
    expect(screen.queryByRole("button", { name: "Enviar convite" })).not.toBeInTheDocument();
  });

  it("exige confirmação inline antes de remover e protege a conta atual", async () => {
    const fetchMock = vi.fn(async () => response([admin]));
    vi.stubGlobal("fetch", fetchMock);
    render(<VendorTeamManager vendorId={VENDOR_ID} actorAccountId={ADMIN_ID} initialMembers={[admin, staff]} teamLimit={5} />);

    expect(screen.getByLabelText("Papel de admin@aurora.test")).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Remover" }));
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() => expect(screen.queryByText("foto@aurora.test")).not.toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/vendors/${VENDOR_ID}/members/${STAFF_ID}`,
      { method: "DELETE" },
    );
  });
});
