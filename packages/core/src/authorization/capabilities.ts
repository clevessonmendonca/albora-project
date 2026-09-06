import type { Capability, StaffRole } from "./types";
import { ROLE_CAPABILITIES } from "./roles";

export const ALL_CAPABILITIES: readonly Capability[] = ROLE_CAPABILITIES.owner;

export function hasCapability(roles: readonly StaffRole[], capability: Capability): boolean {
  return roles.some((role) => ROLE_CAPABILITIES[role].includes(capability));
}
