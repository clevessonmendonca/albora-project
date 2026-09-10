export const WIDTH = "max-w-[78rem]";
export const SIDE_PADDING = "px-[clamp(1.125rem,4vw,2.75rem)]";
export const SECTION_PADDING = `py-[clamp(2.5rem,6vw,5.5rem)] ${SIDE_PADDING}`;

export const HREF_CRIAR_GRATIS = "/admin/new?plano=free";
export const HREF_CRIAR_COMPLETO = "/admin/new?plano=celebration";
/** Pacote de 3 eventos completos — mesmo funil de criação, com o plano completo. */
export const HREF_PACOTE = "/admin/new?plano=celebration&pacote=3";
export const HREF_DEMO = "/e/festa-demo?via=link";
/** Landing white-label de fornecedores — rota real de marketing B2B2C. */
export const HREF_FORNECEDORES = "/fornecedores";

export type LiveStats = { fotos: number; eventos: number };
