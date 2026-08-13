/**
 * O logo animado do pacote de marca, **inlinado**.
 *
 * Servido por `<img>` ele não desenha: as animações CSS de dentro do SVG não
 * rodam nesse contexto, e como todo elemento dela começa em `opacity: 0` o
 * resultado é um cabeçalho vazio — foi o que aconteceu. Inline, o CSS vive no
 * documento e a animação roda.
 *
 * As classes e os ids vêm prefixados com `mk-`/`mk` porque agora dividem
 * espaço com a página: um `.nome` solto colidiria com qualquer coisa.
 *
 * O `prefers-reduced-motion` já vem tratado dentro do próprio SVG do pacote.
 */
export function MarcaAnimada({ altura = "2rem" }: { altura?: string }) {
  return (
    <span
      aria-label="Albora"
      role="img"
      className="block aspect-[300/64]"
      style={{ height: altura }}
      // O SVG é ativo estático do pacote de marca, não entrada de usuário.
      dangerouslySetInnerHTML={{ __html: SVG }}
    />
  );
}

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 64" width="100%" height="100%" role="img" aria-label="Albora"><title>Albora</title><defs><linearGradient id="mkGrad" gradientUnits="userSpaceOnUse" x1="32" y1="44" x2="32" y2="19"><stop offset="0" stop-color="#8A3A12"/><stop offset=".5" stop-color="#C2410C"/><stop offset="1" stop-color="#D9793C"/></linearGradient><clipPath id="mkHz"><rect x="0" y="0" width="64" height="43"/></clipPath><style>.mk-arco{stroke-dasharray:65.97;stroke-dashoffset:65.97;animation:tracar .9s cubic-bezier(.3,.7,.3,1) .1s forwards}\n.mk-sobe{transform:translateY(11px);animation:subir .55s cubic-bezier(.2,.8,.3,1) .85s forwards}\n.sol{transform:scale(.5);opacity:0;animation:assentar .5s cubic-bezier(.2,.9,.3,1) .95s forwards}\n@keyframes tracar{to{stroke-dashoffset:0}}\n@keyframes subir{to{transform:translateY(0)}}\n@keyframes assentar{0%{transform:scale(.5);opacity:0}30%{opacity:1}55%{transform:scale(1.35)}100%{transform:scale(1);opacity:1}}\n.flash{transform:scale(.15);opacity:0;animation:estourar .5s cubic-bezier(.15,.85,.35,1) 1.3s forwards}\n@keyframes estourar{0%{transform:scale(.15) rotate(-18deg);opacity:0}22%{opacity:1}45%{transform:scale(1) rotate(0deg);opacity:.95}100%{transform:scale(.2) rotate(12deg);opacity:0}}\n.mk-nome{opacity:0;transform:translateY(7px);animation:surgir .6s cubic-bezier(.2,.75,.3,1) 1.42s forwards}\n@keyframes surgir{to{opacity:1;transform:translateY(0)}}\n@media (prefers-reduced-motion:reduce){.mk-arco{animation:none;stroke-dashoffset:0}.mk-sobe{animation:none;transform:none}.sol{animation:none;transform:none;opacity:1}.flash{animation:none;opacity:0}.mk-nome{animation:none;opacity:1;transform:none}}</style></defs><path class="mk-arco" d="M11 42 A21 21 0 0 1 53 42" fill="none" stroke="url(#mkGrad)" stroke-width="2.4" stroke-linecap="round"/><g clip-path="url(#mkHz)"><g transform="translate(32 39.4)"><g class="mk-sobe"><circle class="sol" r="2.9" fill="#C2410C"/></g></g></g><g transform="translate(32 39.4)"><path class="flash" d="M0 -13 Q0 0 13 0 Q0 0 0 13 Q0 0 -13 0 Q0 0 0 -13 Z" fill="#F6C98B"/></g><text class="mk-nome" x="86" y="46" font-family="Fraunces, Georgia, serif" font-weight="400" font-size="42" letter-spacing="3.4" fill="#1A1613">Albora</text></svg>';
