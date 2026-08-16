import { useRouter } from "expo-router";
import { Button, Screen, Text } from "@albora/ui-native";

export default function PhotoScreen() {
  const router = useRouter();
  return (
    <Screen>
      <Text title className="text-2xl">
        Câmera
      </Text>
      <Text tone="muted" className="mt-3">
        A câmera nativa entra na task 017. Até lá a primeira foto continua na web — esta tela não é porta de entrada.
      </Text>
      <Button onPress={() => router.back()}>Voltar</Button>
    </Screen>
  );
}
