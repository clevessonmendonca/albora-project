import { useCallback, useEffect, useState } from "react";
import { Image, Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { Button, Screen, Text } from "@albora/ui-native";
import { guestQueue } from "../src/disk";
import { drainGuestQueue, readDrainTelemetry } from "../src/drain-guest";
import { lerStatusBackgroundFetch } from "../src/background-status";
import { resumoDrainTexto, type DrainTelemetry } from "../src/drain-telemetry";
import { linhasDaFila, type LinhaFila } from "../src/queue-status";
import { reiniciarTodosFalhos } from "../src/queue-retry";

export default function QueueScreen() {
  const router = useRouter();
  const [linhas, setLinhas] = useState<LinhaFila[]>([]);
  const [drenando, setDrenando] = useState(false);
  const [telemetria, setTelemetria] = useState<DrainTelemetry | null>(null);
  const [bgRotulo, setBgRotulo] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    const itens = await guestQueue().list();
    setLinhas(linhasDaFila(itens, { enviandoId: drenando ? "primeiro" : null }));
    setTelemetria(await readDrainTelemetry());
    const bg = await lerStatusBackgroundFetch();
    setBgRotulo(bg.rotulo);
  }, [drenando]);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  const tentarDeNovo = useCallback(async () => {
    setDrenando(true);
    try {
      await reiniciarTodosFalhos(guestQueue());
      await drainGuestQueue(guestQueue(), "manual");
    } finally {
      setDrenando(false);
      await recarregar();
    }
  }, [recarregar]);

  const temFalha = linhas.some((l) => l.falhou);
  const subtitulo =
    linhas.length === 0
      ? "Nada pendente — pode fechar."
      : drenando
        ? "Enviando quando o sinal permitir…"
        : "Sem sinal — a gente reenvia sozinho quando voltar.";

  return (
    <Screen>
      <View className="flex-row items-center justify-between px-1 pt-2">
        <Pressable accessibilityRole="button" accessibilityLabel="Fechar fila" onPress={() => router.back()}>
          <Text tone="muted">Fechar</Text>
        </Pressable>
        <Text tone={linhas.length > 0 ? "accent" : "muted"}>
          {linhas.length === 0
            ? "Fila vazia"
            : linhas.length === 1
              ? "1 na fila"
              : `${linhas.length} na fila`}
        </Text>
      </View>

      <View className="mt-4 rounded-superficie border border-linha bg-superficie p-5">
        <Text title className="text-lg">
          Fila de envio
        </Text>
        <Text tone="muted" className="mt-2 text-sm leading-relaxed">
          {subtitulo}
        </Text>

        <ScrollView className="mt-4 max-h-80" contentContainerStyle={{ gap: 10 }}>
          {linhas.map((linha) => (
            <View key={linha.id} className="flex-row items-center gap-3 rounded-token bg-bg p-2">
              <View className="h-12 w-12 overflow-hidden rounded-token bg-superficie">
                {linha.caminhoPreview ? (
                  <Image source={{ uri: linha.caminhoPreview }} className="h-full w-full" resizeMode="cover" />
                ) : (
                  <View className="h-full w-full bg-linha/30" />
                )}
              </View>
              <View className="flex-1">
                <Text className="text-sm">{linha.tipo}</Text>
                <Text tone={linha.falhou ? "critical" : "muted"} className="text-xs">
                  {linha.estado}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>

        <View className="mt-4 flex-row gap-2">
          <View className="flex-1">
            <Button variant="secondary" onPress={() => router.back()}>
              Fechar
            </Button>
          </View>
          {temFalha || linhas.length > 0 ? (
            <View className="flex-1">
              <Button onPress={() => void tentarDeNovo()} disabled={drenando || linhas.length === 0}>
                {drenando ? "Enviando…" : "Tentar de novo"}
              </Button>
            </View>
          ) : null}
        </View>
      </View>

      {telemetria ? (
        <Text tone="muted" className="mt-4 px-1 text-xs leading-relaxed">
          {resumoDrainTexto(telemetria)}
          {bgRotulo ? `\nBackground fetch: ${bgRotulo}.` : ""}
        </Text>
      ) : null}
    </Screen>
  );
}
