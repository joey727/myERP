import { Tabs } from "expo-router";

import { useResponsive } from "@/ui/design";
import { AdaptiveTabBar } from "@/ui/nav";
import { layout } from "@/ui/tokens";

export default function TabsLayout() {
  const { isExpanded, isMedium } = useResponsive();

  return (
    <Tabs
      screenOptions={{
        animation: "none",
        headerShown: false,
        sceneStyle: {
          paddingLeft: isExpanded ? layout.sidebar : isMedium ? layout.rail : 0
        }
      }}
      tabBar={(props) => <AdaptiveTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="sales" options={{ title: "Sell" }} />
      <Tabs.Screen name="inventory" options={{ title: "Stock" }} />
      <Tabs.Screen name="customers" options={{ title: "Customers" }} />
      <Tabs.Screen name="staff" options={{ title: "Staff" }} />
      <Tabs.Screen name="reports" options={{ title: "Reports" }} />
      <Tabs.Screen name="more" options={{ title: "More" }} />
    </Tabs>
  );
}
