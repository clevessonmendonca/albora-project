"use client";

import React, { useState, useTransition } from "react";
import { PrimaryButton } from "@albora/ui-web";
import { completeReauthAction, requestReauthAction } from "@/features/console/actions";

export function ReauthForm({ magic, next }: { magic: string | null; next: string }) {
  return magic ? <Confirm token={magic} next={next} /> : <RequestLink next={next} />;
}

function RequestLink({ next }: { next: string }) {
  const [status, setStatus] = useState<"editing" | "sent">("editing");
  const [pending, startTransition] = useTransition();

  return (
    <main className="fixed inset-0 grid place-items-center bg-bg p-6 font-corpo text-ink">
      <div className="elev-2 flex w-full max-w-[26rem] flex-col gap-6 rounded-superficie border border-linha px-8 py-9">
        <h1 className="tipo-title m-0">Confirmar que é você</h1>
        {status === "sent" ? (
          <p className="tipo-body m-0 text-ink-2">O link já está a caminho do seu e-mail.</p>
        ) : (
          <>
            <p className="tipo-body m-0 text-ink-2">
              Essa ação exige reautenticação recente. Enviamos um link de confirmação para o seu e-mail cadastrado.
            </p>
            <input type="hidden" value={next} readOnly />
            <PrimaryButton
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await requestReauthAction();
                  setStatus("sent");
                })
              }
            >
              {pending ? "Enviando…" : "Enviar link de confirmação"}
            </PrimaryButton>
          </>
        )}
      </div>
    </main>
  );
}

function Confirm({ token, next }: { token: string; next: string }) {
  const [status, setStatus] = useState<"ready" | "error">("ready");
  const [pending, startTransition] = useTransition();

  return (
    <main className="fixed inset-0 grid place-items-center bg-bg p-6 font-corpo text-ink">
      <div className="elev-2 flex w-full max-w-[26rem] flex-col gap-6 rounded-superficie border border-linha px-8 py-9">
        <h1 className="tipo-title m-0">Confirmar que é você</h1>
        {status === "error" && (
          <p role="alert" className="tipo-caption m-0 text-critico">
            Este link está inválido, expirou ou não pertence a esta sessão.
          </p>
        )}
        <PrimaryButton
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await completeReauthAction(token);
              if (result.ok) window.location.assign(next);
              else setStatus("error");
            })
          }
        >
          {pending ? "Confirmando…" : "Confirmar"}
        </PrimaryButton>
      </div>
    </main>
  );
}
