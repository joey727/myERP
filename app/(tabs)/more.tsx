import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import type { ReactNode } from "react";
import { View } from "react-native";

import { canAccess } from "@/auth/permissions";
import { logout, useSession } from "@/auth/session";
import { useBusiness } from "@/business";
import type { StaffRole } from "@/db/types";
import { APP_VERSION } from "@/lib/appInfo";
import { confirm } from "@/ui/dialog";
import { createStyles, useResponsive, useTheme } from "@/ui/design";
import {
  AppText,
  Avatar,
  ListRow,
  PageHeader,
  Screen,
  Surface
} from "@/ui/primitives";

type Destination = {
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: Href;
};

export default function MoreScreen() {
  const styles = useMoreStyles();
  const theme = useTheme();
  const { isCompact } = useResponsive();
  const { staffName, staffRole } = useSession();
  const { business } = useBusiness();
  const role: StaffRole = staffRole ?? "cashier";

  const manage: Destination[] = [];
  if (canAccess(role, "customers:view")) {
    manage.push({
      label: "Customers",
      description: "Loyalty customers and lifetime value",
      icon: "people-outline",
      href: "/(tabs)/customers"
    });
  }
  if (canAccess(role, "reports:view")) {
    manage.push({
      label: "Reports",
      description: "Revenue, profit, payments and staff",
      icon: "bar-chart-outline",
      href: "/(tabs)/reports"
    });
  }
  if (canAccess(role, "audit:view")) {
    manage.push({
      label: "Stock audit",
      description: "Count stock, check value and review movements",
      icon: "shield-checkmark-outline",
      href: "/audit"
    });
  }
  if (canAccess(role, "staff:view")) {
    manage.push({
      label: "Staff",
      description: "Team logins, roles and PINs",
      icon: "person-outline",
      href: "/(tabs)/staff"
    });
  }
  manage.push({
    label: "Sales history",
    description: "Find and reopen any receipt",
    icon: "time-outline",
    href: "/history"
  });

  const businessItems: Destination[] = [
    {
      label: "Settings",
      description: "Business details, currency and access",
      icon: "settings-outline",
      href: "/settings"
    },
    {
      label: "App updates",
      description: `Version ${APP_VERSION} · check for a newer build`,
      icon: "cloud-download-outline",
      href: "/updates"
    }
  ];
  if (canAccess(role, "data:export")) {
    businessItems.push({
      label: "Backup and export",
      description: "Save a CSV copy of your business data",
      icon: "download-outline",
      href: "/backup"
    });
  }

  async function handleSwitchUser() {
    const ok = await confirm({
      title: "Switch user",
      message: "The next person will need their PIN to sign in.",
      confirmText: "Switch user"
    });
    if (!ok) return;
    await logout();
    router.replace("/login");
  }

  return (
    <Screen maxWidth={isCompact ? 720 : 900} safeTop>
      <PageHeader
        subtitle={business?.category ?? "Workspace"}
        title="More"
      />

      <Surface padded={false}>
        <View style={styles.identity}>
          <Avatar name={staffName ?? "User"} size={48} />
          <View style={styles.identityText}>
            <AppText variant="title3">{staffName ?? "Signed in"}</AppText>
            <AppText style={styles.capitalize} tone="secondary" variant="small">
              {role} · {business?.name ?? "myERP"}
            </AppText>
          </View>
          <AppText tone="muted" variant="caption">
            {business?.currency ?? "GHS"}
          </AppText>
        </View>
      </Surface>

      <Group title="Manage">
        {manage.map((item) => (
          <DestinationRow item={item} key={item.label} />
        ))}
      </Group>

      <Group title="Business">
        {businessItems.map((item) => (
          <DestinationRow item={item} key={item.label} />
        ))}
      </Group>

      <Group title="Session">
        <View style={styles.rowPad}>
          <ListRow
            accessibilityLabel="Switch user"
            divider={false}
            onPress={handleSwitchUser}
            right={
              <Ionicons color={theme.colors.muted} name="log-out-outline" size={18} />
            }
          >
            <AppText variant="bodyStrong">Switch user</AppText>
            <AppText tone="secondary" variant="small">
              Lock the till and ask for a PIN
            </AppText>
          </ListRow>
        </View>
      </Group>

      <AppText center tone="muted" variant="caption">
        myERP · works offline · version {APP_VERSION}
      </AppText>
    </Screen>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  const styles = useMoreStyles();
  return (
    <View style={styles.group}>
      <AppText tone="muted" variant="label">
        {title}
      </AppText>
      <Surface padded={false}>{children}</Surface>
    </View>
  );
}

function DestinationRow({ item }: { item: Destination }) {
  const styles = useMoreStyles();
  const theme = useTheme();
  return (
    <View style={styles.rowPad}>
      <ListRow
        accessibilityLabel={item.label}
        onPress={() => router.push(item.href)}
        showChevron
      >
        <View style={styles.rowContent}>
          <View style={styles.rowIcon}>
            <Ionicons color={theme.colors.primary} name={item.icon} size={18} />
          </View>
          <View style={styles.rowText}>
            <AppText variant="bodyStrong">{item.label}</AppText>
            <AppText tone="secondary" variant="small">
              {item.description}
            </AppText>
          </View>
        </View>
      </ListRow>
    </View>
  );
}

const moreStyles = createStyles((theme) => ({
  group: { gap: theme.space.xs },
  identity: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.space.sm,
    padding: theme.space.md
  },
  identityText: { flex: 1, gap: 2 },
  capitalize: { textTransform: "capitalize" },
  rowPad: { paddingHorizontal: theme.space.md },
  rowContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.space.sm
  },
  rowIcon: {
    alignItems: "center",
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.sm,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  rowText: { flex: 1, gap: 1 },
  mutedColor: { color: theme.colors.muted },
  primaryColor: { color: theme.colors.primary }
}));const useMoreStyles = () => moreStyles();
