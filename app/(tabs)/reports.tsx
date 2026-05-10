import { useIsFocused } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { BarChart, PieChart } from "react-native-chart-kit";
import { Dimensions } from "react-native";

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
import { Card, Screen } from "@/ui/components";
import { colors } from "@/ui/theme";

const screenWidth = Dimensions.get("window").width;

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
    style: { borderRadius: 8 },
    propsForBackgroundLines: { strokeDasharray: "", stroke: colors.border }
  };

  const revenueChartData = revenueData.length > 0
    ? revenueData.slice(-7).map((d, i) => ({
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

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <Screen>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
          {(["today", "week", "month"] as Period[]).map((p) => (
            <Text
              key={p}
              onPress={() => setPeriod(p)}
              style={{
                backgroundColor: period === p ? colors.primary : colors.panel,
                borderColor: period === p ? colors.primary : colors.border,
                borderRadius: 8,
                borderWidth: 1,
                color: period === p ? "#ffffff" : colors.ink,
                fontWeight: "700",
                paddingHorizontal: 16,
                paddingVertical: 8,
                textTransform: "capitalize"
              }}
            >
              {p}
            </Text>
          ))}
        </View>

        <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
          <Card>
            <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "700" }}>Revenue</Text>
            <Text style={{ color: colors.ink, fontSize: 24, fontWeight: "900" }}>{formatMoney(totalRevenue, "GHS")}</Text>
          </Card>
          <Card>
            <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "700" }}>Transactions</Text>
            <Text style={{ color: colors.ink, fontSize: 24, fontWeight: "900" }}>{salesCount}</Text>
          </Card>
          <Card>
            <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "700" }}>Avg. Sale</Text>
            <Text style={{ color: colors.ink, fontSize: 24, fontWeight: "900" }}>{formatMoney(avgSale, "GHS")}</Text>
          </Card>
          <Card>
            <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "700" }}>Products Sold</Text>
            <Text style={{ color: colors.ink, fontSize: 24, fontWeight: "900" }}>
              {topProducts.reduce((sum, p) => sum + p.quantitySold, 0)}
            </Text>
          </Card>
        </View>

        {revenueChartData.length > 0 && revenueChartData[0].value > 0 && (
          <Card>
            <Text style={{ color: colors.ink, fontSize: 18, fontWeight: "900", marginBottom: 12 }}>Revenue</Text>
            <BarChart
              data={{
                labels: revenueChartData.map(d => d.label),
                datasets: [{ data: revenueChartData.map(d => d.value) }]
              }}
              width={screenWidth - 80}
              height={200}
              chartConfig={chartConfig}
              style={{ marginLeft: -8 }}
              yAxisLabel="GHS "
              yAxisSuffix=""
            />
          </Card>
        )}

        {pieData.length > 0 && pieData.some(p => p.population > 0) && (
          <Card>
            <Text style={{ color: colors.ink, fontSize: 18, fontWeight: "900", marginBottom: 12 }}>Payments</Text>
            <PieChart
              data={pieData}
              width={screenWidth - 80}
              height={180}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
            />
          </Card>
        )}

        {topProducts.length > 0 && (
          <Card>
            <Text style={{ color: colors.ink, fontSize: 18, fontWeight: "900", marginBottom: 12 }}>Top Products</Text>
            {topProducts.map((p, i) => (
              <View key={p.id} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
                <Text style={{ color: colors.ink }}>{i + 1}. {p.name}</Text>
                <Text style={{ color: colors.muted }}>{p.quantitySold} sold</Text>
              </View>
            ))}
          </Card>
        )}

        {staffStats.length > 0 && (
          <Card>
            <Text style={{ color: colors.ink, fontSize: 18, fontWeight: "900", marginBottom: 12 }}>Staff Performance</Text>
            {staffStats.map((s) => (
              <View key={s.staffId} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
                <Text style={{ color: colors.ink }}>{s.staffName}</Text>
                <Text style={{ color: colors.muted }}>{s.salesCount} sales | {formatMoney(s.totalRevenue, "GHS")}</Text>
              </View>
            ))}
          </Card>
        )}
      </Screen>
    </ScrollView>
  );
}