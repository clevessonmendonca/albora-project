import { Pressable, ScrollView } from "react-native";
import { Text } from "@albora/ui-native";
import type { Preset } from "@albora/core";

/** Tira horizontal de presets de cor para o convidado escolher antes de enviar. O convidado toca num chip para selecionar; toca no mesmo chip de novo (ou no "Original") para remover o filtro. O preset aplicado sai de `processarFoto` via `bufferDrawer.filtrar` — a tira não faz math de cor, só exibe nomes. Tokens: bg-acento (selecionado), bg-superficie (idle), text-sobre-acento / text-ink-2 para texto — nenhum hex. */
export function FilterStrip({
  presets,
  escolhido,
  onEscolher,
}: {
  presets: readonly Preset[];
  escolhido: Preset | null;
  onEscolher: (preset: Preset | null) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2 px-4"
    >
      <Chip
        rotulo="Original"
        ativo={escolhido === null}
        onPress={() => onEscolher(null)}
      />
      {presets.map((p) => (
        <Chip
          key={p.id}
          rotulo={p.nome}
          ativo={escolhido?.id === p.id}
          onPress={() => onEscolher(escolhido?.id === p.id ? null : p)}
        />
      ))}
    </ScrollView>
  );
}

function Chip({
  rotulo,
  ativo,
  onPress,
}: {
  rotulo: string;
  ativo: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: ativo }}
      onPress={onPress}
      className={`min-h-9 items-center justify-center rounded-pilula border px-4 ${
        ativo ? "border-acento bg-acento" : "border-linha bg-superficie"
      }`}
    >
      <Text
        tone={ativo ? "onAccent" : "muted"}
        className="text-xs tracking-widest"
      >
        {rotulo}
      </Text>
    </Pressable>
  );
}
