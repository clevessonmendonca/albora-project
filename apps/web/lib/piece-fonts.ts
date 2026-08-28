import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);

/** Faces OFL no lockfile (Fraunces 600, Instrument Sans 400, subset latin) — sem fetch em runtime; CI não fala com Google Fonts. */
const SERIF = "@fontsource/fraunces/files/fraunces-latin-600-normal.woff";
const SANS = "@fontsource/instrument-sans/files/instrument-sans-latin-400-normal.woff";

export type PrintFonts = {
  serif: Uint8Array;
  sans: Uint8Array;
};

let cached: PrintFonts | undefined;

function loadWoff(specifier: string): Uint8Array {
  return new Uint8Array(readFileSync(require.resolve(specifier)));
}

export function loadPrintFonts(): PrintFonts {
  cached ??= {
    serif: loadWoff(SERIF),
    sans: loadWoff(SANS),
  };
  return cached;
}
