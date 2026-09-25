"use client";

import { useState } from "react";
import { Avatar, BottomSheet, ConfirmDialog, SettingsIcon } from "@albora/ui-web";
import { TemaDoPainelToggle } from "@/features/admin/components/client/tema-do-painel-toggle";
import { AjudaDoPainel } from "@/features/admin/components/client/ajuda-do-painel";

/**
 * Conta, aparência, ajuda e saída num lugar só.
 *
 * O cabeçalho mostrava `Claro` `Escuro` `Sistema`, `Ajuda` e `Sair` soltos —
 * uns 300px permanentes para preferências que se ajustam uma vez na vida, com
 * o botão de sair entre eles. E `Sair` aparecia em dois lugares ao mesmo tempo,
 * sem confirmação: um toque e a sessão morre, com volta só por magic link no
 * e-mail. Às 22h de sábado, com o salão cheio, isso é caro.
 *
 * Aqui ele é o último item, atrás de uma confirmação, e o que fica na
 * superfície é uma engrenagem.
 */
export function MenuDaConta({ email }: { email: string }) {
  const [aberto, setAberto] = useState(false);
  const [confirmandoSaida, setConfirmandoSaida] = useState(false);
  const [saindo, setSaindo] = useState(false);

  async function sair() {
    setSaindo(true);
    try {
      await fetch("/api/admin/sair", { method: "POST" });
    } finally {
      window.location.assign("/admin/sign-in");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-label="Conta e configurações"
        aria-haspopup="dialog"
        className="inline-flex min-h-12 min-w-12 cursor-pointer items-center justify-center rounded-pilula border border-linha bg-transparent text-ink-2 transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-acento-texto hover:text-ink"
      >
        <SettingsIcon size={20} />
      </button>

      <BottomSheet
        title="Conta e configurações"
        titleId="menu-da-conta-titulo"
        open={aberto}
        onClose={() => setAberto(false)}
      >
        <div className="flex flex-col gap-7 pb-2">
          <div className="flex items-center gap-3">
            <Avatar name={email} />
            <div className="flex min-w-0 flex-col">
              <span className="tipo-label text-ink-3">Conectado como</span>
              <span className="tipo-body truncate text-ink">{email}</span>
            </div>
          </div>

          <section>
            <h3 className="tipo-label m-0 mb-3 text-ink-3">Aparência</h3>
            <TemaDoPainelToggle />
          </section>

          <section>
            <h3 className="tipo-label m-0 mb-3 text-ink-3">Ajuda</h3>
            <AjudaDoPainel />
          </section>

          <section>
            <h3 className="tipo-label m-0 mb-3 text-ink-3">Sessão</h3>
            <button
              type="button"
              onClick={() => setConfirmandoSaida(true)}
              className="min-h-12 w-full cursor-pointer rounded-pilula border border-linha bg-transparent px-5 text-left text-ink-2 transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-critico hover:text-ink"
            >
              Sair desta conta
            </button>
          </section>
        </div>
      </BottomSheet>

      <ConfirmDialog
        open={confirmandoSaida}
        onClose={() => setConfirmandoSaida(false)}
        onConfirm={sair}
        title="Sair desta conta?"
        description="Para voltar você precisa de um novo link de acesso, enviado por e-mail."
        confirmLabel="Sair"
        pending={saindo}
      />
    </>
  );
}
