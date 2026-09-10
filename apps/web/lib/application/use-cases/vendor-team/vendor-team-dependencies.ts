import { config } from "@/lib/config";
import { getAggregatorPool, getPool } from "@/lib/db";
import { sendHostEmail } from "@/lib/email";
import type { VendorTeamDependencies } from "./vendor-team-service";

export function vendorTeamDependencies(): VendorTeamDependencies {
  return {
    pool: getPool(),
    aggregatorPool: getAggregatorPool(),
    sessionSecret: config().sessionSecret,
    sendEmail: sendHostEmail,
  };
}
