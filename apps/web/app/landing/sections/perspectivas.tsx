"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { ALBORA_BRAND, resolveTokens, toVariables } from "@albora/tokens";
import { resolvePackText, type Pack } from "@albora/packs";

/**
 * Porte 1:1 da coreografia validada em protótipo isolado (scroll nativo,
 * rAF, só transform/opacity nas tiles): cena1 poucas fotos nos cantos →
 * cresce em elipse dourada → pico denso → recuo por posição/escala/opacidade
 * (sem blur) → convergência: as demais somem, a tile hero vira o telão.
 * Fotos reais no lugar do duotone do protótipo; cor só por token.
 */

const PHOTOS = [
  "/landing/gen/01-hero-festa.png",
  "/landing/gen/02-perspectivas.png",
  "/landing/gen/03-telao-festa.png",
  "/landing/gen/04-convidada-usando-albora.png",
  "/landing/gen/05-album-livro-produto.png",
  "/landing/gen/06-casal-revendo-album.png",
  "/landing/gen/07-pista-de-danca.png",
  "/landing/gen/08-telao-com-casal.png",
  "/landing/gen/09-amigos-na-mesa.png",
  "/landing/gen/10-dia-jardim.png",
] as const;

const MOMENTS = [
  "pista",
  "mesa",
  "abraço",
  "buquê",
  "risada",
  "brinde",
  "detalhe",
  "selfie",
  "família",
  "dança",
  "bastidor",
  "casal",
  "flores",
  "avós",
] as const;

const HERO = 0;

function clamp(v: number, a: number, b: number) {
  return v < a ? a : v > b ? b : v;
}
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function inv(a: number, b: number, v: number) {
  return b === a ? 0 : clamp((v - a) / (b - a), 0, 1);
}
function smooth(t: number) {
  return t * t * (3 - 2 * t);
}
function seg(p: number, a: number, b: number) {
  return smooth(inv(a, b, p));
}
function mulberry32(seed: number) {
  let rng = seed | 0;
  return function () {
    rng = (rng + 0x6d2b79f5) | 0;
    let t = Math.imul(rng ^ (rng >>> 15), 1 | rng);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Calm = { fx: number; fy: number; s: number; o: number };
type Tile = {
  el: HTMLDivElement;
  fx: number;
  fy: number;
  s: number;
  o: number;
  z: number;
  ex: number;
  ey: number;
  calm: Calm | null;
  appear: number;
  hero: boolean;
};

export function PerspectivasSection({ pack }: { pack: Pack }) {
  /** Escopo escuro só para o telão — mesmo truque do TelaoSection: um recorte de tokens com `background:"dark"`, não var() solto sem definição. */
  const TELAO_TOKENS = resolveTokens({
    marca: ALBORA_BRAND,
    pack: { ...pack.tokens, background: "dark" },
  });
  const telaoVars = toVariables(TELAO_TOKENS) as CSSProperties;
  const nomeExemplo = resolvePackText(pack, "landing.exemplo.nome");

  const trackRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const telaoRef = useRef<HTMLDivElement>(null);
  const cap1Ref = useRef<HTMLDivElement>(null);
  const cap2Ref = useRef<HTMLDivElement>(null);
  const cap4Ref = useRef<HTMLDivElement>(null);
  const cap5Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    const stage = stageRef.current;
    const telao = telaoRef.current;
    const cap1 = cap1Ref.current;
    const cap2 = cap2Ref.current;
    const cap4 = cap4Ref.current;
    const cap5 = cap5Ref.current;
    if (!track || !stage || !telao || !cap1 || !cap2 || !cap4 || !cap5) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let tiles: Tile[] = [];
    let baseH = 0;

    function build() {
      stage!.innerHTML = "";
      const isMobile = window.innerWidth <= 760;
      const N = isMobile ? 6 : 10;
      const rand = mulberry32(20260906);
      const next: Tile[] = [];

      for (let i = 0; i < N; i++) {
        const el = document.createElement("div");
        el.className = "px-tile";
        const photo = PHOTOS[i % PHOTOS.length];
        const isVid = i === 2 || i === 8;
        el.innerHTML =
          `<div class="px-ph" style="background-image:url('${photo}')"></div>` +
          `<span class="px-lbl">${MOMENTS[i % MOMENTS.length]}</span>` +
          (isVid ? `<span class="px-vid">▶</span>` : "");
        stage!.appendChild(el);

        const r = Math.sqrt((i + 0.5) / N);
        const ang = i * 2.399963;
        const spreadX = isMobile ? 0.3 : 0.44;
        const spreadY = isMobile ? 0.34 : 0.4;
        const fx = Math.cos(ang) * r * spreadX;
        const fy = Math.sin(ang) * r * spreadY;
        const depth = 0.4 + rand() * 0.6;
        const s = lerp(isMobile ? 0.7 : 0.55, isMobile ? 1.05 : 1.05, depth);
        const o = lerp(0.55, 1, depth);
        const z = Math.round(depth * 100);
        const mag = Math.hypot(fx, fy) || 0.001;
        const ex = (fx / mag) * 0.85;
        const ey = (fy / mag) * 0.75;

        let calm: Calm | null = null;
        if (i < 3) {
          const cx = [-0.4, 0.4, -0.34][i]!;
          const cy = [-0.26, 0.3, 0.34][i]!;
          calm = { fx: cx, fy: cy, s: isMobile ? 0.8 : 0.68, o: 0.96 };
        }
        const appear = i < 3 ? 0 : 0.12 + (i / N) * 0.34;
        next.push({ el, fx, fy, s, o, z, ex, ey, calm, appear, hero: i === HERO });
      }

      tiles = next;
      const isMobileNow = window.innerWidth <= 760;
      baseH =
        tiles[0]?.el.offsetHeight ||
        ((isMobileNow ? 30 : 13.5) * Math.min(window.innerWidth, window.innerHeight) * 16) /
          100 /
          9;
    }

    function apply(p: number) {
      const W = window.innerWidth;
      const H = window.innerHeight;
      const GROW0 = 0.12,
        GROW1 = 0.44,
        MSG0 = 0.6,
        MSG1 = 0.74,
        CONV0 = 0.8,
        CONV1 = 1.0;
      const conv = seg(p, CONV0, CONV1);
      const telaoH = telao!.offsetHeight || 0.52 * H;
      const heroTargetS = (telaoH * 0.82) / (baseH || 1);

      for (const t of tiles) {
        let x: number;
        let y: number;
        let s: number;
        let o: number;
        let z = t.z;

        if (t.calm) {
          const gg = seg(p, GROW0, GROW1);
          x = lerp(t.calm.fx, t.fx, gg);
          y = lerp(t.calm.fy, t.fy, gg);
          s = lerp(t.calm.s, t.s, gg);
          o = lerp(t.calm.o, t.o, gg);
        } else {
          const e = seg(p, t.appear, Math.min(t.appear + 0.16, 0.5));
          x = lerp(t.ex, t.fx, e);
          y = lerp(t.ey, t.fy, e);
          s = lerp(0.7, t.s, e);
          o = lerp(0, t.o, e);
        }

        const m = seg(p, MSG0, MSG1);
        if (!t.hero) {
          x *= lerp(1, 1.75, m);
          y *= lerp(1, 1.4, m);
          o *= lerp(1, 0.32, m);
          s *= lerp(1, 0.9, m);
        }

        if (conv > 0) {
          if (t.hero) {
            x = lerp(x, 0, conv);
            y = lerp(y, 0, conv);
            s = lerp(s, heroTargetS, conv);
            o = 1;
            z = 999;
          } else {
            x = lerp(x, x * 0.22, conv);
            y = lerp(y, y * 0.12, conv);
            s = lerp(s, 0.6, conv);
            o = lerp(o, 0, conv);
          }
        }

        t.el.style.opacity = o.toFixed(3);
        t.el.style.zIndex = String(z);
        t.el.style.transform =
          `translate(-50%,-50%) translate(${(x * W).toFixed(1)}px,${(y * H).toFixed(1)}px) ` +
          `scale(${s.toFixed(3)}) translateZ(0)`;
      }

      telao!.style.opacity = seg(p, 0.78, 0.9).toFixed(3);
      telao!.style.transform = `translate(-50%,-56%) scale(${lerp(0.96, 1, conv).toFixed(3)})`;

      cap1!.style.opacity = (1 - seg(p, 0.06, 0.14)).toFixed(3);

      cap2!.style.opacity = (seg(p, 0.15, 0.22) * (1 - seg(p, 0.46, 0.54))).toFixed(3);
      cap2!.style.transform = `translate(-50%,${lerp(-50, -54, seg(p, 0.15, 0.54)).toFixed(1)}%)`;

      cap4!.style.opacity = (seg(p, 0.62, 0.72) * (1 - seg(p, 0.8, 0.88))).toFixed(3);
      cap4!.style.transform = `translate(-50%,${lerp(-46, -52, seg(p, 0.6, 0.88)).toFixed(1)}%)`;

      cap5!.style.opacity = seg(p, 0.9, 0.99).toFixed(3);
      cap5!.style.transform = `translate(-50%,${lerp(36, 41, conv).toFixed(1)}vh)`;
    }

    function progress() {
      const r = track!.getBoundingClientRect();
      const course = track!.offsetHeight - window.innerHeight;
      return clamp(-r.top / (course || 1), 0, 1);
    }

    let raf = 0;
    let running = false;
    let lastScroll = 0;

    function frame(now: number) {
      apply(progress());
      if (now - lastScroll < 450) {
        raf = requestAnimationFrame(frame);
      } else {
        running = false;
      }
    }
    function kick() {
      lastScroll = performance.now();
      if (!running) {
        running = true;
        raf = requestAnimationFrame(frame);
      }
    }
    function onResize() {
      build();
      apply(progress());
    }

    let scrollBound = false;
    function bindScroll() {
      if (scrollBound) return;
      scrollBound = true;
      window.addEventListener("scroll", kick, { passive: true });
    }
    function unbindScroll() {
      if (!scrollBound) return;
      scrollBound = false;
      window.removeEventListener("scroll", kick);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          bindScroll();
          kick();
        } else {
          unbindScroll();
        }
      },
      { threshold: 0 },
    );
    observer.observe(track);

    window.addEventListener("resize", onResize);

    build();
    apply(progress());

    return () => {
      observer.disconnect();
      unbindScroll();
      window.removeEventListener("resize", onResize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section
      ref={trackRef}
      className="px-track"
      aria-label="Uma festa, centenas de perspectivas"
    >
      <style>{`
        .px-track { position: relative; height: 460vh; }
        .px-pin {
          position: sticky; top: 0; height: 100vh; overflow: hidden;
          background: var(--bg);
        }
        .px-pin::before {
          content: ""; position: absolute; inset: 0; pointer-events: none;
          opacity: .5; mix-blend-mode: multiply; z-index: 0;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='140' height='140' filter='url(%23n)' opacity='0.035'/></svg>");
        }

        /* Scrim de papel translúcido e esfumaçado atrás da legenda. O protótipo
           usava backdrop-blur (vidro fosco), que é anti-padrão bloqueante aqui —
           então a profundidade vem de um véu de papel semitransparente com as
           bordas em feather (as fotos vazam por trás), sem filtro de blur. Papel
           a ~76% mantém a Fraunces 300 legível sobre foto e sobre o fundo. */
        .px-cap {
          position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%);
          text-align: center; z-index: 80; pointer-events: none;
          width: min(88vw, 760px); will-change: opacity, transform;
          padding: clamp(1.75rem, 4vw, 3rem) clamp(1.75rem, 5vw, 3.5rem);
          isolation: isolate;
        }
        .px-cap > * { position: relative; z-index: 1; }
        .px-cap::before {
          content: ""; position: absolute; inset: -10% -8%; z-index: 0; pointer-events: none;
          background: color-mix(in srgb, var(--bg) 94%, transparent);
          border-radius: var(--raio-superficie);
          -webkit-mask-image: radial-gradient(ellipse at center, black 68%, transparent 100%);
          mask-image: radial-gradient(ellipse at center, black 68%, transparent 100%);
        }
        .px-cap h3, .px-cap .px-foot, .px-cap .px-sig, .px-cap small {
          text-shadow: 0 1px 12px color-mix(in srgb, var(--bg) 88%, transparent);
        }
        .px-cap h3 { font-size: clamp(40px, 8vw, 104px); margin: 0; }
        .px-cap-msg h3 { font-size: clamp(30px, 5.2vw, 68px); line-height: 1.06; }
        .px-cap small {
          display: block; font-size: 13px; letter-spacing: .06em;
          color: var(--ink-3); margin-top: 18px; font-family: var(--fonte-corpo);
        }
        .px-sig {
          font-family: var(--fonte-titulo); font-style: italic; font-weight: 300;
          color: var(--acento-texto); font-size: clamp(18px, 2.4vw, 26px); margin-top: 22px;
        }
        /* O fecho fica abaixo do telão, sobre o papel — texto escuro legível sem
           véu; o scrim ali virava uma faixa clara feia colada no telão. */
        .px-cap-final { color: var(--ink); }
        .px-cap-final::before { display: none; }
        .px-cap-final .px-sig { color: var(--acento-texto); }
        .px-foot { font-size: clamp(22px, 3.4vw, 40px); margin: 0; }
        .px-accent { color: var(--acento-texto); font-style: italic; }

        .px-stage { position: absolute; inset: 0; z-index: 20; }
        .px-tile {
          position: absolute; left: 50%; top: 50%; width: 13.5vmin; aspect-ratio: 9/16;
          border: 1px solid color-mix(in srgb, var(--ink) 20%, transparent); overflow: hidden;
          background: var(--superficie-alta); will-change: transform, opacity;
          transform: translate(-50%,-50%); backface-visibility: hidden;
        }
        .px-tile .px-ph {
          position: absolute; inset: 0; background-size: cover; background-position: center;
        }
        .px-tile .px-lbl {
          position: absolute; left: 7px; bottom: 6px; z-index: 2; font-size: 9.5px;
          letter-spacing: .08em; text-transform: uppercase; font-weight: 500;
          color: color-mix(in srgb, var(--bg) 86%, transparent);
          text-shadow: 0 1px 6px color-mix(in srgb, var(--ink) 70%, transparent);
        }
        .px-tile .px-vid {
          position: absolute; right: 6px; top: 6px; z-index: 2; width: 16px; height: 16px;
          border-radius: 50%; background: color-mix(in srgb, var(--ink) 50%, transparent);
          display: grid; place-items: center; color: var(--bg); font-size: 8px;
        }
        .px-tile .px-vid::after {
          content: ""; position: absolute; inset: -3px; border-radius: 50%;
          border: 1px solid color-mix(in srgb, var(--acento) 70%, transparent);
          animation: px-vp 2.2s var(--curva) infinite;
        }
        @keyframes px-vp { 0% { transform: scale(.8); opacity: .9; } 100% { transform: scale(1.5); opacity: 0; } }

        .px-telao {
          position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%); z-index: 60;
          width: min(82vw, 900px); aspect-ratio: 16/9; background: var(--bg);
          border: 1px solid color-mix(in srgb, var(--ink) 20%, transparent); border-radius: var(--raio-media);
          opacity: 0; will-change: opacity, transform; display: grid; place-items: stretch;
          overflow: hidden;
          padding: clamp(2.5rem, 5vw, 3.25rem) clamp(.75rem, 2.5vw, 1.25rem) clamp(.75rem, 2.5vw, 1.25rem);
        }
        .px-frameLbl {
          position: absolute; left: 16px; top: 13px; z-index: 3; font-size: 11px;
          letter-spacing: .16em; text-transform: uppercase; color: var(--acento-texto);
          display: flex; gap: 8px; align-items: center;
        }
        .px-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--acento); }
        .px-frameLbl b { color: var(--ink); font-weight: 600; font-family: var(--fonte-titulo); }
        .px-slot {
          height: 82%; aspect-ratio: 9/16; border: 1px solid color-mix(in srgb, var(--ink) 20%, transparent);
          position: relative; overflow: hidden;
        }
        .px-slot .px-slotPh { position: absolute; inset: 0; background-size: cover; background-position: center; }

        /* Convergência: a tela do telão exibindo três fotos ao vivo — grade
           limpa, sem moldura de polaroide (que poluía). Moldura fina clara
           (var(--ink) é claro no escopo dark do telão). */
        .px-triptico {
          display: grid; grid-template-columns: 1fr 1.12fr 1fr;
          gap: clamp(.75rem, 2vw, 1.75rem); width: 100%; height: 100%;
          align-items: center; justify-items: center;
        }
        /* Foto impressa (polaroid): moldura clara — var(--ink) é claro no escopo
           dark do telão —, base mais grossa, leve rotação. Menor que a tela,
           com respiro em volta. */
        .px-triptico-foto {
          position: relative; overflow: hidden; aspect-ratio: 3/4; height: 78%;
          background-size: cover; background-position: center;
          border: clamp(5px, .7vw, 9px) solid var(--ink);
          border-bottom-width: clamp(16px, 2.2vw, 28px);
          box-shadow: 0 .625rem 1.375rem color-mix(in srgb, var(--bg) 55%, transparent);
        }
        .px-triptico-foto:first-child { transform: rotate(-3deg); height: 70%; }
        .px-triptico-foto:nth-child(2) { transform: rotate(1.5deg); height: 84%; z-index: 2; }
        .px-triptico-foto:last-child { transform: rotate(3deg); height: 70%; }
        @media (max-width: 760px) {
          .px-triptico { gap: 8px; }
          .px-triptico-foto { border-width: 4px; border-bottom-width: 12px; }
        }

        .px-rm { display: none; }
        @media (prefers-reduced-motion: reduce) {
          .px-track { display: none; }
          .px-rm { display: block; }
        }
        .px-rm-chap {
          max-width: 980px; margin: 0 auto; padding: 80px 28px;
          border-bottom: 1px solid var(--linha);
        }
        .px-rm-chap h3 { font-size: clamp(34px, 6vw, 72px); margin: 14px 0 0; }
        .px-rm-eyebrow {
          font-size: 12px; font-weight: 600; letter-spacing: .2em; text-transform: uppercase;
          color: var(--acento-texto); margin: 0; display: inline-flex; align-items: center; gap: .6em;
        }
        .px-rm-eyebrow::before { content: ""; width: 24px; height: 1px; background: var(--acento); }
        .px-rm-grid {
          display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-top: 26px;
        }
        .px-rm-tile {
          position: relative; aspect-ratio: 9/16; overflow: hidden;
          border: 1px solid color-mix(in srgb, var(--ink) 20%, transparent); background: var(--superficie-alta);
        }
        .px-rm-tile img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
        .px-rm-tile span {
          position: absolute; left: 6px; bottom: 5px; font-size: 9px; letter-spacing: .06em;
          text-transform: uppercase; color: color-mix(in srgb, var(--bg) 86%, transparent);
          text-shadow: 0 1px 6px color-mix(in srgb, var(--ink) 70%, transparent);
        }
        .px-rm-tfin { background: var(--bg); color: var(--ink); }
        .px-rm-tfin p { color: var(--ink-2); font-family: var(--fonte-titulo); font-style: italic; margin: 12px 0 0; }
        @media (max-width: 760px) {
          .px-rm-grid { grid-template-columns: repeat(3, 1fr); }
        }

        @media (max-width: 760px) {
          .px-track { height: 320vh; }
          .px-tile { width: 30vmin; }
          .px-tile .px-lbl, .px-tile .px-vid { display: none; }
          .px-cap { width: 90vw; padding: 1.25rem 1.5rem; }
          .px-cap h3 { font-size: clamp(34px, 11vw, 60px); }
        }
      `}</style>

      <div className="px-pin">
        <div className="px-stage" ref={stageRef} aria-hidden="true" />

        <div className="px-telao" ref={telaoRef} aria-hidden="true" style={telaoVars}>
          <div className="px-frameLbl">
            <span className="px-dot" /> Telão · ao vivo <b>· {nomeExemplo}</b>
          </div>
          <div className="px-triptico">
            <div
              className="px-triptico-foto"
              style={{ backgroundImage: `url(${PHOTOS[6]})` }}
            />
            <div
              className="px-triptico-foto"
              style={{ backgroundImage: `url(${PHOTOS[HERO]})` }}
            />
            <div
              className="px-triptico-foto"
              style={{ backgroundImage: `url(${PHOTOS[8]})` }}
            />
          </div>
        </div>

        <div className="px-cap" ref={cap1Ref}>
          <h3 className="tipo-display">Uma festa.</h3>
        </div>

        <div className="px-cap" ref={cap2Ref}>
          <h3 className="tipo-display">
            Cada pessoa.
            <br />
            Um olhar diferente.
          </h3>
          <small>momentos que uma pessoa sozinha não alcança</small>
        </div>

        <div className="px-cap px-cap-msg" ref={cap4Ref}>
          <h3 className="tipo-display">
            A história da sua festa,
            <br />
            contada por <span className="px-accent">todos que estiveram lá.</span>
          </h3>
        </div>

        <div className="px-cap px-cap-final" ref={cap5Ref}>
          <p className="px-foot tipo-display">Todos os momentos. Um só lugar.</p>
          <p className="px-sig">Tiradas por quem viveu.</p>
        </div>
      </div>

      {/* prefers-reduced-motion: composição editorial estática, sem scroll/rAF */}
      <div className="px-rm">
        <section className="px-rm-chap">
          <p className="px-rm-eyebrow">Uma festa</p>
          <h3 className="tipo-display">Uma festa.</h3>
        </section>
        <section className="px-rm-chap">
          <p className="px-rm-eyebrow">Muitas pessoas</p>
          <h3 className="tipo-display">Cada pessoa. Um olhar diferente.</h3>
          <div className="px-rm-grid">
            {Array.from({ length: 12 }, (_, i) => (
              <div className="px-rm-tile" key={i}>
                <img
                  src={PHOTOS[i % PHOTOS.length]}
                  alt={`Foto de festa: ${MOMENTS[i % MOMENTS.length]}`}
                  loading="lazy"
                />
                <span>{MOMENTS[i % MOMENTS.length]}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="px-rm-chap px-rm-tfin" style={telaoVars}>
          <p className="px-rm-eyebrow">Albora reúne</p>
          <h3 className="tipo-display">Todos os momentos. Um só lugar.</h3>
          <p>Tiradas por quem viveu — no telão, ao vivo.</p>
        </section>
      </div>
    </section>
  );
}
