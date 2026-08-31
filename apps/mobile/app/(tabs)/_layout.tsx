import { Tabs, useRouter } from "expo-router";
import { TabBar, type GuestTab } from "@albora/ui-native";

const HREF: Record<GuestTab, "/(tabs)/feed" | "/(tabs)/missions" | "/(tabs)/album" | "/(tabs)/mine"> = {
  feed: "/(tabs)/feed",
  missoes: "/(tabs)/missions",
  album: "/(tabs)/album",
  minhas: "/(tabs)/mine",
};

export default function TabsLayout() {
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state }) => {
        const name = state.routes[state.index]?.name;
        const active: GuestTab =
          name === "missions" ? "missoes" : name === "album" ? "album" : name === "mine" ? "minhas" : "feed";
        return (
          <TabBar
            active={active}
            onSelect={(tab) => router.navigate(HREF[tab])}
            onCamera={() => router.navigate("/photo")}
          />
        );
      }}
    >
      <Tabs.Screen name="feed" />
      <Tabs.Screen name="missions" />
      <Tabs.Screen name="album" />
      <Tabs.Screen name="mine" />
    </Tabs>
  );
}
