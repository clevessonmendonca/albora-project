"use client";

type AlbumCounters = {
  fotos: number;
  convidados: number;
  missoes: number;
};

export function AlbumCounters({ contadores }: { contadores: AlbumCounters }) {
  return (
    <ul
      className="mb-5 mt-1 flex list-none justify-center gap-0 p-0"
      aria-label="A noite em números"
    >
      <Stat valor={contadores.fotos} rotulo={contadores.fotos === 1 ? "foto" : "fotos"} />
      <Stat
        valor={contadores.convidados}
        rotulo={contadores.convidados === 1 ? "pessoa" : "pessoas"}
      />
      <Stat
        valor={contadores.missoes}
        rotulo={contadores.missoes === 1 ? "missão" : "missões"}
      />
    </ul>
  );
}

function Stat({ valor, rotulo }: { valor: number; rotulo: string }) {
  return (
    <li className="flex-1 border-l border-linha px-3 text-center first:border-l-0">
      <span className="tipo-subtitle block tabular-nums leading-none text-ink">{valor}</span>
      <span className="tipo-label mt-1 block text-ink-3">{rotulo}</span>
    </li>
  );
}
