import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SubscriptionActions } from "./subscription-actions";

const PRICE_TABLE = { starter: 9900, studio: 24900, agency: 59900 };

const PAGAMENTO_CONFIRMADO = {
  id: "pagamento-1",
  asaasPaymentId: "pay_asaas_1",
  amountCents: 80000,
  status: "confirmed" as const,
  paidAt: new Date("2026-08-01T00:00:00Z"),
};

const PAGAMENTO_RECEBIDO = {
  id: "pagamento-2",
  asaasPaymentId: "pay_asaas_2",
  amountCents: 19900,
  status: "received" as const,
  paidAt: null,
};

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

  it("sem pagamento reembolsável, o diálogo mostra estado honesto — não um seletor vazio", async () => {
    render(
      <SubscriptionActions
        subscriptionId="s1"
        vendorId="v1"
        plan="studio"
        podeMutar={false}
        podeReembolsar
        priceTable={PRICE_TABLE}
        refundablePayments={[]}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Reembolsar" }));
    const dialogo = dialogoAberto();

    expect(dialogo.getByText("Nenhum pagamento reembolsável para este fornecedor.")).toBeInTheDocument();
    expect(dialogo.queryByLabelText("Pagamento")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar reembolso" })).toBeDisabled();
  });

  it("reembolso: escolher um pagamento no seletor preenche id/asaasId/valor — o operador não digita nada disso", async () => {
    const { refundPaymentAction } = await import("@/features/console/actions");
    vi.mocked(refundPaymentAction).mockClear();
    vi.mocked(refundPaymentAction).mockResolvedValueOnce({ ok: true });

    render(
      <SubscriptionActions
        subscriptionId="s1"
        vendorId="v1"
        plan="studio"
        podeMutar={false}
        podeReembolsar
        priceTable={PRICE_TABLE}
        refundablePayments={[PAGAMENTO_CONFIRMADO, PAGAMENTO_RECEBIDO]}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Reembolsar" }));
    const dialogo = dialogoAberto();
    const confirmar = screen.getByRole("button", { name: "Confirmar reembolso" });
    expect(confirmar).toBeDisabled();

    await userEvent.selectOptions(dialogo.getByLabelText("Pagamento"), PAGAMENTO_CONFIRMADO.id);
    // Valor default é o valor cheio do pagamento selecionado.
    expect(dialogo.getByLabelText("Valor (R$)")).toHaveValue("800,00");
    expect(confirmar).toBeDisabled();

    await userEvent.type(dialogo.getByLabelText("Motivo"), "cliente cancelou o evento");
    expect(confirmar).not.toBeDisabled();

    await userEvent.click(confirmar);
    expect(refundPaymentAction).toHaveBeenCalledWith(
      PAGAMENTO_CONFIRMADO.id,
      PAGAMENTO_CONFIRMADO.asaasPaymentId,
      80000,
      "cliente cancelou o evento",
    );
  });

  it("reembolso parcial: reduzir o valor abaixo do total do pagamento continua válido", async () => {
    const { refundPaymentAction } = await import("@/features/console/actions");
    vi.mocked(refundPaymentAction).mockClear();
    vi.mocked(refundPaymentAction).mockResolvedValueOnce({ ok: true });

    render(
      <SubscriptionActions
        subscriptionId="s1"
        vendorId="v1"
        plan="studio"
        podeMutar={false}
        podeReembolsar
        priceTable={PRICE_TABLE}
        refundablePayments={[PAGAMENTO_CONFIRMADO]}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Reembolsar" }));
    const dialogo = dialogoAberto();
    await userEvent.selectOptions(dialogo.getByLabelText("Pagamento"), PAGAMENTO_CONFIRMADO.id);

    const campoValor = dialogo.getByLabelText("Valor (R$)");
    await userEvent.clear(campoValor);
    await userEvent.type(campoValor, "100,00");
    await userEvent.type(dialogo.getByLabelText("Motivo"), "reembolso parcial pedido pelo cliente");

    expect(screen.getByRole("button", { name: "Confirmar reembolso" })).not.toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Confirmar reembolso" }));

    expect(refundPaymentAction).toHaveBeenCalledWith(
      PAGAMENTO_CONFIRMADO.id,
      PAGAMENTO_CONFIRMADO.asaasPaymentId,
      10000,
      "reembolso parcial pedido pelo cliente",
    );
  });

  it("não deixa confirmar reembolso maior que o valor do pagamento", async () => {
    const { refundPaymentAction } = await import("@/features/console/actions");
    vi.mocked(refundPaymentAction).mockClear();

    render(
      <SubscriptionActions
        subscriptionId="s1"
        vendorId="v1"
        plan="studio"
        podeMutar={false}
        podeReembolsar
        priceTable={PRICE_TABLE}
        refundablePayments={[PAGAMENTO_CONFIRMADO]}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Reembolsar" }));
    const dialogo = dialogoAberto();
    await userEvent.selectOptions(dialogo.getByLabelText("Pagamento"), PAGAMENTO_CONFIRMADO.id);

    const campoValor = dialogo.getByLabelText("Valor (R$)");
    await userEvent.clear(campoValor);
    await userEvent.type(campoValor, "900,00");
    await userEvent.type(dialogo.getByLabelText("Motivo"), "tentativa de reembolso maior que o pagamento");

    expect(screen.getByRole("button", { name: "Confirmar reembolso" })).toBeDisabled();
    expect(dialogo.getByText("Não é possível reembolsar mais do que o valor do pagamento.")).toBeInTheDocument();
    expect(refundPaymentAction).not.toHaveBeenCalled();
  });

  it("reembolso acima do limiar mostra que exige o dono, sem inventar fila de aprovação", async () => {
    // `ApprovalRequiredError` ("subscription.refund exige aprovação de
    // subscription.refund.approve", ver errors.ts) é a forma real como isso
    // chega à UI desde o commit 26a29ed — `traduzErroDeComando` (actions.ts)
    // devolve a mensagem default da classe, sem reescrevê-la.
    const { refundPaymentAction } = await import("@/features/console/actions");
    vi.mocked(refundPaymentAction).mockClear();
    vi.mocked(refundPaymentAction).mockResolvedValueOnce({
      ok: false,
      error: "subscription.refund exige aprovação de subscription.refund.approve",
    });

    render(
      <SubscriptionActions
        subscriptionId="s1"
        vendorId="v1"
        plan="studio"
        podeMutar={false}
        podeReembolsar
        priceTable={PRICE_TABLE}
        refundablePayments={[PAGAMENTO_CONFIRMADO]}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Reembolsar" }));
    const dialogo = dialogoAberto();
    await userEvent.selectOptions(dialogo.getByLabelText("Pagamento"), PAGAMENTO_CONFIRMADO.id);
    await userEvent.type(dialogo.getByLabelText("Motivo"), "cliente cancelou o evento");
    await userEvent.click(screen.getByRole("button", { name: "Confirmar reembolso" }));

    expect(refundPaymentAction).toHaveBeenCalledWith(PAGAMENTO_CONFIRMADO.id, PAGAMENTO_CONFIRMADO.asaasPaymentId, 80000, "cliente cancelou o evento");
    expect(await screen.findByRole("alert")).toHaveTextContent("Esse valor exige aprovação do dono.");
  });

  it("valor de reembolso não numérico nunca chama a action", async () => {
    const { refundPaymentAction } = await import("@/features/console/actions");
    vi.mocked(refundPaymentAction).mockClear();

    render(
      <SubscriptionActions
        subscriptionId="s1"
        vendorId="v1"
        plan="studio"
        podeMutar={false}
        podeReembolsar
        priceTable={PRICE_TABLE}
        refundablePayments={[PAGAMENTO_CONFIRMADO]}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Reembolsar" }));
    const dialogo = dialogoAberto();
    await userEvent.selectOptions(dialogo.getByLabelText("Pagamento"), PAGAMENTO_CONFIRMADO.id);

    const campoValor = dialogo.getByLabelText("Valor (R$)");
    await userEvent.clear(campoValor);
    await userEvent.type(campoValor, "não é número");
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
      <SubscriptionActions subscriptionId="s1" vendorId="v1" plan="starter" podeMutar podeReembolsar priceTable={PRICE_TABLE} refundablePayments={[PAGAMENTO_CONFIRMADO]} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Trocar plano" }));
    expect(screen.queryByText(/Digite "/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Excluir de verdade/ })).not.toBeInTheDocument();
    unmount();

    render(
      <SubscriptionActions subscriptionId="s1" vendorId="v1" plan="starter" podeMutar podeReembolsar priceTable={PRICE_TABLE} refundablePayments={[PAGAMENTO_CONFIRMADO]} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Reembolsar" }));
    expect(screen.queryByText(/Digite "/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Excluir de verdade/ })).not.toBeInTheDocument();
  });
});
