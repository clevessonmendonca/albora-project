/**
 * O traço da casa: 24×24, `currentColor`, 1.5 de espessura.
 *
 * Sem cor própria — herdam do texto por `currentColor`, então a mesma peça
 * serve chão claro e escuro sem variante. Cor é decisão do consumidor via
 * `text-*`, nunca do ícone.
 */
type Props = { tamanho?: number };

export function IconeCamera({ tamanho = 26 }: Props) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path
        d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.7l1.1-1.8A1.5 1.5 0 0 1 9.6 3.5h4.8a1.5 1.5 0 0 1 1.3.7L16.8 6h1.7A2.5 2.5 0 0 1 21 8.5v9A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12.75" r="3.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function IconeComentario({ tamanho = 22 }: Props) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path
        d="M21 11.6c0 4.2-4 7.6-9 7.6-1 0-2-.14-2.9-.4L4 20.5l1.4-3.7C4.2 15.4 3.5 13.6 3.5 11.6 3.5 7.4 7.5 4 12.5 4S21 7.4 21 11.6Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconeCompartilhar({ tamanho = 22 }: Props) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path d="M12 3.5v11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="m8.25 7.25 3.75-3.75 3.75 3.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M6 11.5H5.5A1.5 1.5 0 0 0 4 13v6.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V13a1.5 1.5 0 0 0-1.5-1.5H18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconeGrade({ tamanho = 22 }: Props) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      {[
        [3, 3],
        [14, 3],
        [3, 14],
        [14, 14],
      ].map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      ))}
    </svg>
  );
}

export function IconePilha({ tamanho = 22 }: Props) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <rect x="3" y="6" width="18" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.5 6V4.5A1.5 1.5 0 0 1 8 3h8a1.5 1.5 0 0 1 1.5 1.5V6" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function IconePessoa({ tamanho = 22 }: Props) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <circle cx="12" cy="8" r="3.75" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4.5 20.5c1.2-3.9 4-5.9 7.5-5.9s6.3 2 7.5 5.9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconeMais({ tamanho = 20 }: Props) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" aria-hidden="true">
      {[6, 12, 18].map((x) => (
        <circle key={x} cx={x} cy="12" r="1.6" fill="currentColor" />
      ))}
    </svg>
  );
}

export function IconeVoltar({ tamanho = 20 }: Props) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path d="m14.5 5-7 7 7 7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
