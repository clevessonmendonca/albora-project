import { Screen, Text } from "@albora/ui-native";

export default function MineScreen() {
  return (
    <Screen>
      <Text title className="text-2xl">
        Minhas
      </Text>
      <Text tone="muted" className="mt-3">
        As suas fotos. Stories com moldura ficam para a manhã seguinte.
      </Text>
    </Screen>
  );
}
