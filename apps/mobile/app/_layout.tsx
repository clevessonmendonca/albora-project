import { vars } from "nativewind";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { ALBORA_BRAND, toVariables } from "@albora/tokens";
import { ensureGuestUploadBackgroundTask } from "../src/background-drain";
import "../global.css";
import "../src/upload-task";

const brand = vars(toVariables(ALBORA_BRAND));

export default function RootLayout() {
  useEffect(() => {
    void ensureGuestUploadBackgroundTask();
  }, []);

  return (
    <View style={brand} className="flex-1 bg-bg">
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );
}
