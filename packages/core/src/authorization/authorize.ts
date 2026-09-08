import { hasCapability } from "./capabilities";
import { POLICIES } from "./policies";
import type { AuthorizationRequest, Decision } from "./types";

export function authorize(req: AuthorizationRequest): Decision {
  if (!hasCapability(req.actor.roles, req.capability)) {
    return { kind: "denied", reason: `ator sem a capacidade ${req.capability}` };
  }
  const policy = POLICIES[req.capability];
  if (!policy) return { kind: "allowed" };
  return policy(req);
}
