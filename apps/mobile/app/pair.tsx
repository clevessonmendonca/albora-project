import { useRef, useState } from "react";
import { TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Button, Screen, Text } from "@albora/ui-native";
import { parseRedeemResponse, redeemUrl } from "../src/session";

const HOUSES = 4;

export default function PairScreen() {
  const router = useRouter();
  const refs = useRef<Array<TextInput | null>>([]);
  const [digits, setDigits] = useState<string[]>(() => Array(HOUSES).fill(""));
  const [state, setState] = useState<"edit" | "sending" | "refused" | "error">("edit");

  const code = digits.join("");
  const valid = /^\d{4}$/.test(code);

  function update(index: number, value: string) {
    const clean = value.replace(/\D/g, "").slice(-1);
    setDigits((before) => {
      const next = [...before];
      next[index] = clean;
      return next;
    });
    if (clean && index < HOUSES - 1) refs.current[index + 1]?.focus();
  }

  async function redeem() {
    if (!valid) return;
    setState("sending");
    try {
      const response = await fetch(redeemUrl(), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ codigo: code }),
      });
      const body: unknown = await response.json().catch(() => null);
      const session = parseRedeemResponse(body);
      if (response.ok && session) {
        await SecureStore.setItemAsync("albora.sessao", JSON.stringify(session));
        router.replace("/(tabs)/feed");
        return;
      }
      if (response.status === 409 || response.status === 422) setState("refused");
      else setState("error");
    } catch {
      setState("error");
    }
  }

  return (
    <Screen>
      <View className="flex-1 justify-center gap-5">
        <Text title className="text-2xl">
          Digite o código
        </Text>
        <Text tone="muted">Quatro números que aparecem na web depois da primeira foto.</Text>
        <View className="flex-row justify-center gap-3" accessibilityLabel="Código de pareamento">
          {digits.map((digit, index) => (
            <TextInput
              key={index}
              ref={(el) => {
                refs.current[index] = el;
              }}
              value={digit}
              onChangeText={(value) => update(index, value)}
              keyboardType="number-pad"
              maxLength={1}
              accessibilityLabel={`Dígito ${index + 1}`}
              className="h-16 w-14 rounded-token border border-linha bg-superficie text-center font-titulo text-2xl text-ink"
            />
          ))}
        </View>
        {state === "refused" ? (
          <Text tone="critical">Código inválido ou expirado. Peça outro na web.</Text>
        ) : null}
        {state === "error" ? <Text tone="critical">Não deu para parear agora. Tente de novo.</Text> : null}
        <Button onPress={() => void redeem()} disabled={!valid || state === "sending"}>
          {state === "sending" ? "Entrando…" : "Continuar"}
        </Button>
      </View>
    </Screen>
  );
}
