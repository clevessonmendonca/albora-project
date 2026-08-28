/**
 * Tailwind v4 entra pelo plugin de PostCSS — não há mais `tailwind.config.js`.
 * O que era `content` agora é `@source` dentro do CSS (ver `app/tailwind.css`),
 * para o Tailwind varrer também os primitivos donos de `@albora/ui-web`.
 */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
