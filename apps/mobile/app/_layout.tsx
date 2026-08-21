import { vars } from "nativewind";
import { Stack, usePathname } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as SecureStore from "expo-secure-store";
import {
  brandFallbackVariables,
  fetchGuestEventTheme,
  themeBackgroundFromEvent,
  themeVariablesFromEvent,
} from "../src/event-theme";
import { ensureGuestUploadBackgroundTask } from "../src/background-drain";
import { guestQueue } from "../src/disk";
import { drainGuestQueue } from "../src/drain-guest";
import { subscribeForegroundDrain } from "../src/foreground-drain";
import { parseStoredSession, SESSION_STORE_KEY } from "../src/session";
import "../global.css";
import "../src/upload-task";

export default function RootLayout() {
  const pathname = usePathname();
  const [themeVars, setThemeVars] = useState<Record<string, string>>(() => brandFallbackVariables());
  const [statusStyle, setStatusStyle] = useState<"light" | "dark">("light");

  useEffect(() => {
    void ensureGuestUploadBackgroundTask();
  }, []);

  useEffect(() => {
    return subscribeForegroundDrain(() => drainGuestQueue(guestQueue()));
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const raw = await SecureStore.getItemAsync(SESSION_STORE_KEY);
      const session = parseStoredSession(raw);
      if (!session) {
        if (!cancelled) {
          setThemeVars(brandFallbackVariables());
          setStatusStyle("light");
        }
        return;
      }
      const theme = await fetchGuestEventTheme(session);
      if (cancelled) return;
      if (!theme) {
        setThemeVars(brandFallbackVariables());
        setStatusStyle("light");
        return;
      }
      setThemeVars(themeVariablesFromEvent(theme));
      setStatusStyle(themeBackgroundFromEvent(theme) === "dark" ? "light" : "dark");
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const rootStyle = useMemo(() => vars(themeVars), [themeVars]);

  return (
    <View style={rootStyle} className="flex-1 bg-bg">
      <StatusBar style={statusStyle} />
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );
}
