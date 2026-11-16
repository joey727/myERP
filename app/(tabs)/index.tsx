import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { canAccess } from "@/auth/permissions";
import { useSession } from "@/auth/session";
import { useBusiness } from "@/business";
import {
  getDashboardSummary,
  getPaymentBreakdown,
  getStaffCount,
  listLowStockProducts,
  listRecentSales
} from "@/db/database";
import type {
  DashboardSummary,
  PaymentBreakdown,
  Product,
  Sale,
  StaffRole
} from "@/db/types";
import { createStyles, useResponsive, useTheme } from "@/ui/design";
import {
  AppText,
  Avatar,
  Badge,
  Button,
  IconButton,
  ListRow,
  Money,
  PageHeader,
  Screen,
  Section,
  Skeleton,
  Surface,
  useBottomNavSpace
} from "@/ui/primitives";

const emptySummary: DashboardSummary = {
  productCount: 0,
  lowStockCount: 0,
  todaySales: 0,
  todayRevenue: 0,
  todayProfit: 0
};

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function HomeScreen() {
  const styles = useHomeStyles();
  const theme = useTheme();
  const { isCompact, isExpanded, isTwoPane } = useResponsive();
  const { staffName, staffRole } = useSession();
  const { business } = useBusiness();
  const role: StaffRole = staffRole ?? "cashier";
  const canCreateProduct = canAccess(role, "products:create");
  const canViewReports = canAccess(role, "reports:view");
  const bottomSpace = useBottomNavSpace();
  const isFocused = useIsFocused();

  const [summary, setSummary] = useState<DashboardSummary>(emptySummary);
  const [sales, setSales] = useState<Sale[]>([]);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [staffCount, setStaffCount] = useState(0);
  const [cashTotal, setCashTotal] = useState(0);
  const [momoTotal, setMomoTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFocused) return;
    const today = new Date().toISOString().split("T")[0];
    const paymentTotals: Promise<PaymentBreakdown[]> = canViewReports
      ? getPaymentBreakdown(today, today)
      : Promise.resolve([]);
    Promise.all([
      getDashboardSummary(),
      listRecentSales(),
      listLowStockProducts(3),
      getStaffCount(),
      paymentTotals
    ])
      .then(([nextSummary, nextSales, nextLowStock, nextStaffCount, payments]) => {
        setSummary(nextSummary);
        setSales(nextSales);
        setLowStock(nextLowStock);
        setStaffCount(nextStaffCount);
        setCashTotal(payments.find((entry) => entry.method === "cash")?.total ?? 0);
        setMomoTotal(payments.find((entry) => entry.method === "momo")?.total ?? 0);
      })
      .catch((error) => console.error("Dashboard load failed:", error))
      .finally(() => setLoading(false));
  }, [isFocused, canViewReports]);

  const checklist = [
    {
      label: "Add your first product",
      detail: "Name, price and stock. Takes under a minute.",
      done: summary.productCount > 0,
      action: () => router.push("/(tabs)/inventory")
    },
    {
      label: "Make your first sale",
      detail: "Pick products, take cash or MoMo, print a receipt.",
      done: summary.todaySales > 0 || sales.length > 0,
      action: () => router.push("/(tabs)/sales")
    },
    {
      label: "Add a team login",
      detail: "Each person gets their own 4-digit PIN.",
      done: staffCount > 1,
      action: () => router.push("/(tabs)/staff")
    }
  ];
  const showChecklist = !loading && checklist.some((step) => !step.done);

  return (
    <Screen bottomSpace={bottomSpace} maxWidth={isCompact ? 900 : 1200} safeTop>
      <PageHeader
        right={
          <>
            <Avatar name={staffName ?? "User"} size={36} />
            <IconButton
              icon="settings-outline"
              label="Settings"
              onPress={() => router.push("/settings")}
              tone="muted"
            />
          </>
        }
        subtitle={`${business?.category ?? "Local business"} · ${role}`}
        title={business?.name ?? "myERP"}
      />

      {loading ? (
        <View style={styles.loading}>
          <Skeleton height={168} radius={16} />
          <Skeleton height={56} radius={12} />
          <Skeleton height={140} radius={12} />
        </View>
      ) : (
        <>
          <View style={styles.hero}>
            <View style={styles.heroHead}>
              <AppText style={styles.heroLabel} variant="label">
                {canViewReports ? "Revenue today" : "Today at the till"}
              </AppText>
              <View style={styles.heroChip}>
                <Ionicons color={theme.colors.onPrimary} name="sunny-outline" size={13} />
                <AppText style={styles.heroChipText} variant="caption">
                  {new Date().toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short"
                  })}
                </AppText>
              </View>
            </View>
            {canViewReports ? (
              <Money amount={summary.todayRevenue} style={styles.heroValue} tone="onPrimary" variant="display" />
            ) : (
              <View style={styles.heroCount}>
                <AppText numeric style={styles.heroValue} variant="display">
                  {summary.todaySales}
                </AppText>
                <AppText style={styles.heroCountLabel} variant="bodyStrong">
                  sale{summary.todaySales === 1 ? "" : "s"} today
                </AppText>
              </View>
            )}
            <View style={styles.heroStats}>
              {canViewReports ? (
                <>
                  <HeroStat label="Sales" value={String(summary.todaySales)} />
                  <HeroStat
                    label="Profit"
                    value={new Intl.NumberFormat("en-GH", {
                      style: "currency",
                      currency: business?.currency ?? "GHS",
                      maximumFractionDigits: 0
                    }).format(summary.todayProfit)}
                  />
                  <HeroStat
                    label="Cash / MoMo"
                    value={`${Math.round(cashTotal)} / ${Math.round(momoTotal)}`}
                  />
                </>
              ) : (
                <>
                  <HeroStat label="Products" value={String(summary.productCount)} />
                  <HeroStat label="Low stock" value={String(summary.lowStockCount)} />
                  <HeroStat label="Team" value={String(staffCount)} />
                </>
              )}
            </View>
          </View>

          <View style={[styles.actions, isExpanded && styles.actionsWide]}>
            <View style={isExpanded ? styles.actionItemWide : undefined}>
              <Button
                fullWidth
                haptic
                icon="cart-outline"
                onPress={() => router.push("/(tabs)/sales")}
                title="New sale"
              />
            </View>
            {canCreateProduct ? (
              <View style={isExpanded ? styles.actionItemWide : undefined}>
                <Button
                  fullWidth
                  icon="add-outline"
                  onPress={() => router.push("/(tabs)/inventory")}
                  title="Add product"
                  variant="secondary"
                />
              </View>
            ) : null}
            <View style={isExpanded ? styles.actionItemWide : undefined}>
              <Button
                fullWidth
                icon="scan-outline"
                onPress={() =>
                  router.push({ pathname: "/scan", params: { target: "sales" } })
                }
                title="Scan barcode"
                variant="ghost"
              />
            </View>
          </View>

          {showChecklist && canCreateProduct ? (
            <Section description="Three steps to get the till running." title="Get started">
              <Surface padded={false}>
                {checklist.map((step, index) => (
                  <View key={step.label} style={styles.rowPad}>
                    <ListRow
                      divider={index < checklist.length - 1}
                      onPress={step.done ? undefined : step.action}
                      showChevron={!step.done}
                    >
                      <View style={styles.checklistRow}>
                        <Ionicons
                          color={step.done ? theme.colors.success : theme.colors.borderStrong}
                          name={step.done ? "checkmark-circle" : "ellipse-outline"}
                          size={22}
                        />
                        <View style={styles.checklistText}>
                          <AppText
                            tone={step.done ? "muted" : "default"}
                            variant="bodyStrong"
                          >
                            {step.label}
                          </AppText>
                          <AppText tone="secondary" variant="small">
                            {step.detail}
                          </AppText>
                        </View>
                      </View>
                    </ListRow>
                  </View>
                ))}
              </Surface>
            </Section>
          ) : null}

          <View style={[styles.lower, isTwoPane && styles.lowerWide]}>
            {lowStock.length > 0 ? (
              <Section
                action={
                  <Button
                    onPress={() =>
                      router.push({
                        pathname: "/(tabs)/inventory",
                        params: { filter: "low" }
                      })
                    }
                    size="sm"
                    title="View all"
                    variant="link"
                  />
                }
                description={`${summary.lowStockCount} product${summary.lowStockCount === 1 ? "" : "s"} at or below the low-stock line.`}
                style={isTwoPane ? styles.lowerColumn : undefined}
                title="Running low"
              >
                <Surface padded={false}>
                  {lowStock.map((product, index) => (
                    <View key={product.id} style={styles.rowPad}>
                      <ListRow
                        divider={index < lowStock.length - 1}
                        onPress={
                          canAccess(role, "products:edit")
                            ? () => router.push(`/product/${product.id}`)
                            : undefined
                        }
                        right={
                          <Badge
                            label={`${product.stock} left`}
                            tone={product.stock === 0 ? "danger" : "attention"}
                          />
                        }
                      >
                        <AppText numberOfLines={1} variant="bodyStrong">
                          {product.name}
                        </AppText>
                        <AppText tone="secondary" variant="small">
                          {product.category}
                        </AppText>
                      </ListRow>
                    </View>
                  ))}
                </Surface>
              </Section>
            ) : null}

            <Section
              action={
                <Button
                  onPress={() => router.push("/history")}
                  size="sm"
                  title="View all"
                  variant="link"
                />
              }
              description="The latest receipts from the till."
              style={isTwoPane ? styles.lowerColumn : undefined}
              title="Recent sales"
            >
              {sales.length === 0 ? (
                <Surface>
                  <View style={styles.emptyRecent}>
                    <Ionicons
                      color={theme.colors.muted}
                      name="receipt-outline"
                      size={24}
                    />
                    <AppText tone="secondary" variant="small">
                      No sales yet. Your receipts will appear here.
                    </AppText>
                  </View>
                </Surface>
              ) : (
                <Surface padded={false}>
                  {sales.slice(0, 5).map((sale, index) => (
                    <View key={sale.id} style={styles.rowPad}>
                      <ListRow
                        divider={index < Math.min(sales.length, 5) - 1}
                        onPress={() => router.push(`/receipt/${sale.id}`)}
                        right={
                          <View style={styles.saleRight}>
                            <Money amount={sale.total} variant="bodyStrong" />
                            <Badge
                              label={sale.paymentMethod === "cash" ? "Cash" : "MoMo"}
                              tone={sale.paymentMethod === "momo" ? "primary" : "neutral"}
                            />
                          </View>
                        }
                      >
                        <AppText variant="bodyStrong">{sale.receiptNumber}</AppText>
                        <AppText tone="secondary" variant="small">
                          {formatTime(sale.createdAt)}
                        </AppText>
                      </ListRow>
                    </View>
                  ))}
                </Surface>
              )}
            </Section>
          </View>
        </>
      )}
    </Screen>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  const styles = useHomeStyles();
  const theme = useTheme();
  return (
    <View style={styles.heroStat}>
      <AppText style={styles.heroLabel} variant="caption">
        {label}
      </AppText>
      <AppText
        numeric
        style={{ color: theme.colors.onPrimary }}
        variant="bodyStrong"
      >
        {value}
      </AppText>
    </View>
  );
}

const homeStyles = createStyles((theme) => ({
  loading: { gap: theme.space.sm },
  hero: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    gap: theme.space.xs,
    padding: theme.space.lg
  },
  heroHead: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  heroLabel: { color: theme.colors.onPrimary, opacity: 0.72 },
  heroChip: {
    alignItems: "center",
    borderColor: `${theme.colors.onPrimary}33`,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: theme.space.xs,
    paddingVertical: 3
  },
  heroChipText: { color: theme.colors.onPrimary, opacity: 0.85 },
  heroValue: { color: theme.colors.onPrimary },
  heroCount: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: theme.space.xs
  },
  heroCountLabel: {
    color: theme.colors.onPrimary,
    marginBottom: 6,
    opacity: 0.8
  },
  heroStats: {
    borderTopColor: `${theme.colors.onPrimary}26`,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: theme.space.md,
    marginTop: theme.space.xs,
    paddingTop: theme.space.sm
  },
  heroStat: { flex: 1, gap: 2 },
  actions: { gap: theme.space.xs },
  actionsWide: { flexDirection: "row" },
  actionItemWide: { flex: 1 },
  checklistRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: theme.space.sm
  },
  checklistText: { flex: 1, gap: 2 },
  rowPad: { paddingHorizontal: theme.space.md },
  lower: { gap: theme.space.lg },
  lowerWide: { alignItems: "flex-start", flexDirection: "row" },
  lowerColumn: { flex: 1, minWidth: 0 },
  saleRight: { alignItems: "flex-end", gap: 4 },
  emptyRecent: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.space.sm,
    padding: theme.space.md
  }
}));
const useHomeStyles = () => homeStyles();
