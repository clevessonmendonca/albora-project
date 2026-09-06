import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SubscriptionActions } from "./subscription-actions";

const PRICE_TABLE = { starter: 9900, studio: 24900, agency: 59900 };

vi.mock("@/features/console/actions", () => ({
  applySubscriptionCourtesyAction: vi.fn().mockResolvedValue({ ok: true }),
  cancelSubscriptionAction: vi.fn().mockResolvedValue({ ok: false, error: "motivo é obrigatório" }),
  changeSubscriptionPlanAction: vi.fn(),
  refundPaymentAction: vi.fn(),
}));

/**
 * Os quatro `ConfirmDialog` ficam sempre montados no DOM (o `<dialog>` só
 * alterna o atributo nativo `open` via ref, nunca desmonta) — dois deles
 * compartilham o label "Motivo". `getByRole` respeita o `display: none` que
 * o UA stylesheet aplica a `dialog:not([open])`, mas `getByLabelText` não;
 * por isso todo campo é buscado dentro do diálogo aberto (`getByRole("dialog")`
 * já exclui os fechados), nunca em `screen` direto.
 */
function dialogoAberto() {
  return within(screen.getByRole("dialog"));
}

describe("SubscriptionActions", () => {
  it("sem subscription.mutate e sem subscription.refund* mostra só travessão", () => {
    render(
      <SubscriptionActions subscriptionId="s1" vendorId="v1" plan="studio" podeMutar={false} podeReembolsar={false} priceTable={PRICE_TABLE} />,
    );
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("cancelar sem motivo mostra o erro devolvido pelo comando", async () => {
    render(
      <SubscriptionActions subscriptionId="s1" vendorId="v1" plan="studio" podeMutar podeReembolsar={false} priceTable={PRICE_TABLE} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancelar assinatura" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("motivo é obrigatório");
  });

  it("trocar plano exige motivo antes de habilitar a confirmação", async () => {
    render(
      <SubscriptionActions subscriptionId="s1" vendorId="v1" plan="starter" podeMutar podeReembolsar={false} priceTable={PRICE_TABLE} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Trocar plano" }));
    expect(screen.getByRole("button", { name: "Confirmar troca de plano" })).toBeDisabled();

    await userEvent.type(dialogoAberto().getByLabelText("Motivo"), "upgrade pedido pelo fornecedor");
    expect(screen.getByRole("button", { name: "Confirmar troca de plano" })).not.toBeDisabled();
  });

  it("trocar plano chama a action com o preço da tabela para o plano escolhido", async () => {
    const { changeSubscriptionPlanAction } = await import("@/features/console/actions");
    vi.mocked(changeSubscriptionPlanAction).mockResolvedValueOnce({ ok: true });

    render(
      <SubscriptionActions subscriptionId="s1" vendorId="v1" plan="starter" podeMutar podeReembolsar={false} priceTable={PRICE_TABLE} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Trocar plano" }));
    const dialogo = dialogoAberto();
    await userEvent.selectOptions(dialogo.getByLabelText("Novo plano"), "agency");
    await userEvent.type(dialogo.getByLabelText("Motivo"), "upgrade pedido pelo fornecedor");
    await userEvent.click(screen.getByRole("button", { name: "Confirmar troca de plano" }));

    expect(changeSubscriptionPlanAction).toHaveBeenCalledWith("s1", "agency", 59900, "upgrade pedido pelo fornecedor");
  });

  it("reembolso exige motivo, referência do pagamento e valor antes de habilitar", async () => {
    render(
      <SubscriptionActions subscriptionId="s1" vendorId="v1" plan="studio" podeMutar={false} podeReembolsar priceTable={PRICE_TABLE} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Reembolsar" }));
    const dialogo = dialogoAberto();
    const confirmar = screen.getByRole("button", { name: "Confirmar reembolso" });
    expect(confirmar).toBeDisabled();

    await userEvent.type(dialogo.getByLabelText("ID do pagamento"), "pagamento-1");
    expect(confirmar).toBeDisabled();

    await userEvent.type(dialogo.getByLabelText("ID do pagamento no Asaas"), "pay_asaas_1");
    expect(confirmar).toBeDisabled();

    await userEvent.type(dialogo.getByLabelText("Valor (R$)"), "800,00");
    expect(confirmar).toBeDisabled();

    await userEvent.type(dialogo.getByLabelText("Motivo"), "cliente cancelou o evento");
    expect(confirmar).not.toBeDisabled();
  });

  it("reembolso acima do limiar mostra que exige o dono, sem inventar fila de aprovação", async () => {
    // `ApprovalRequiredError` ("subscription.refund exige aprovação de
    // subscription.refund.approve", ver errors.ts) é a forma real como isso
    // chega à UI desde o commit 26a29ed — `traduzErroDeComando` (actions.ts)
    // devolve a mensagem default da classe, sem reescrevê-la.
    const { refundPaymentAction } = await import("@/features/console/actions");
    vi.mocked(refundPaymentAction).mockResolvedValueOnce({
      ok: false,
      error: "subscription.refund exige aprovação de subscription.refund.approve",
    });

    render(
      <SubscriptionActions subscriptionId="s1" vendorId="v1" plan="studio" podeMutar={false} podeReembolsar priceTable={PRICE_TABLE} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Reembolsar" }));
    const dialogo = dialogoAberto();
    await userEvent.type(dialogo.getByLabelText("ID do pagamento"), "pagamento-1");
    await userEvent.type(dialogo.getByLabelText("ID do pagamento no Asaas"), "pay_asaas_1");
    await userEvent.type(dialogo.getByLabelText("Valor (R$)"), "800,00");
    await userEvent.type(dialogo.getByLabelText("Motivo"), "cliente cancelou o evento");
    await userEvent.click(screen.getByRole("button", { name: "Confirmar reembolso" }));

    expect(refundPaymentAction).toHaveBeenCalledWith("pagamento-1", "pay_asaas_1", 80000, "cliente cancelou o evento");
    expect(await screen.findByRole("alert")).toHaveTextContent("Esse valor exige aprovação do dono.");
  });

  it("valor em reais chega ao comando em centavos, inteiro — sem erro de ponto flutuante", async () => {
    const { refundPaymentAction } = await import("@/features/console/actions");
    vi.mocked(refundPaymentAction).mockClear();
    vi.mocked(refundPaymentAction).mockResolvedValueOnce({ ok: true });

    render(
      <SubscriptionActions subscriptionId="s1" vendorId="v1" plan="studio" podeMutar={false} podeReembolsar priceTable={PRICE_TABLE} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Reembolsar" }));
    const dialogo = dialogoAberto();
    await userEvent.type(dialogo.getByLabelText("ID do pagamento"), "pagamento-1");
    await userEvent.type(dialogo.getByLabelText("ID do pagamento no Asaas"), "pay_asaas_1");
    // 19,90 é o caso clássico de ponto flutuante: `19.9 * 100` puro dá
    // 1989.9999999999998, não 1990.
    await userEvent.type(dialogo.getByLabelText("Valor (R$)"), "19,90");
    await userEvent.type(dialogo.getByLabelText("Motivo"), "cliente cancelou o evento");
    await userEvent.click(screen.getByRole("button", { name: "Confirmar reembolso" }));

    expect(refundPaymentAction).toHaveBeenCalledWith("pagamento-1", "pay_asaas_1", 1990, "cliente cancelou o evento");
    const chamada = vi.mocked(refundPaymentAction).mock.calls.at(0);
    expect(Number.isInteger(chamada?.[2])).toBe(true);
  });

  it("valor de reembolso inválido nunca chama a action", async () => {
    const { refundPaymentAction } = await import("@/features/console/actions");
    vi.mocked(refundPaymentAction).mockClear();

    render(
      <SubscriptionActions subscriptionId="s1" vendorId="v1" plan="studio" podeMutar={false} podeReembolsar priceTable={PRICE_TABLE} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Reembolsar" }));
    const dialogo = dialogoAberto();
    await userEvent.type(dialogo.getByLabelText("ID do pagamento"), "pagamento-1");
    await userEvent.type(dialogo.getByLabelText("ID do pagamento no Asaas"), "pay_asaas_1");
    await userEvent.type(dialogo.getByLabelText("Valor (R$)"), "não é número");
    await userEvent.type(dialogo.getByLabelText("Motivo"), "cliente cancelou o evento");

    // entrada não numérica nunca faz `parseReaisParaCentavos` devolver um
    // valor válido — o botão continua desabilitado, e a action nunca roda.
    expect(screen.getByRole("button", { name: "Confirmar reembolso" })).toBeDisabled();
    expect(refundPaymentAction).not.toHaveBeenCalled();
  });

  it("nenhuma das duas usa DangerDialog", async () => {
    // Duas montagens, não fechar-e-reabrir: o `<dialog>` do ConfirmDialog
    // fica sempre no DOM (só alterna o atributo `open`), então fechar o
    // primeiro diálogo clicando em "Cancelar" colidiria com o botão-gatilho
    // "Cancelar" de fora — ambiguidade de teste, não do componente.
    const { unmount } = render(
      <SubscriptionActions subscriptionId="s1" vendorId="v1" plan="starter" podeMutar podeReembolsar priceTable={PRICE_TABLE} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Trocar plano" }));
    expect(screen.queryByText(/Digite "/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Excluir de verdade/ })).not.toBeInTheDocument();
    unmount();

    render(
      <SubscriptionActions subscriptionId="s1" vendorId="v1" plan="starter" podeMutar podeReembolsar priceTable={PRICE_TABLE} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Reembolsar" }));
    expect(screen.queryByText(/Digite "/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Excluir de verdade/ })).not.toBeInTheDocument();
  });
});
