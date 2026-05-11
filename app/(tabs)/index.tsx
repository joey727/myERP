import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { Link, router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import {
  getBusiness,
  getDashboardSummary,
  getCustomerCount,
  listRecentSales,
} from "@/db/database";
import type { Business, DashboardSummary, Sale } from "@/db/types";
import { formatMoney } from "@/lib/money";
import { Card, EmptyState, Screen, Skeleton, Stat } from "@/ui/components";
import { colors, fontSize, radius } from "@/ui/theme";

export default function DashboardScreen() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [summary, setSummary] = useState<DashboardSummary>({
    productCount: 0,
    lowStockCount: 0,
    todaySales: 0,
    todayRevenue: 0,
  });
  const [sales, setSales] = useState<Sale[]>([]);
  const [customerCount, setCustomerCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      Promise.all([
        getBusiness().then(setBusiness),
        getDashboardSummary().then(setSummary),
        listRecentSales().then(setSales),
        getCustomerCount().then(setCustomerCount),
      ]).then(() => setLoading(false));
    }
  }, [isFocused]);

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <Screen>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <View style={{ gap: 4, flex: 1 }}>
            <Text
              style={{ color: colors.ink, fontSize: fontSize["3xl"], fontWeight: "900" }}
            >
              {business?.name ?? "myERP"}
            </Text>
            <Text style={{ color: colors.muted, fontSize: fontSize.md }}>
              {business?.category ?? "Local business workspace"}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/settings")}
            style={({ pressed }) => ({
              padding: 8,
              borderRadius: radius.md,
              backgroundColor: pressed ? colors.panelAlt : "transparent",
            })}
          >
            <Ionicons color={colors.muted} name="settings-outline" size={24} />
          </Pressable>
        </View>

        {summary.lowStockCount > 0 && (
          <Pressable onPress={() => router.push("/(tabs)/inventory")}>
            <View
              style={{
                backgroundColor: colors.warningBg,
                borderColor: colors.warning,
                borderWidth: 1,
                borderRadius: radius.md,
                padding: 12,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}
            >
              <Ionicons color={colors.warning} name="warning-outline" size={20} />
              <Text style={{ color: colors.warning, fontWeight: "800", flex: 1 }}>
                {summary.lowStockCount} product
                {summary.lowStockCount !== 1 ? "s" : ""} running low on stock
              </Text>
              <Ionicons color={colors.warning} name="chevron-forward" size={18} />
            </View>
          </Pressable>
        )}

        {loading ? (
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}><Skeleton width="100%" height={88} /></View>
              <View style={{ flex: 1 }}><Skeleton width="100%" height={88} /></View>
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}><Skeleton width="100%" height={88} /></View>
              <View style={{ flex: 1 }}><Skeleton width="100%" height={88} /></View>
            </View>
          </View>
        ) : (
          <>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Stat label="Products" value={String(summary.productCount)} />
              <Stat
                label="Low stock"
                tone="warning"
                value={String(summary.lowStockCount)}
              />
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Stat label="Sales today" value={String(summary.todaySales)} />
              <Stat
                label="Revenue today"
                tone="success"
                value={formatMoney(
                  summary.todayRevenue,
                  business?.currency ?? "GHS",
                )}
              />
            </View>

            {customerCount > 0 && (
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Stat label="Customers" value={String(customerCount)} />
              </View>
            )}
          </>
        )}

        <Card>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <Text
              style={{ color: colors.ink, fontSize: fontSize.xl, fontWeight: "900" }}
            >
              Recent receipts
            </Text>
            <Pressable
              onPress={() => router.push("/history")}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <Text style={{ color: colors.primary, fontWeight: "700" }}>
                View all
              </Text>
            </Pressable>
          </View>
          {sales.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 12, gap: 8 }}>
              <Ionicons color={colors.muted} name="receipt-outline" size={28} />
              <Text style={{ color: colors.muted, lineHeight: 21, textAlign: "center" }}>
                No sales yet. Add inventory, then record your first sale.
              </Text>
            </View>
          ) : (
            sales.slice(0, 5).map((sale) => (
              <Link
                href={`/receipt/${sale.id}`}
                key={sale.id}
                style={{ paddingVertical: 6 }}
              >
                <Text style={{ color: colors.ink, fontWeight: "800" }}>
                  {sale.receiptNumber}
                </Text>
                <Text style={{ color: colors.muted }}>
                  {formatMoney(sale.total, business?.currency ?? "GHS")} via{" "}
                  {sale.paymentMethod.toUpperCase()}
                </Text>
              </Link>
            ))
          )}
        </Card>
      </Screen>
    </ScrollView>
  );
}
