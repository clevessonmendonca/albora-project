/**
 * A estrela da marca no lugar do coração.
 *
 * Reação é mecânica do Instagram e funciona; o coração é anti-padrão listado no
 * `CLAUDE.md`, junto com aliança e pombinha. A estrela já é da marca, então o
 * gesto continua consolidado e o símbolo deixa de ser clichê de casamento. O
 * preenchimento sai de `--acento` (token, não hex) para acompanhar o casal.
 */
export function Estrela({ tamanho = 24, cheia }: { tamanho?: number; cheia?: boolean }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2.5c.35 4.6 4.55 8.8 9.15 9.15v.7C16.55 12.7 12.35 16.9 12 21.5h-.7C10.95 16.9 6.75 12.7 2.15 12.35v-.7C6.75 11.3 10.95 7.1 11.3 2.5Z"
        fill={cheia ? "var(--acento)" : "none"}
        stroke="currentColor"
        strokeWidth={cheia ? 0 : 1.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}
