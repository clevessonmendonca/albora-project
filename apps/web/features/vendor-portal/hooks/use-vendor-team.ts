"use client";

import { useState } from "react";
import type { VendorRole, VendorTeamMember } from "@albora/db";
import { vendorTeamClient } from "../services/vendor-team-client";

type Operation = "invite" | `role:${string}` | `remove:${string}` | null;

export function useVendorTeam(vendorId: string, initialMembers: VendorTeamMember[]) {
  const [members, setMembers] = useState(initialMembers);
  const [operation, setOperation] = useState<Operation>(null);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  async function run(nextOperation: Exclude<Operation, null>, task: () => Promise<VendorTeamMember[]>, success: string) {
    setOperation(nextOperation);
    setFeedback(null);
    try {
      setMembers(await task());
      setFeedback({ kind: "success", message: success });
      return true;
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Não foi possível atualizar a equipe",
      });
      return false;
    } finally {
      setOperation(null);
    }
  }

  return {
    members,
    operation,
    feedback,
    clearFeedback: () => setFeedback(null),
    invite: (email: string, role: VendorRole) =>
      run("invite", () => vendorTeamClient.invite(vendorId, { email, role }), "Convite enviado."),
    updateRole: (accountId: string, role: VendorRole) =>
      run(`role:${accountId}`, () => vendorTeamClient.updateRole(vendorId, accountId, role), "Acesso atualizado."),
    remove: (accountId: string) =>
      run(`remove:${accountId}`, () => vendorTeamClient.remove(vendorId, accountId), "Pessoa removida da equipe."),
  };
}
