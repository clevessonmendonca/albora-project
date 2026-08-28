/** Fontes OFL embutidas para molduras Skia — paridade com web/PDF. Nunca importe de `*.test.ts` (nativo + assets). */
import { Asset } from "expo-asset";
import { Skia, matchFont, type SkFont, type SkTypefaceFontProvider } from "@shopify/react-native-skia";
import { familiaEmbutidaDaStack, primeiraFamiliaFonte } from "./share-font-stack";
import { SHARE_FONT_MODULES } from "./share-font-modules";

const FAMILIAS_EMBUTIDAS = ["Fraunces", "Instrument Sans"] as const;
type FamiliaEmbutida = (typeof FAMILIAS_EMBUTIDAS)[number];

const MODULOS: Record<FamiliaEmbutida, number> = SHARE_FONT_MODULES;

let provider: SkTypefaceFontProvider | null = null;
let carregando: Promise<void> | null = null;

async function registrarFamilia(mgr: SkTypefaceFontProvider, familia: FamiliaEmbutida): Promise<void> {
  const asset = Asset.fromModule(MODULOS[familia]);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  const data = await Skia.Data.fromURI(uri);
  const typeface = Skia.Typeface.MakeFreeTypeFaceFromData(data);
  if (!typeface) throw new Error(`Skia: falha ao carregar ${familia}`);
  mgr.registerTypeface(typeface, familia);
}

/** Idempotente — chamado no boot e antes do primeiro share. */
export async function ensureShareFonts(): Promise<void> {
  if (provider) return;
  if (carregando) {
    await carregando;
    return;
  }

  carregando = (async () => {
    const mgr = Skia.TypefaceFontProvider.Make();
    for (const familia of FAMILIAS_EMBUTIDAS) {
      await registrarFamilia(mgr, familia);
    }
    provider = mgr;
  })();

  try {
    await carregando;
  } finally {
    carregando = null;
  }
}

export function resetShareFontsForTests(): void {
  provider = null;
  carregando = null;
}

export function matchShareFont(opts: {
  stack: string;
  size: number;
  weight?: "normal" | "bold";
}): SkFont {
  const embutida = familiaEmbutidaDaStack(opts.stack);
  const familia = embutida ?? primeiraFamiliaFonte(opts.stack);
  const style = {
    fontFamily: embutida ?? familia,
    fontSize: opts.size,
    fontWeight: opts.weight === "bold" ? ("600" as const) : ("400" as const),
    fontStyle: "normal" as const,
  };

  if (embutida && provider) {
    return matchFont(style, provider);
  }
  return matchFont(style);
}
