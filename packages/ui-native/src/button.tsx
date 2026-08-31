import type { ReactNode } from "react";
import { Pressable } from "react-native";
import { Text } from "./text";

export function Button({
  children,
  onPress,
  disabled = false,
  variant = "primary",
}: {
  children: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}) {
  const surface =
    variant === "primary"
      ? "bg-acento"
      : "border border-linha bg-transparent";
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      className={`min-h-11 items-center justify-center rounded-pilula px-6 ${surface} ${
        disabled ? "opacity-55" : ""
      }`}
    >
      <Text tone={variant === "primary" ? "onAccent" : "ink"} className="font-medium">
        {children}
      </Text>
    </Pressable>
  );
}
