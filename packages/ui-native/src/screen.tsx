import type { ReactNode } from "react";
import { View } from "react-native";

export function Screen({ children }: { children: ReactNode }) {
  return <View className="flex-1 bg-bg px-6 pt-12">{children}</View>;
}
