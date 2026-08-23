import { useCallback, useEffect, useRef, useState } from "react";
import { Linking as RNLinking, Pressable, TextInput, View } from "react-native";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Button, Screen, Text } from "@albora/ui-native";
import {
  pairPayloadFromParams,
  pairPayloadKey,
  parsePairCodigoFromUrl,
  parsePairPassagemFromUrl,
  type PairRedeemPayload,
} from "../src/pair-link";
import { parseRedeemResponse, redeemUrl, SESSION_STORE_KEY, apiOrigin } from "../src/session";

const HOUSES = 4;

export default function PairScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ codigo?: string | string[]; passagem?: string | string[] }>();
  const refs = useRef<Array<TextInput | null>>([]);
  const lastKey = useRef<string | null>(null);
  const [digits, setDigits] = useState<string[]>(() => Array(HOUSES).fill(""));
  const [state, setState] = useState<"edit" | "sending" | "refused" | "error">("edit");
  const [autoRedeem, setAutoRedeem] = useState<PairRedeemPayload | null>(null);

  const code = digits.join("");
  const valid = /^\d{4}$/.test(code);

  const enqueue = useCallback((payload: PairRedeemPayload) => {
    const key = pairPayloadKey(payload);
    if (lastKey.current === key) return;
    lastKey.current = key;
    if ("codigo" in payload) setDigits(payload.codigo.split(""));
    setState("edit");
    setAutoRedeem(payload);
  }, []);

  const redeem = useCallback(
    async (payload: PairRedeemPayload) => {
      setState("sending");
      try {
        const response = await fetch(redeemUrl(), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const body: unknown = await response.json().catch(() => null);
        const session = parseRedeemResponse(body);
        if (response.ok && session) {
          await SecureStore.setItemAsync(SESSION_STORE_KEY, JSON.stringify(session));
          router.replace("/(tabs)/feed");
          return;
        }
        if (response.status === 409 || response.status === 422) setState("refused");
        else setState("error");
      } catch {
        setState("error");
      }
    },
    [router],
  );

  useEffect(() => {
    const fromParams = pairPayloadFromParams(params);
    if (fromParams) enqueue(fromParams);
  }, [params, enqueue]);

  useEffect(() => {
    function apply(url: string | null) {
      const passagem = parsePairPassagemFromUrl(url);
      if (passagem) {
        enqueue({ passagem });
        return;
      }
      const preenchido = parsePairCodigoFromUrl(url);
      if (!preenchido) return;
      enqueue({ codigo: preenchido });
    }
    void Linking.getInitialURL().then(apply);
    const sub = Linking.addEventListener("url", ({ url }) => apply(url));
    return () => sub.remove();
  }, [enqueue]);

  useEffect(() => {
    if (!autoRedeem || state !== "edit") return;
    const payload = autoRedeem;
    setAutoRedeem(null);
    void redeem(payload);
  }, [autoRedeem, state, redeem]);

  function update(index: number, value: string) {
    const clean = value.replace(/\D/g, "").slice(-1);
    setDigits((before) => {
      const next = [...before];
      next[index] = clean;
      return next;
    });
    if (clean && index < HOUSES - 1) refs.current[index + 1]?.focus();
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
        <Button
          onPress={() => void redeem({ codigo: code })}
          disabled={!valid || state === "sending"}
        >
          {state === "sending" ? "Entrando…" : "Continuar"}
        </Button>
        <Pressable
          onPress={() => void RNLinking.openURL(`${apiOrigin()}/privacidade`)}
          accessibilityRole="link"
          accessibilityLabel="Privacidade"
        >
          <Text tone="muted" className="text-center text-sm underline">
            Privacidade
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}
