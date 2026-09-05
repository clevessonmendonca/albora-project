import type { AuthorizationRequest, Capability, Decision, Policy } from "./types";

export const REAUTH_MAX_AGE_SECONDS = 900;
// Limiar provisório — o valor definitivo é decisão de negócio da Onda C (ADR 0016, "Fica em aberto").
export const REFUND_APPROVAL_THRESHOLD_CENTS = 50_000;

function reauthPolicy(): Policy {
  return (req: AuthorizationRequest): Decision => {
    const now = req.now ?? new Date();
    const at = req.actor.reauthenticatedAt;
    if (!at || now.getTime() - at.getTime() > REAUTH_MAX_AGE_SECONDS * 1000) {
      return { kind: "needsReauth", maxAgeSeconds: REAUTH_MAX_AGE_SECONDS };
    }
    return { kind: "allowed" };
  };
}



function refundPolicy(): Policy {
  return (req: AuthorizationRequest): Decision => {
    const amountCents = req.context?.["amountCents"];
    if (typeof amountCents !== "number") {
      return { kind: "denied", reason: "valor do reembolso é obrigatório" };
    }
    // Aprovador precisa ser capacidade que o solicitante NÃO tem: `finance` tem
    // `subscription.refund`, então exigir aprovação por ela deixaria o financeiro
    // aprovar a si mesmo — a escalação não escalaria. `.approve` é só do owner.
    if (amountCents > REFUND_APPROVAL_THRESHOLD_CENTS) {
      return { kind: "needsApproval", approverCapability: "subscription.refund.approve" };
    }
    return { kind: "allowed" };
  };
}

/**
 * `impersonate.request` NÃO tem política, e isso é deliberado.
 *
 * Criar o pedido é a ação permitida ao suporte — é o ponto inteiro de "suporte
 * pede, dono aprova". Quem exige aprovação é **ativar a sessão**, e isso é
 * invariante de negócio dentro do comando (o pedido precisa estar `approved` e
 * não expirado), não política que bloqueia tudo.
 *
 * Uma política incondicional de `needsApproval` aqui fazia `executeCommand`
 * lançar antes de rodar `run()`, tornando impossível criar o pedido pelo
 * envelope — e a saída fácil seria abrir exceção ao envelope, que é justamente
 * o que o ADR 0016 existe para impedir.
 */
export const POLICIES: Partial<Record<Capability, Policy>> = {
  "lgpd.delete_account": reauthPolicy(),
  "staff.manage": reauthPolicy(),
  "subscription.refund": refundPolicy(),
};
