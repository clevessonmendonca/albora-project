import type { Capability } from "@albora/core";

export class CommandDeniedError extends Error {
  constructor(public readonly capability: Capability, reason: string) {
    super(reason);
    this.name = "CommandDeniedError";
  }
}

export class ReauthRequiredError extends Error {
  constructor(public readonly capability: Capability, public readonly maxAgeSeconds: number) {
    super(`reautenticação recente exigida para ${capability}`);
    this.name = "ReauthRequiredError";
  }
}

export class ApprovalRequiredError extends Error {
  constructor(public readonly capability: Capability, public readonly approverCapability: Capability) {
    super(`${capability} exige aprovação de ${approverCapability}`);
    this.name = "ApprovalRequiredError";
  }
}
