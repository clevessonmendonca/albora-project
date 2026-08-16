import { Screen, Text } from "@albora/ui-native";

export default function AlbumScreen() {
  return (
    <Screen>
      <Text title className="text-2xl">
        Álbum
      </Text>
      <Text tone="muted" className="mt-3">
        A noite em capítulos. A montagem é a mesma GET /api/album da web.
      </Text>
    </Screen>
  );
}
