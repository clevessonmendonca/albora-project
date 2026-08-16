import { Screen, Text } from "@albora/ui-native";

export default function MissionsScreen() {
  return (
    <Screen>
      <Text title className="text-2xl">
        Missões
      </Text>
      <Text tone="muted" className="mt-3">
        As mesmas do pack da web. O vocabulário mora em @albora/packs, não nesta tela.
      </Text>
    </Screen>
  );
}
