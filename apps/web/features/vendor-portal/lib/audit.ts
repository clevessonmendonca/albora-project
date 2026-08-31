/** Audit de `comAgregacao` — `motivo` é opaco por design (UUID/slug, nunca PII); o que a auditoria não vê não aconteceu (architecture.md §3). */
export function auditarAgregacaoDoPortal(registro: { motivo: string; em: Date }): void {
  console.log("vendor_portal.agregacao", { motivo: registro.motivo, em: registro.em.toISOString() });
}
