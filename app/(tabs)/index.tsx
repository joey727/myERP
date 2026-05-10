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
import { Card, Screen, Stat } from "@/ui/components";
import { colors } from "@/ui/theme";

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
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      getBusiness().then(setBusiness);
      getDashboardSummary().then(setSummary);
      listRecentSales().then(setSales);
      getCustomerCount().then(setCustomerCount);
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
          <View style={{ gap: 4 }}>
            <Text
              style={{ color: colors.ink, fontSize: 26, fontWeight: "900" }}
            >
              {business?.name ?? "myERP"}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 14 }}>
              {business?.category ?? "Local business workspace"}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/settings")}
            style={{ padding: 8 }}
          >
            <Text style={{ color: colors.primary, fontWeight: "700" }}>
              Settings
            </Text>
          </Pressable>
        </View>

        {summary.lowStockCount > 0 && (
          <Pressable onPress={() => router.push("/(tabs)/inventory")}>
            <View
              style={{
                backgroundColor: "#fef3c7",
                borderColor: colors.warning,
                borderWidth: 1,
                borderRadius: 8,
                padding: 12,
              }}
            >
              <Text style={{ color: colors.warning, fontWeight: "800" }}>
                {summary.lowStockCount} product
                {summary.lowStockCount !== 1 ? "s" : ""} running low on stock
              </Text>
            </View>
          </Pressable>
        )}

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

        <Card>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <Text
              style={{ color: colors.ink, fontSize: 18, fontWeight: "900" }}
            >
              Recent receipts
            </Text>
            <Pressable onPress={() => router.push("/history")}>
              <Text style={{ color: colors.primary, fontWeight: "700" }}>
                View all
              </Text>
            </Pressable>
          </View>
          {sales.length === 0 ? (
            <Text style={{ color: colors.muted, lineHeight: 21 }}>
              No sales yet. Add inventory, then record your first sale.
            </Text>
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
