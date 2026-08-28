export function Star({ size = 24, filled }: { size?: number; filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2.5c.35 4.6 4.55 8.8 9.15 9.15v.7C16.55 12.7 12.35 16.9 12 21.5h-.7C10.95 16.9 6.75 12.7 2.15 12.35v-.7C6.75 11.3 10.95 7.1 11.3 2.5Z"
        fill={filled ? "var(--acento)" : "none"}
        stroke="currentColor"
        strokeWidth={filled ? 0 : 1.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}
