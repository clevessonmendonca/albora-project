import Link from "next/link";
import { ChevronIcon } from "@albora/ui-web";

export function IdeiasParaSuaFesta({ base }: { base: string }) {
  const ideias = [
    { titulo: "Crie uma missão", texto: "Desafios que levam os convidados a fotografar o que importa.", href: `${base}/missions` },
    { titulo: "Personalize o álbum", texto: "Capa, cores e letra do evento, do seu jeito.", href: `${base}/identity` },
    { titulo: "Convide quem ajuda", texto: "Cerimonialista e família acompanham a festa com você.", href: `${base}/team` },
  ];

  return (
    <section aria-labelledby="ideias-titulo">
      <h2 id="ideias-titulo" className="tipo-subtitle m-0 mb-4 text-ink">Ideias para sua festa</h2>
      <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-3">
        {ideias.map((ideia) => (
          <li key={ideia.titulo}>
            <Link
              href={ideia.href}
              className="flex h-full flex-col gap-1.5 rounded-superficie border border-linha bg-superficie p-4 no-underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-acento-texto"
            >
              <span className="tipo-label flex items-center justify-between gap-2 text-ink">
                {ideia.titulo}
                <span aria-hidden className="text-ink-3">
                  <ChevronIcon />
                </span>
              </span>
              <span className="tipo-caption text-ink-3">{ideia.texto}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
