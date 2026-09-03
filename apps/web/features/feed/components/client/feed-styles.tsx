"use client";

export function FeedStyles() {
  return (
    <style>{`
      @keyframes feed-amanhecer {
        from { opacity: 0; filter: brightness(0.4) saturate(0.6); }
        to   { opacity: 1; filter: none; }
      }
      @keyframes feed-respirar {
        0%, 100% { opacity: 1; }
        50%      { opacity: 0.55; }
      }
      @keyframes feed-fade-in {
        from { opacity: 0; }
        to   { opacity: 1; }
      }
      .feed-amanhece { animation: feed-amanhecer var(--tempo-lento) var(--curva) both; }
      .feed-esperando { animation: feed-respirar 1900ms var(--curva) infinite; }
      .feed-fade { animation: feed-fade-in 200ms var(--curva) both; }
      @keyframes feed-pill-entra {
        from { transform: translate(-50%, -2.5rem); opacity: 0 }
        to   { transform: translate(-50%, 0);       opacity: 1 }
      }
      .feed-pill { animation: feed-pill-entra 280ms var(--curva) both }
      @media (prefers-reduced-motion: reduce) {
        .feed-amanhece, .feed-esperando, .feed-fade { animation: none !important; }
        .feed-pill { animation: none !important; }
      }
    `}</style>
  );
}
