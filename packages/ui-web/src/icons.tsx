type IconProps = { size?: number };

export function CameraIcon({ size = 26 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none">
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

export function CommentIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path
        d="M21 11.6c0 4.2-4 7.6-9 7.6-1 0-2-.14-2.9-.4L4 20.5l1.4-3.7C4.2 15.4 3.5 13.6 3.5 11.6 3.5 7.4 7.5 4 12.5 4S21 7.4 21 11.6Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ShareIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path d="M12 3.5v11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="m8.25 7.25 3.75-3.75 3.75 3.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 11.5H5.5A1.5 1.5 0 0 0 4 13v6.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V13a1.5 1.5 0 0 0-1.5-1.5H18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function GridIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none">
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

export function StackIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <rect x="3" y="6" width="18" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.5 6V4.5A1.5 1.5 0 0 1 8 3h8a1.5 1.5 0 0 1 1.5 1.5V6" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function PersonIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <circle cx="12" cy="8" r="3.75" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M4.5 20.5c1.2-3.9 4-5.9 7.5-5.9s6.3 2 7.5 5.9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MoreIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {[6, 12, 18].map((x) => (
        <circle key={x} cx={x} cy="12" r="1.6" fill="currentColor" />
      ))}
    </svg>
  );
}

export function BackIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path
        d="m14.5 5-7 7 7 7"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HeartIcon({ size = 22, filled }: IconProps & { filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 20.2c-.28 0-.55-.1-.76-.28-1.32-1.16-2.78-2.36-4.06-3.55C4.6 14.03 3 12.02 3 9.55 3 6.98 5.02 5 7.5 5c1.62 0 2.99.79 3.86 2.01a.78.78 0 0 0 1.28 0C13.51 5.79 14.88 5 16.5 5 18.98 5 21 6.98 21 9.55c0 2.47-1.6 4.48-4.18 6.82-1.28 1.19-2.74 2.4-4.06 3.55-.21.18-.48.28-.76.28Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={filled ? 0 : 1.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BookmarkIcon({ size = 21 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path
        d="M6.5 4.5A1.5 1.5 0 0 1 8 3h8a1.5 1.5 0 0 1 1.5 1.5v16l-6-4.2-6 4.2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PlusIcon({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path d="M12 5v14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function SunIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.5" />
      {[
        [12, 2.5, 12, 5],
        [12, 19, 12, 21.5],
        [2.5, 12, 5, 12],
        [19, 12, 21.5, 12],
        [4.9, 4.9, 6.7, 6.7],
        [17.3, 17.3, 19.1, 19.1],
        [4.9, 19.1, 6.7, 17.3],
        [17.3, 6.7, 19.1, 4.9],
      ].map(([x1, y1, x2, y2]) => (
        <path
          key={`${x1}-${y1}`}
          d={`M${x1} ${y1}L${x2} ${y2}`}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

export function MoonIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path
        d="M20.5 14.6A8.5 8.5 0 1 1 9.4 3.5a7 7 0 0 0 11.1 11.1Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
