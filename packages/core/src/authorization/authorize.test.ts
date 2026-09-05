import { describe, expect, it } from "vitest";
import {
  ALL_CAPABILITIES,
  authorize,
  hasCapability,
  REAUTH_MAX_AGE_SECONDS,
  REFUND_APPROVAL_THRESHOLD_CENTS,
  ROLE_CAPABILITIES,
} from "./index";
import type { Actor, StaffRole } from "./types";

function actor(roles: StaffRole[], overrides: Partial<Actor> = {}): Actor {
  return {
    staffUserId: "11111111-1111-1111-1111-111111111111",
    roles,
    sessionId: "sess-1",
    requestId: "req-1",
    reauthenticatedAt: null,
    ...overrides,
  };
}

describe("papéis recebem exatamente suas capacidades", () => {
  it.each(Object.keys(ROLE_CAPABILITIES) as StaffRole[])("%s", (role) => {
    for (const capability of ALL_CAPABILITIES) {
      const esperado = ROLE_CAPABILITIES[role].includes(capability);
      expect(hasCapability([role], capability)).toBe(esperado);
    }
  });

  it("owner recebe todas", () => {
    expect(ROLE_CAPABILITIES.owner).toEqual(ALL_CAPABILITIES);
  });
});

describe("papel sem a capacidade é negado", () => {
  it("engineering não tem subscription.refund", () => {
    const decisao = authorize({ actor: actor(["engineering"]), capability: "subscription.refund" });
    expect(decisao.kind).toBe("denied");
  });
});

describe("política de reauth", () => {
  const now = new Date("2026-09-04T12:00:00Z");

  it("timestamp fresco passa", () => {
    const decisao = authorize({
      actor: actor(["compliance"], { reauthenticatedAt: new Date(now.getTime() - 60_000) }),
      capability: "lgpd.delete_account",
      now,
    });
    expect(decisao).toEqual({ kind: "allowed" });
  });

  it("timestamp stale exige reauth", () => {
    const decisao = authorize({
      actor: actor(["compliance"], {
        reauthenticatedAt: new Date(now.getTime() - (REAUTH_MAX_AGE_SECONDS + 1) * 1000),
      }),
      capability: "lgpd.delete_account",
      now,
    });
    expect(decisao).toEqual({ kind: "needsReauth", maxAgeSeconds: REAUTH_MAX_AGE_SECONDS });
  });

  it("sem reautenticação nenhuma também exige reauth", () => {
    const decisao = authorize({
      actor: actor(["compliance"], { reauthenticatedAt: null }),
      capability: "lgpd.delete_account",
      now,
    });
    expect(decisao.kind).toBe("needsReauth");
  });

  it("owner também cai em needsReauth para lgpd.delete_account", () => {
    const decisao = authorize({ actor: actor(["owner"]), capability: "lgpd.delete_account", now });
    expect(decisao.kind).toBe("needsReauth");
  });
});

describe("política de refund", () => {
  it("abaixo do limiar é permitido", () => {
    const decisao = authorize({
      actor: actor(["finance"]),
      capability: "subscription.refund",
      context: { amountCents: REFUND_APPROVAL_THRESHOLD_CENTS - 1 },
    });
    expect(decisao).toEqual({ kind: "allowed" });
  });

  it("acima do limiar exige aprovação", () => {
    const decisao = authorize({
      actor: actor(["finance"]),
      capability: "subscription.refund",
      context: { amountCents: REFUND_APPROVAL_THRESHOLD_CENTS + 1 },
    });
    expect(decisao).toEqual({
      kind: "needsApproval",
      approverCapability: "subscription.refund.approve",
    });
  });

  // Trava de regressão: se alguém der `.approve` ao financeiro, o aprovador passa
  // a ser o próprio solicitante e a exigência de aprovação vira decoração.
  it("finance NÃO aprova o próprio reembolso", () => {
    expect(hasCapability(["finance"], "subscription.refund")).toBe(true);
    expect(hasCapability(["finance"], "subscription.refund.approve")).toBe(false);
    expect(hasCapability(["owner"], "subscription.refund.approve")).toBe(true);
  });

  it("sem amountCents é negado", () => {
    const decisao = authorize({ actor: actor(["finance"]), capability: "subscription.refund" });
    expect(decisao.kind).toBe("denied");
  });
});

describe("impersonação: pedir é permitido, ativar é que depende de aprovação", () => {
  // Criar o pedido é a ação do suporte — é o ponto de "suporte pede, dono
  // aprova". A exigência de aprovação vive como invariante no comando que
  // ATIVA a sessão (o pedido precisa estar `approved` e não expirado), não
  // como política que bloqueia a criação. Política incondicional aqui fazia
  // executeCommand lançar antes de rodar run(), tornando o pedido impossível
  // de criar pelo envelope.
  it("support pode criar o pedido", () => {
    const decisao = authorize({ actor: actor(["support"]), capability: "impersonate.request" });
    expect(decisao).toEqual({ kind: "allowed" });
  });

  it("support NÃO tem a capacidade de aprovar", () => {
    const decisao = authorize({ actor: actor(["support"]), capability: "impersonate.approve" });
    expect(decisao.kind).toBe("denied");
  });

  it("owner tem as duas — pode auto-aprovar, e o registro continua existindo", () => {
    expect(authorize({ actor: actor(["owner"]), capability: "impersonate.request" }).kind).toBe("allowed");
    expect(authorize({ actor: actor(["owner"]), capability: "impersonate.approve" }).kind).toBe("allowed");
  });
});

describe("staff.manage exige reauth", () => {
  it("stale exige reauth mesmo para owner", () => {
    const decisao = authorize({
      actor: actor(["owner"], { reauthenticatedAt: null }),
      capability: "staff.manage",
    });
    expect(decisao.kind).toBe("needsReauth");
  });
});
