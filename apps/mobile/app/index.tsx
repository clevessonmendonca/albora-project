import * as SecureStore from "expo-secure-store";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { parseStoredSession, SESSION_STORE_KEY } from "../src/session";

/** Com sessão válida vai direto pro feed; senão parear. */
export default function Index() {
  const [destino, setDestino] = useState<"/(tabs)/feed" | "/pair" | null>(null);

  useEffect(() => {
    void (async () => {
      const raw = await SecureStore.getItemAsync(SESSION_STORE_KEY);
      setDestino(parseStoredSession(raw) ? "/(tabs)/feed" : "/pair");
    })();
  }, []);

  if (!destino) return <View className="flex-1 bg-bg" />;
  return <Redirect href={destino} />;
}
