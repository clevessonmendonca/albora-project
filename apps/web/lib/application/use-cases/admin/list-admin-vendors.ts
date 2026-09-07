/**
 * Use Case: List Admin Vendors
 * 
 * Lista fornecedores que a conta administra ou é staff.
 */

import { vendorsDaConta } from "@albora/db";
import type { Pool } from "pg";

export type VendorInfo = {
  vendorId: string;
  name: string;
  role: string;
};

export type ListAdminVendorsInput = {
  accountId: string;
};

export type ListAdminVendorsOutput = {
  vendors: VendorInfo[];
};

/**
 * Lista fornecedores da conta do admin.
 * 
 * Alimenta o wizard de criação de eventos.
 * Lista vazia é o caso comum (não é erro 404).
 * 
 * @param input - accountId do host
 * @param pool - Pool de conexões
 * @returns Lista de vendors (pode ser vazia)
 */
export async function listAdminVendors(
  input: ListAdminVendorsInput,
  pool: Pool,
): Promise<ListAdminVendorsOutput> {
  const vendors = await vendorsDaConta(pool, input.accountId);
  return { vendors };
}
