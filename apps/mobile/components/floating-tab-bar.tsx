import { StyleSheet, View, type ViewStyle } from "react-native";

import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import {
  ChartColumnBig,
  House,
  Sparkles,
  Users,
  WalletCards,
} from "lucide-react-native";

import { BottomPillNav } from "@/components/bottom-pill-nav";

const TAB_ITEMS = [
  { key: "home", label: "Home", icon: House },
  { key: "market", label: "Mandi", icon: ChartColumnBig },
  { key: "voice", label: "", icon: Sparkles, hero: true },
  { key: "community", label: "Chat", icon: Users },
  { key: "expenses", label: "Expense", icon: WalletCards },
] as const;

export function FloatingTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const activeOptions = descriptors[state.routes[state.index]?.key]?.options;
  const flattenedStyle = StyleSheet.flatten(activeOptions?.tabBarStyle) as
    | ViewStyle
    | undefined;
  const activeRouteName = state.routes[state.index]?.name;

  if (flattenedStyle?.display === "none") {
    return null;
  }

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      <BottomPillNav
        items={TAB_ITEMS.map((item) => ({
          ...item,
          active: activeRouteName === item.key,
          onPress: () => navigation.navigate(item.key),
        }))}
      />
    </View>
  );
}
