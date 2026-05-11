import { useIsFocused } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { BarChart, PieChart } from "react-native-chart-kit";
import { useWindowDimensions } from "react-native";

import {
  getPaymentBreakdown,
  getRevenueByDateRange,
  getSalesCount,
  getStaffSalesStats,
  getTopProducts,
  getTotalRevenue
} from "@/db/database";
import type { DailyRevenue, PaymentBreakdown, StaffStats, TopProduct } from "@/db/types";
import { formatMoney } from "@/lib/money";
import { Card, Chip, EmptyState, Screen, Stat } from "@/ui/components";
import { colors, fontSize, radius } from "@/ui/theme";

type Period = "today" | "week" | "month";

function getDateRange(period: Period): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().split("T")[0];
  let start: string;

  if (period === "today") {
    start = end;
  } else if (period === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    start = d.toISOString().split("T")[0];
  } else {
    const d = new Date(now);
    d.setDate(d.getDate() - 29);
    start = d.toISOString().split("T")[0];
  }

  return { start, end };
}

export default function ReportsScreen() {
  const isFocused = useIsFocused();
  const { width: screenWidth } = useWindowDimensions();
  const [period, setPeriod] = useState<Period>("today");
  const [revenueData, setRevenueData] = useState<DailyRevenue[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [staffStats, setStaffStats] = useState<StaffStats[]>([]);
  const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentBreakdown[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [salesCount, setSalesCount] = useState(0);

  useEffect(() => {
    if (isFocused) {
      loadData();
    }
  }, [isFocused, period]);

  async function loadData() {
    const { start, end } = getDateRange(period);

    const [revenue, products, staff, payments, total, count] = await Promise.all([
      getRevenueByDateRange(start, end),
      getTopProducts(5, start, end),
      getStaffSalesStats(start, end),
      getPaymentBreakdown(start, end),
      getTotalRevenue(start, end),
      getSalesCount(start, end)
    ]);

    setRevenueData(revenue);
    setTopProducts(products.filter(p => p.quantitySold > 0));
    setStaffStats(staff.filter(s => s.salesCount > 0));
    setPaymentBreakdown(payments);
    setTotalRevenue(total);
    setSalesCount(count);
  }

  const avgSale = salesCount > 0 ? totalRevenue / salesCount : 0;

  const chartConfig = {
    backgroundColor: colors.panel,
    backgroundGradientFrom: colors.panel,
    backgroundGradientTo: colors.panel,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(15, 118, 110, ${opacity})`,
    labelColor: () => colors.ink,
    style: { borderRadius: radius.md },
    propsForBackgroundLines: { strokeDasharray: "", stroke: colors.border }
  };

  const revenueChartData = revenueData.length > 0
    ? revenueData.slice(-7).map((d) => ({
        label: new Date(d.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
        value: d.total
      }))
    : [{ label: "No data", value: 0 }];

  const pieData = paymentBreakdown.map((p, i) => ({
    name: p.method.toUpperCase(),
    population: p.total,
    color: i === 0 ? colors.primary : colors.accent,
    legendFontColor: colors.ink
  }));

  const chartWidth = screenWidth - 80;

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <Screen>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
          {(["today", "week", "month"] as Period[]).map((p) => (
            <Chip
              key={p}
              label={p.charAt(0).toUpperCase() + p.slice(1)}
              onPress={() => setPeriod(p)}
              selected={period === p}
            />
          ))}
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <Stat label="Revenue" value={formatMoney(totalRevenue, "GHS")} tone="success" />
          <Stat label="Transactions" value={String(salesCount)} />
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Stat label="Avg. Sale" value={formatMoney(avgSale, "GHS")} />
          <Stat
            label="Products Sold"
            value={String(topProducts.reduce((sum, p) => sum + p.quantitySold, 0))}
          />
        </View>

        {revenueChartData.length > 0 && revenueChartData[0].value > 0 && (
          <Card>
            <Text style={{ color: colors.ink, fontSize: fontSize.xl, fontWeight: "900", marginBottom: 12 }}>Revenue</Text>
            <BarChart
              data={{
                labels: revenueChartData.map(d => d.label),
                datasets: [{ data: revenueChartData.map(d => d.value) }]
              }}
              width={chartWidth}
              height={200}
              chartConfig={chartConfig}
              style={{ marginLeft: -8, borderRadius: radius.md }}
              yAxisLabel="GHS "
              yAxisSuffix=""
            />
          </Card>
        )}

        {pieData.length > 0 && pieData.some(p => p.population > 0) && (
          <Card>
            <Text style={{ color: colors.ink, fontSize: fontSize.xl, fontWeight: "900", marginBottom: 12 }}>Payments</Text>
            <PieChart
              data={pieData}
              width={chartWidth}
              height={180}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
            />
          </Card>
        )}

        {topProducts.length > 0 ? (
          <Card>
            <Text style={{ color: colors.ink, fontSize: fontSize.xl, fontWeight: "900", marginBottom: 12 }}>Top Products</Text>
            {topProducts.map((p, i) => (
              <View key={p.id} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: i < topProducts.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
                <Text style={{ color: colors.ink, fontWeight: "700" }}>{i + 1}. {p.name}</Text>
                <Text style={{ color: colors.muted, fontWeight: "600" }}>{p.quantitySold} sold</Text>
              </View>
            ))}
          </Card>
        ) : (
          <EmptyState
            icon="trophy-outline"
            title="No product data"
            subtitle={`No products sold ${period === "today" ? "today" : `this ${period}`}.`}
          />
        )}

        {staffStats.length > 0 && (
          <Card>
            <Text style={{ color: colors.ink, fontSize: fontSize.xl, fontWeight: "900", marginBottom: 12 }}>Staff Performance</Text>
            {staffStats.map((s, i) => (
              <View key={s.staffId} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: i < staffStats.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
                <Text style={{ color: colors.ink, fontWeight: "700" }}>{s.staffName}</Text>
                <Text style={{ color: colors.muted, fontWeight: "600" }}>{s.salesCount} sales | {formatMoney(s.totalRevenue, "GHS")}</Text>
              </View>
            ))}
          </Card>
        )}
      </Screen>
    </ScrollView>
  );
}