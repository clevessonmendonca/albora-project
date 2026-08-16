import { Screen, Text } from "@albora/ui-native";

export default function FeedScreen() {
  return (
    <Screen>
      <Text title className="text-2xl">
        Feed
      </Text>
      <Text tone="muted" className="mt-3">
        O que já está no telão. Sem contagem, sem laço para voltar a cada cinco minutos.
      </Text>
    </Screen>
  );
}
