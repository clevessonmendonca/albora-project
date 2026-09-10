import { HREF_FORNECEDORES } from "../landing-data";

export function VendorInviteSection() {
  return (
    <section id="fornecedores" className="vendor-faixa border-y border-linha">
      <div className="mx-auto flex max-w-[78rem] flex-wrap items-center justify-between gap-8 px-[clamp(1.125rem,4vw,2.75rem)] py-9">
        <div>
          <h2 className="tipo-display text-[1.6875rem] font-normal">
            Você trabalha com eventos?
          </h2>
          <p className="text-[0.9375rem] text-ink-2">
            Conheça o Albora para fotógrafos, cerimonialistas e espaços de
            festas.
          </p>
        </div>
        <a
          href={HREF_FORNECEDORES}
          className="inline-flex items-center gap-1 font-medium text-acento-texto underline-offset-4 hover:underline"
        >
          Conheça o Albora para profissionais →
        </a>
      </div>
    </section>
  );
}
