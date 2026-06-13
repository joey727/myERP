import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { useSession } from "@/auth/session";
import { canAccess } from "@/auth/permissions";
import { colors, fontSize } from "@/ui/theme";

export default function TabsLayout() {
  const { staffRole } = useSession();
  const role = staffRole ?? "cashier";

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.ink,
        headerTitleStyle: { fontWeight: "800" },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontWeight: "700", fontSize: fontSize.xs },
        tabBarStyle: {
          borderTopColor: colors.border,
          backgroundColor: colors.panel,
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.04,
          shadowRadius: 4,
          elevation: 4,
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => <Ionicons color={color} name="speedometer-outline" size={size + 2} />
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: "Inventory",
          tabBarIcon: ({ color, size }) => <Ionicons color={color} name="cube-outline" size={size + 2} />
        }}
      />
      <Tabs.Screen
        name="sales"
        options={{
          title: "Sales",
          tabBarIcon: ({ color, size }) => <Ionicons color={color} name="cart-outline" size={size + 2} />
        }}
      />
      {canAccess(role, "staff:view") && (
        <Tabs.Screen
          name="staff"
          options={{
            title: "Staff",
            tabBarIcon: ({ color, size }) => <Ionicons color={color} name="people-outline" size={size + 2} />
          }}
        />
      )}
      {canAccess(role, "reports:view") && (
        <Tabs.Screen
          name="reports"
          options={{
            title: "Reports",
            tabBarIcon: ({ color, size }) => <Ionicons color={color} name="bar-chart-outline" size={size + 2} />
          }}
        />
      )}
    </Tabs>
  );
}
