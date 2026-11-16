import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { logout, useSession } from "@/auth/session";
import { canAccess } from "@/auth/permissions";
import { useBusiness } from "@/business";
import type { StaffRole } from "@/db/types";
import { createStyles, useResponsive, useTheme } from "./design";
import { AppText, Avatar, IconButton } from "./primitives";
import { layout, tabBarHeight } from "./tokens";

type NavItem = {
  route: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
};

type TabBarProps = {
  state: {
    index: number;
    key: string;
    routes: { key: string; name: string }[];
  };
  navigation: {
    emit: (event: {
      canPreventDefault: true;
      target: string;
      type: "tabPress";
    }) => { defaultPrevented: boolean };
    navigate: (route: string) => void;
  };
};

const primaryItems: NavItem[] = [
  { route: "index", label: "Home", icon: "home-outline", activeIcon: "home" },
  { route: "sales", label: "Sell", icon: "cart-outline", activeIcon: "cart" },
  { route: "inventory", label: "Stock", icon: "cube-outline", activeIcon: "cube" }
];

const auditItem: NavItem = {
  route: "audit",
  label: "Stock audit",
  icon: "shield-checkmark-outline",
  activeIcon: "shield-checkmark"
};

const tabHrefs: Record<string, Href> = {
  index: "/(tabs)",
  sales: "/(tabs)/sales",
  inventory: "/(tabs)/inventory",
  customers: "/(tabs)/customers",
  staff: "/(tabs)/staff",
  reports: "/(tabs)/reports",
  more: "/(tabs)/more"
};

function secondaryItems(role: StaffRole): NavItem[] {
  const items: NavItem[] = [];
  if (canAccess(role, "customers:view")) {
    items.push({
      route: "customers",
      label: "Customers",
      icon: "people-outline",
      activeIcon: "people"
    });
  }
  if (canAccess(role, "reports:view")) {
    items.push({
      route: "reports",
      label: "Reports",
      icon: "bar-chart-outline",
      activeIcon: "bar-chart"
    });
  }
  if (canAccess(role, "staff:view")) {
    items.push({
      route: "staff",
      label: "Staff",
      icon: "person-outline",
      activeIcon: "person"
    });
  }
  return items;
}

function switchUser() {
  logout().then(() => router.replace("/login"));
}

export function AdaptiveTabBar({ state, navigation }: TabBarProps) {
  const styles = useNavStyles();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { isCompact, isExpanded } = useResponsive();
  const { staffRole, staffName } = useSession();
  const { business } = useBusiness();
  const role: StaffRole = staffRole ?? "cashier";
  const activeRoute = state.routes[state.index]?.name;

  function go(route: string) {
    const target = state.routes.find((item) => item.name === route);
    const event = navigation.emit({
      canPreventDefault: true,
      target: target?.key ?? state.key,
      type: "tabPress"
    });
    if (!event.defaultPrevented) {
      router.navigate(tabHrefs[route] ?? "/(tabs)");
    }
  }

  if (isCompact) {
    const items = [...primaryItems, { route: "more", label: "More", icon: "grid-outline", activeIcon: "grid" } as NavItem];
    const moreActive =
      activeRoute === "more" ||
      secondaryItems(role).some((item) => item.route === activeRoute);
    return (
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom }]}>
        {items.map((item) => {
          const active = item.route === "more" ? moreActive : activeRoute === item.route;
          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              key={item.route}
              onPress={() => go(item.route)}
              style={styles.tab}
            >
              <View style={[styles.iconPill, active && styles.iconPillActive]}>
                <Ionicons
                  color={active ? theme.colors.primary : theme.colors.muted}
                  name={active ? item.activeIcon : item.icon}
                  size={22}
                />
              </View>
              <AppText
                style={active ? styles.activeLabel : undefined}
                tone={active ? "primary" : "muted"}
                variant="caption"
              >
                {item.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    );
  }

  if (isExpanded) {
    const secondary = secondaryItems(role);
    return (
      <View
        style={[
          styles.sidebar,
          {
            paddingBottom: insets.bottom + 12,
            paddingTop: insets.top + 12,
            width: layout.sidebar
          }
        ]}
      >
        <View style={styles.brand}>
          <View style={styles.mark}>
            <AppText tone="onPrimary" variant="smallStrong">
              m
            </AppText>
          </View>
          <View style={styles.brandText}>
            <AppText numberOfLines={1} variant="smallStrong">
              {business?.name ?? "myERP"}
            </AppText>
            <AppText tone="muted" variant="caption">
              {business?.category ?? "Local business"}
            </AppText>
          </View>
        </View>

        <View style={styles.navGroup}>
          <AppText style={styles.groupLabel} tone="muted" variant="caption">
            Workspace
          </AppText>
          {primaryItems.map((item) => (
            <SidebarItem
              active={activeRoute === item.route}
              item={item}
              key={item.route}
              onPress={() => go(item.route)}
            />
          ))}
        </View>

        <View style={styles.navGroup}>
          <AppText style={styles.groupLabel} tone="muted" variant="caption">
            Manage
          </AppText>
          {secondary.map((item) => (
            <SidebarItem
              active={activeRoute === item.route}
              item={item}
              key={item.route}
              onPress={() => go(item.route)}
            />
          ))}
          {canAccess(role, "audit:view") ? (
            <SidebarItem
              active={false}
              item={auditItem}
              onPress={() => router.push("/audit")}
            />
          ) : null}
          <SidebarItem
            active={false}
            item={{ route: "history", label: "Sales history", icon: "time-outline", activeIcon: "time" }}
            onPress={() => router.push("/history")}
          />
        </View>

        <View style={styles.sidebarFooter}>
          <View style={styles.navGroup}>
            <SidebarItem
              active={false}
              item={{ route: "settings", label: "Settings", icon: "settings-outline", activeIcon: "settings" }}
              onPress={() => router.push("/settings")}
            />
            {canAccess(role, "data:export") ? (
              <SidebarItem
                active={false}
                item={{ route: "backup", label: "Backup & export", icon: "download-outline", activeIcon: "download" }}
                onPress={() => router.push("/backup")}
              />
            ) : null}
          </View>
          <View style={styles.staffCard}>
            <Avatar name={staffName ?? "User"} size={32} />
            <View style={styles.staffText}>
              <AppText numberOfLines={1} variant="smallStrong">
                {staffName ?? "Signed in"}
              </AppText>
              <AppText style={styles.capitalize} tone="muted" variant="caption">
                {role}
              </AppText>
            </View>
            <IconButton
              icon="log-out-outline"
              label="Switch user"
              onPress={switchUser}
              size={36}
              tone="muted"
            />
          </View>
        </View>
      </View>
    );
  }

  const railItems = [...primaryItems, ...secondaryItems(role), ...(canAccess(role, "audit:view") ? [auditItem] : []), {
    route: "more",
    label: "More",
    icon: "grid-outline",
    activeIcon: "grid"
  } as NavItem];

  return (
    <View
      style={[
        styles.rail,
        {
          paddingBottom: insets.bottom + 12,
          paddingTop: insets.top + 12,
          width: layout.rail
        }
      ]}
    >
      <View style={styles.railMark}>
        <AppText tone="onPrimary" variant="smallStrong">
          m
        </AppText>
      </View>
      {railItems.map((item) => {
        const active = activeRoute === item.route;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            key={item.route}
            onPress={() =>
              item.route === "audit" ? router.push("/audit") : go(item.route)
            }
            style={styles.railItem}
          >
            <View style={[styles.railIcon, active && styles.iconPillActive]}>
              <Ionicons
                color={active ? theme.colors.primary : theme.colors.muted}
                name={active ? item.activeIcon : item.icon}
                size={22}
              />
            </View>
            <AppText tone={active ? "primary" : "muted"} variant="caption">
              {item.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

function SidebarItem({
  item,
  active,
  onPress
}: {
  item: NavItem;
  active: boolean;
  onPress: () => void;
}) {
  const styles = useNavStyles();
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.sidebarItem,
        active && styles.sidebarItemActive,
        pressed && { opacity: 0.72 }
      ]}
    >
      <Ionicons
        color={active ? theme.colors.primary : theme.colors.muted}
        name={active ? item.activeIcon : item.icon}
        size={20}
      />
      <AppText tone={active ? "primary" : "secondary"} variant="smallStrong">
        {item.label}
      </AppText>
    </Pressable>
  );
}

const navStyles = createStyles((theme) => ({
  bottomBar: {
    backgroundColor: theme.colors.surface,
    borderTopColor: theme.colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    paddingTop: 6
  },
  tab: {
    alignItems: "center",
    flex: 1,
    gap: 2,
    justifyContent: "center",
    minHeight: tabBarHeight - 6,
    paddingVertical: 4
  },
  iconPill: {
    alignItems: "center",
    borderRadius: theme.radius.full,
    height: 28,
    justifyContent: "center",
    width: 46
  },
  iconPillActive: { backgroundColor: theme.colors.primarySoft },
  activeLabel: { color: theme.colors.primary },
  rail: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRightColor: theme.colors.border,
    borderRightWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    gap: theme.space.xxs,
    left: 0,
    position: "absolute",
    top: 0
  },
  railMark: {
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.sm,
    height: 36,
    justifyContent: "center",
    marginBottom: theme.space.sm,
    width: 36
  },
  railItem: {
    alignItems: "center",
    gap: 2,
    justifyContent: "center",
    minHeight: 56,
    paddingVertical: 4,
    width: "100%"
  },
  railIcon: {
    alignItems: "center",
    borderRadius: theme.radius.full,
    height: 30,
    justifyContent: "center",
    width: 48
  },
  sidebar: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRightColor: theme.colors.border,
    borderRightWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    left: 0,
    paddingHorizontal: theme.space.sm,
    position: "absolute",
    top: 0
  },
  brand: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.space.sm,
    paddingHorizontal: theme.space.xs,
    paddingVertical: theme.space.sm
  },
  mark: {
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.sm,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  brandText: { flex: 1, gap: 1 },
  navGroup: { gap: 2, marginTop: theme.space.md },
  groupLabel: {
    letterSpacing: 0.3,
    paddingHorizontal: theme.space.xs,
    paddingBottom: theme.space.xxs
  },
  sidebarItem: {
    alignItems: "center",
    borderRadius: theme.radius.sm,
    flexDirection: "row",
    gap: theme.space.sm,
    minHeight: 40,
    paddingHorizontal: theme.space.xs
  },
  sidebarItemActive: { backgroundColor: theme.colors.primarySoft },
  sidebarFooter: { flex: 1, justifyContent: "flex-end" },
  staffCard: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: theme.space.xs,
    marginTop: theme.space.sm,
    padding: theme.space.xs
  },
  staffText: { flex: 1, gap: 1 },
  capitalize: { textTransform: "capitalize" }
}));
const useNavStyles = () => navStyles();
