/** `stop-color` usa tokens — um hex literal aqui seria o mesmo que o guard reprova, só que escondido dentro de um SVG. */
export function Brand({ size = 26, id }: { size?: number; id: string }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <defs>
        <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="32" y1="46" x2="32" y2="20">
          <stop offset="0" stopColor="var(--acento-texto)" />
          <stop offset="0.55" stopColor="var(--acento)" />
          <stop offset="1" stopColor="var(--acento)" stopOpacity="0.66" />
        </linearGradient>
      </defs>
      <path
        d="M11 42 A21 21 0 0 1 53 42"
        fill="none"
        stroke={`url(#${id})`}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="32" cy="39.4" r="3.2" fill="var(--acento)" />
    </svg>
  );
}
