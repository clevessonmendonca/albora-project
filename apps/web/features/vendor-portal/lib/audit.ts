/**
 * O que `comAgregacao` exige antes do `BEGIN` (packages/db/src/event.ts) —
 * registrado aqui, não descartado, porque "o que a auditoria não vê não
 * aconteceu" (docs/architecture.md §3). `motivo` já é opaco por desenho
 * (`vendor_dashboard:<uuid>`, `vendor_public_resolve:<slug>`): nunca carrega
 * nome de casal nem e-mail — vendorId e slug são identificadores de rota, não
 * PII.
 */
export function auditarAgregacaoDoPortal(registro: { motivo: string; em: Date }): void {
  console.log("vendor_portal.agregacao", { motivo: registro.motivo, em: registro.em.toISOString() });
}
