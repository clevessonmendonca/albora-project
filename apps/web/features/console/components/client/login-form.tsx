"use client";

import { useState, useTransition } from "react";
import { PrimaryButton, TextField } from "@albora/ui-web";
import { completeLoginAction, requestLoginAction } from "@/features/console/actions";

export function LoginForm({ magic }: { magic: string | null }) {
  return magic ? <Confirm token={magic} /> : <RequestLink />;
}

function RequestLink() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"editing" | "sent">("editing");
  const [pending, startTransition] = useTransition();

  return (
    <main className="fixed inset-0 grid place-items-center bg-bg p-6 font-corpo text-ink">
      <div className="elev-2 flex w-full max-w-[26rem] flex-col gap-6 rounded-superficie border border-linha px-8 py-9">
        {status === "sent" ? (
          <p className="tipo-body m-0 text-ink-2">
            Se houver uma conta de equipe com esse e-mail, o link já está a caminho.
          </p>
        ) : (
          <>
            <h1 className="tipo-title m-0">Entrar no console</h1>
            <TextField
              id="staff-email"
              label="E-mail da equipe"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={pending}
            />
            <PrimaryButton
              disabled={pending || !email.trim()}
              onClick={() =>
                startTransition(async () => {
                  await requestLoginAction(email.trim());
                  setStatus("sent");
                })
              }
            >
              {pending ? "Enviando…" : "Enviar link"}
            </PrimaryButton>
          </>
        )}
      </div>
    </main>
  );
}

function Confirm({ token }: { token: string }) {
  const [status, setStatus] = useState<"ready" | "error">("ready");
  const [pending, startTransition] = useTransition();

  return (
    <main className="fixed inset-0 grid place-items-center bg-bg p-6 font-corpo text-ink">
      <div className="elev-2 flex w-full max-w-[26rem] flex-col gap-6 rounded-superficie border border-linha px-8 py-9">
        <h1 className="tipo-title m-0">Confirmar acesso</h1>
        {status === "error" && (
          <p role="alert" className="tipo-caption m-0 text-critico">
            Este link está inválido ou expirou.
          </p>
        )}
        <PrimaryButton
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await completeLoginAction(token);
              if (result.ok) window.location.assign("/console");
              else setStatus("error");
            })
          }
        >
          {pending ? "Entrando…" : "Entrar no console"}
        </PrimaryButton>
      </div>
    </main>
  );
}
