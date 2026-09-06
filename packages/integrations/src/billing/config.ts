/** Env Asaas: ASAAS_API_KEY obrigatória fora de stub; ASAAS_SANDBOX "0"=prod (ausente=sandbox seguro); ASAAS_WEBHOOK_TOKEN=header asaas-access-token. */

export type AsaasEnvConfig = {
  apiKey: string;
  /** true → sandbox.asaas.com; false → api.asaas.com */
  sandbox: boolean;
  baseUrl: string;
  webhookToken: string | null;
};

const SANDBOX_URL = "https://sandbox.asaas.com/api/v3";
const PROD_URL = "https://api.asaas.com/v3";

export function isDevAppEnv(): boolean {
  return process.env.APP_ENV === "dev";
}

/** Stub só com APP_ENV=dev e sem ASAAS_API_KEY. */
export function isBillingStubMode(): boolean {
  return isDevAppEnv() && !process.env.ASAAS_API_KEY?.trim();
}

export function readAsaasApiKey(): string | null {
  const key = process.env.ASAAS_API_KEY?.trim();
  return key || null;
}

/** Ausente ou qualquer valor ≠ "0" → sandbox (padrão seguro). */
export function readAsaasSandbox(): boolean {
  return process.env.ASAAS_SANDBOX !== "0";
}

export function readAsaasWebhookToken(): string | null {
  const t = process.env.ASAAS_WEBHOOK_TOKEN?.trim();
  return t || null;
}

export function readAsaasConfig(): AsaasEnvConfig | null {
  const apiKey = readAsaasApiKey();
  if (!apiKey) return null;
  const sandbox = readAsaasSandbox();
  return {
    apiKey,
    sandbox,
    baseUrl: sandbox ? SANDBOX_URL : PROD_URL,
    webhookToken: readAsaasWebhookToken(),
  };
}
