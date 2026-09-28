import Link from "next/link";
import { ConvidadosCopiarConvite } from "@/features/admin/components/client/convidados-copiar-convite";
import { acaoTextual, CabecalhoDeCartao, Cartao } from "./kit-do-painel";

/** O cartão "Convide para participar" do protótipo (§5.2) — mesma URL rastreada (`via=link`) do QR e do convite por WhatsApp. */
export function ConvidadosCartaoConvite({ eventId, url }: { eventId: string; url: string }) {
  return (
    <Cartao>
      <CabecalhoDeCartao titulo="Convide para participar" />
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={url}
          aria-label="Link de convite do evento"
          className="min-w-0 flex-1 rounded-[9px] border border-linha bg-superficie-alta px-3 py-2 text-[13px] text-ink-2"
        />
        <ConvidadosCopiarConvite url={url} />
      </div>
      <Link href={`/admin/e/${eventId}/qrcode`} className={`${acaoTextual} mt-3 inline-block`}>
        Ver cartão com QR →
      </Link>
    </Cartao>
  );
}
