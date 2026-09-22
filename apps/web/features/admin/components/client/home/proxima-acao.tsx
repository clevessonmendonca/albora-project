import Link from "next/link";
import type { ItemDePreparo } from "@/features/admin/data/load-home-state";
import { acaoPrimaria, acaoSecundaria, estiloAcento } from "./estilos";

/**
 * Uma decisão, não um menu. O painel escolhe o próximo passo pelo casal e mostra
 * o porquê — as demais pendências viram no máximo dois atalhos discretos.
 */
export function ProximaAcao({
  principal,
  secundarias,
}: {
  principal: ItemDePreparo;
  secundarias: ItemDePreparo[];
}) {
  return (
    <section>
      <h2 className="tipo-label m-0 mb-3 text-ink-3">Vale a pena agora</h2>

      <div className="rounded-superficie border border-linha bg-superficie p-[clamp(1.25rem,3vw,1.75rem)]">
        <h3 className="tipo-subtitle m-0 text-ink">{principal.titulo}</h3>
        <p className="tipo-body m-0 mt-2 max-w-[46ch] text-ink-2">{principal.porque}</p>
        <Link href={principal.href} className={`${acaoPrimaria} mt-5`} style={estiloAcento}>
          {principal.cta}
        </Link>
      </div>

      {secundarias.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-2.5">
          {secundarias.map((item) => (
            <Link key={item.chave} href={item.href} className={acaoSecundaria}>
              {item.cta}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
