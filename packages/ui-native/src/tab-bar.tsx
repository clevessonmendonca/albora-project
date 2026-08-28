import { Pressable, View } from "react-native";
import { Text } from "./text";

export type GuestTab = "feed" | "missoes" | "album" | "minhas";

const TABS: { id: GuestTab; label: string }[] = [
  { id: "feed", label: "Feed" },
  { id: "missoes", label: "Missões" },
  { id: "album", label: "Álbum" },
  { id: "minhas", label: "Minhas" },
];

export function TabBar({
  active,
  onSelect,
  onCamera,
}: {
  active: GuestTab;
  onSelect: (tab: GuestTab) => void;
  onCamera: () => void;
}) {
  return (
    <View className="flex-row items-center border-t border-linha bg-bg px-3 pb-6 pt-2">
      {TABS.slice(0, 2).map((tab) => (
        <Tab key={tab.id} tab={tab} active={active} onSelect={onSelect} />
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Câmera"
        onPress={onCamera}
        className="-mt-5 size-14 items-center justify-center rounded-pilula bg-acento"
      >
        <Text tone="onAccent" className="text-lg">
          +
        </Text>
      </Pressable>
      {TABS.slice(2).map((tab) => (
        <Tab key={tab.id} tab={tab} active={active} onSelect={onSelect} />
      ))}
    </View>
  );
}

function Tab({
  tab,
  active,
  onSelect,
}: {
  tab: { id: GuestTab; label: string };
  active: GuestTab;
  onSelect: (tab: GuestTab) => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: tab.id === active }}
      onPress={() => onSelect(tab.id)}
      className="flex-1 items-center gap-1"
    >
      <Text
        tone={tab.id === active ? "accent" : "muted"}
        className="text-[0.5625rem] uppercase tracking-rotulo"
      >
        {tab.label}
      </Text>
    </Pressable>
  );
}
