import { texto, type Pack } from "@albora/packs";
import { ChaoClaro } from "@/features/catalog/lib/chao-claro";

export function TelaLogin({ pack, enviado = false }: { pack: Pack; enviado?: boolean }) {
  return (
    <ChaoClaro pack={pack}>
      <div className="grid flex-1 place-items-center p-8">
        <div className="flex w-full max-w-[26rem] flex-col gap-5 rounded-superficie bg-superficie p-8">
          <p className="m-0 font-titulo text-[1.125rem] tracking-titulo text-acento-texto">
            Albora
          </p>
          <h1 className="m-0 font-titulo text-[1.625rem] font-light tracking-titulo">
            {enviado ? "Verifique seu e-mail" : "Entre pra ver sua festa"}
          </h1>
          {enviado ? (
            <p className="m-0 text-[0.9375rem] leading-normal text-ink-2">
              Se houver uma conta, o link de acesso está a caminho. Sem senha.
            </p>
          ) : (
            <>
              <p className="m-0 text-[0.9375rem] leading-normal text-ink-2">
                Enviamos um link de acesso. Sem senha.
              </p>
              <span className="rounded-token border border-linha px-4 py-3.5 text-base text-ink-3">
                voce@exemplo.com
              </span>
              <span className="flex items-center justify-center rounded-pilula bg-acento px-4 py-3.5 font-semibold text-sobre-acento">
                Enviar link
              </span>
            </>
          )}
        </div>
      </div>
    </ChaoClaro>
  );
}
