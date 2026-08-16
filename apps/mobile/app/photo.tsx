import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { randomUUID } from "expo-crypto";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { QUALITY } from "@albora/core";
import { Button, Screen, Text } from "@albora/ui-native";
import { persistCapture } from "../src/capture";
import { diskFiles, guestQueue, mediaRoot } from "../src/disk";
import { parseStoredSession, SESSION_STORE_KEY, type GuestSession } from "../src/session";
import { drainFileQueue } from "../src/upload";

export default function PhotoScreen() {
  const router = useRouter();
  const camera = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [session, setSession] = useState<GuestSession | null | undefined>(undefined);
  const [pending, setPending] = useState(0);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const raw = await SecureStore.getItemAsync(SESSION_STORE_KEY);
      setSession(parseStoredSession(raw));
      setPending((await guestQueue().list()).length);
    })();
  }, []);

  if (session === undefined || permission === null) {
    return <View className="flex-1 bg-bg" />;
  }

  if (session === null) {
    return (
      <Screen>
        <Text title className="text-2xl">
          Câmera
        </Text>
        <Text tone="muted" className="mt-3">
          Pareie de novo para tirar foto.
        </Text>
        <View className="mt-6">
          <Button onPress={() => router.replace("/pair")}>Parear</Button>
        </View>
      </Screen>
    );
  }

  if (!permission.granted) {
    return (
      <Screen>
        <Text title className="text-2xl">
          Câmera
        </Text>
        <Text tone="muted" className="mt-3">
          Sem a câmera o app não tem o que enviar.
        </Text>
        <View className="mt-6">
          {permission.canAskAgain ? (
            <Button onPress={() => void requestPermission()}>Permitir câmera</Button>
          ) : (
            <Text tone="muted">Abra Ajustes e permita a câmera.</Text>
          )}
        </View>
        <View className="mt-4">
          <Button variant="secondary" onPress={() => router.back()}>
            Voltar
          </Button>
        </View>
      </Screen>
    );
  }

  async function shoot() {
    if (busy || session === null || session === undefined) return;
    setBusy(true);
    setErro(null);
    try {
      const shot = await camera.current?.takePictureAsync({
        quality: QUALITY.full,
        exif: false,
        skipProcessing: false,
      });
      if (!shot?.uri) {
        setErro("Não consegui tirar a foto. Tente de novo.");
        return;
      }

      const result = await persistCapture({
        source: { uri: shot.uri, width: shot.width, height: shot.height },
        eventoId: session.eventoId,
        queue: guestQueue(),
        files: diskFiles(),
        destDir: mediaRoot(),
        id: () => randomUUID(),
      });

      if (!result.ok) {
        setErro(result.erro);
        return;
      }

      setPending((await guestQueue().list()).length);
      void drainFileQueue(guestQueue());
    } catch {
      setErro("Não consegui tirar a foto. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="flex-1 bg-bg">
      <View className="flex-row items-center justify-between px-6 pt-12">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={() => router.back()}
        >
          <Text tone="muted">Voltar</Text>
        </Pressable>
        <Text tone={pending > 0 ? "accent" : "muted"}>
          {pending === 0 ? "Câmera" : pending === 1 ? "1 na fila" : `${pending} na fila`}
        </Text>
      </View>

      <View className="mx-3 mt-3 min-h-[16rem] flex-1 overflow-hidden rounded-superficie bg-superficie">
        <CameraView ref={camera} facing="back" style={{ flex: 1 }} />
      </View>

      {erro ? (
        <Text tone="critical" className="mt-3 px-6">
          {erro}
        </Text>
      ) : null}

      <View className="items-center px-7 pb-9 pt-5">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fotografar"
          disabled={busy}
          onPress={() => void shoot()}
          className={`size-16 items-center justify-center rounded-pilula border-2 border-ink ${
            busy ? "opacity-55" : ""
          }`}
        >
          <View className="size-12 rounded-pilula bg-acento" />
        </Pressable>
      </View>
    </View>
  );
}
