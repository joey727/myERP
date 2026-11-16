import { useIsFocused } from "@react-navigation/native";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import Svg, { G, Line, Rect, Text as SvgText } from "react-native-svg";

import { canAccess } from "@/auth/permissions";
import { useSession } from "@/auth/session";
import {
  getGrossProfit,
  getPaymentBreakdown,
  getRevenueByDateRange,
  getSalesCount,
  getStaffSalesStats,
  getTopProducts,
  getTotalRevenue
} from "@/db/database";
import type {
  DailyRevenue,
  PaymentBreakdown,
  StaffRole,
  StaffStats,
  TopProduct
} from "@/db/types";
import { createStyles, useResponsive, useTheme } from "@/ui/design";
import {
  AppText,
  EmptyState,
  Money,
  PageHeader,
  Screen,
  Segmented,
  Skeleton,
  Surface,
  useBottomNavSpace
} from "@/ui/primitives";

type Period = "today" | "week" | "month";

const periodOptions = [
  { label: "Today", value: "today" as Period },
  { label: "7 days", value: "week" as Period },
  { label: "30 days", value: "month" as Period }
];

function getDateRange(period: Period): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().split("T")[0];
  const startDate = new Date(now);
  if (period === "week") startDate.setDate(startDate.getDate() - 6);
  if (period === "month") startDate.setDate(startDate.getDate() - 29);
  return { start: startDate.toISOString().split("T")[0], end };
}

function compactAmount(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}k`;
  return String(Math.round(value));
}

export default function ReportsScreen() {
  const styles = useReportStyles();
  const theme = useTheme();
  const { isExpanded } = useResponsive();
  const bottomSpace = useBottomNavSpace();
  const isFocused = useIsFocused();
  const { staffRole } = useSession();
  const role: StaffRole = staffRole ?? "cashier";
  const canViewReports = canAccess(role, "reports:view");
  const [period, setPeriod] = useState<Period>("today");
  const [revenueData, setRevenueData] = useState<DailyRevenue[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [staffStats, setStaffStats] = useState<StaffStats[]>([]);
  const [payments, setPayments] = useState<PaymentBreakdown[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [grossProfit, setGrossProfit] = useState(0);
  const [salesCount, setSalesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFocused || !canViewReports) return;
    setLoading(true);
    const { start, end } = getDateRange(period);
    Promise.all([
      getRevenueByDateRange(start, end),
      getTopProducts(5, start, end),
      getStaffSalesStats(start, end),
      getPaymentBreakdown(start, end),
      getTotalRevenue(start, end),
      getGrossProfit(start, end),
      getSalesCount(start, end)
    ])
      .then(([revenue, products, staff, paymentRows, total, profit, count]) => {
        setRevenueData(revenue);
        setTopProducts(products.filter((product) => product.quantitySold > 0));
        setStaffStats(staff.filter((member) => member.salesCount > 0));
        setPayments(paymentRows);
        setTotalRevenue(total);
        setGrossProfit(profit);
        setSalesCount(count);
      })
      .catch((error) => console.error("Reports load failed:", error))
      .finally(() => setLoading(false));
  }, [isFocused, period, canViewReports]);

  const averageSale = salesCount > 0 ? totalRevenue / salesCount : 0;
  const margin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const chartData = revenueData.slice(-7);
  const paymentTotal = payments.reduce((sum, entry) => sum + entry.total, 0);
  const busiest = [...staffStats].sort((a, b) => b.totalRevenue - a.totalRevenue)[0];

  if (!canViewReports) return <Redirect href="/(tabs)" />;

  return (
    <Screen bottomSpace={bottomSpace} maxWidth={1200} safeTop>
      <PageHeader
        subtitle="Revenue, margin and who is selling"
        title="Reports"
      />
      <Segmented onChange={setPeriod} options={periodOptions} value={period} />

      {loading ? (
        <View style={styles.loading}>
          <Skeleton height={240} radius={12} />
          <Skeleton height={180} radius={12} />
        </View>
      ) : (
        <View style={[styles.columns, isExpanded && styles.columnsWide]}>
          <View style={styles.column}>
            <Surface style={styles.revenueCard}>
              <View style={styles.revenueHead}>
                <View style={styles.revenueText}>
                  <AppText tone="secondary" variant="label">
                    Revenue
                  </AppText>
                  <Money amount={totalRevenue} variant="display" />
                </View>
                <View style={styles.revenueMeta}>
                  <Money amount={grossProfit} tone="success" variant="bodyStrong" />
                  <AppText tone="muted" variant="caption">
                    gross profit
                  </AppText>
                </View>
              </View>
              {chartData.length > 0 ? (
                <RevenueChart data={chartData} />
              ) : (
                <AppText tone="secondary" variant="small">
                  No revenue in this period yet.
                </AppText>
              )}
            </Surface>

            <View style={styles.section}>
              <AppText variant="title3">Top products</AppText>
              {topProducts.length === 0 ? (
                <Surface>
                  <EmptyState
                    icon="trophy-outline"
                    message="Products will rank here once they sell."
                    title="No product sales yet"
                  />
                </Surface>
              ) : (
                <Surface padded={false}>
                  {topProducts.map((product, index) => {
                    const maxRevenue = Math.max(...topProducts.map((item) => item.revenue), 1);
                    return (
                      <View
                        key={product.id}
                        style={[
                          styles.productRow,
                          index < topProducts.length - 1 && styles.divider
                        ]}
                      >
                        <View style={styles.rank}>
                          <AppText tone="muted" variant="caption">
                            {index + 1}
                          </AppText>
                        </View>
                        <View style={styles.productText}>
                          <View style={styles.productTop}>
                            <AppText numberOfLines={1} style={styles.grow} variant="smallStrong">
                              {product.name}
                            </AppText>
                            <Money amount={product.revenue} variant="smallStrong" />
                          </View>
                          <View style={styles.track}>
                            <View
                              style={[
                                styles.trackFill,
                                {
                                  width: `${Math.max(
                                    4,
                                    (product.revenue / maxRevenue) * 100
                                  )}%`
                                }
                              ]}
                            />
                          </View>
                          <AppText tone="secondary" variant="caption">
                            {product.quantitySold} sold ·{" "}
                            <Money
                              amount={product.profit}
                              tone="success"
                              variant="caption"
                            />{" "}
                            profit
                          </AppText>
                        </View>
                      </View>
                    );
                  })}
                </Surface>
              )}
            </View>
          </View>

          <View style={styles.column}>
            <Surface>
              <View style={styles.metricGrid}>
                <Metric label="Transactions" value={String(salesCount)} />
                <Metric
                  label="Average sale"
                  money={averageSale}
                />
                <Metric label="Margin" value={`${margin.toFixed(0)}%`} />
                <Metric
                  label="Top seller"
                  value={busiest?.staffName ?? "No sales"}
                />
              </View>
            </Surface>

            <View style={styles.section}>
              <AppText variant="title3">Payments</AppText>
              <Surface>
                {paymentTotal === 0 ? (
                  <AppText tone="secondary" variant="small">
                    No payments recorded in this period.
                  </AppText>
                ) : (
                  <>
                    <View style={styles.stack}>
                      {payments.map((entry) => (
                        <View
                          key={entry.method}
                          style={[
                            styles.stackSegment,
                            {
                              backgroundColor:
                                entry.method === "cash"
                                  ? theme.colors.primary
                                  : theme.colors.attention,
                              flex: Math.max(entry.total, 0.001)
                            }
                          ]}
                        />
                      ))}
                    </View>
                    <View style={styles.legend}>
                      {payments.map((entry) => (
                        <View key={entry.method} style={styles.legendItem}>
                          <View
                            style={[
                              styles.dot,
                              {
                                backgroundColor:
                                  entry.method === "cash"
                                    ? theme.colors.primary
                                    : theme.colors.attention
                              }
                            ]}
                          />
                          <View style={styles.grow}>
                            <AppText style={styles.capitalize} variant="smallStrong">
                              {entry.method}
                            </AppText>
                            <AppText tone="secondary" variant="caption">
                              {entry.count} payment{entry.count === 1 ? "" : "s"} ·{" "}
                              {Math.round((entry.total / paymentTotal) * 100)}%
                            </AppText>
                          </View>
                          <Money amount={entry.total} variant="smallStrong" />
                        </View>
                      ))}
                    </View>
                  </>
                )}
              </Surface>
            </View>

            <View style={styles.section}>
              <AppText variant="title3">Staff performance</AppText>
              {staffStats.length === 0 ? (
                <Surface>
                  <EmptyState
                    icon="people-outline"
                    message="Sales by staff will appear here."
                    title="No staff sales yet"
                  />
                </Surface>
              ) : (
                <Surface padded={false}>
                  {staffStats.map((member, index) => (
                    <View
                      key={member.staffId}
                      style={[
                        styles.staffRow,
                        index < staffStats.length - 1 && styles.divider
                      ]}
                    >
                      <View style={styles.grow}>
                        <AppText variant="smallStrong">{member.staffName}</AppText>
                        <AppText tone="secondary" variant="caption">
                          {member.salesCount} sale{member.salesCount === 1 ? "" : "s"}
                        </AppText>
                      </View>
                      <Money amount={member.totalRevenue} variant="smallStrong" />
                    </View>
                  ))}
                </Surface>
              )}
            </View>
          </View>
        </View>
      )}
    </Screen>
  );
}

function Metric({
  label,
  value,
  money
}: {
  label: string;
  value?: string;
  money?: number;
}) {
  const styles = useReportStyles();
  return (
    <View style={styles.metric}>
      <AppText tone="secondary" variant="caption">
        {label}
      </AppText>
      {money !== undefined ? (
        <Money amount={money} variant="title3" />
      ) : (
        <AppText numberOfLines={1} variant="title3">
          {value}
        </AppText>
      )}
    </View>
  );
}

function RevenueChart({ data }: { data: DailyRevenue[] }) {
  const styles = useReportStyles();
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const height = 168;
  const paddingLeft = 40;
  const paddingBottom = 24;
  const paddingTop = 8;
  const plotWidth = Math.max(0, width - paddingLeft - 8);
  const plotHeight = height - paddingBottom - paddingTop;
  const max = Math.max(...data.map((entry) => entry.total), 1);
  const slot = plotWidth / Math.max(data.length, 1);
  const barWidth = Math.min(36, slot * 0.58);
  const gridValues = [0, max / 2, max];

  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={styles.chartWrap}
    >
      {width > 0 ? (
        <Svg height={height} width={width}>
          {gridValues.map((value, index) => {
            const y = paddingTop + plotHeight - (value / max) * plotHeight;
            return (
              <Line
                key={index}
                stroke={theme.colors.border}
                strokeWidth={1}
                x1={paddingLeft}
                x2={width - 4}
                y1={y}
                y2={y}
              />
            );
          })}
          {gridValues.map((value, index) => {
            const y = paddingTop + plotHeight - (value / max) * plotHeight;
            return (
              <SvgText
                fill={theme.colors.muted}
                fontSize={10}
                key={index}
                textAnchor="end"
                x={paddingLeft - 6}
                y={y + 3}
              >
                {compactAmount(value)}
              </SvgText>
            );
          })}
          {data.map((entry, index) => {
            const barHeight = Math.max(2, (entry.total / max) * plotHeight);
            const x = paddingLeft + slot * index + (slot - barWidth) / 2;
            const y = paddingTop + plotHeight - barHeight;
            const label = new Date(entry.date).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short"
            });
            return (
              <G key={entry.date}>
                <Rect
                  fill={theme.colors.primary}
                  height={barHeight}
                  rx={4}
                  width={barWidth}
                  x={x}
                  y={y}
                />
                {data.length <= 8 || index % 2 === 0 ? (
                  <SvgText
                    fill={theme.colors.muted}
                    fontSize={10}
                    textAnchor="middle"
                    x={x + barWidth / 2}
                    y={height - 6}
                  >
                    {label}
                  </SvgText>
                ) : null}
              </G>
            );
          })}
        </Svg>
      ) : null}
    </View>
  );
}

const reportStyles = createStyles((theme) => ({
  loading: { gap: theme.space.sm },
  columns: { gap: theme.space.md },
  columnsWide: { alignItems: "flex-start", flexDirection: "row" },
  column: { flex: 1, gap: theme.space.lg },
  revenueCard: { gap: theme.space.md },
  revenueHead: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: theme.space.sm,
    justifyContent: "space-between"
  },
  revenueText: { flex: 1, gap: 2 },
  revenueMeta: { alignItems: "flex-end", gap: 1 },
  chartWrap: { height: 168, marginHorizontal: -4 },
  section: { gap: theme.space.xs },
  productRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.space.sm,
    padding: theme.space.md
  },
  divider: {
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1
  },
  rank: {
    alignItems: "center",
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.full,
    height: 24,
    justifyContent: "center",
    width: 24
  },
  productText: { flex: 1, gap: 5 },
  productTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.space.xs
  },
  grow: { flex: 1 },
  track: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.full,
    height: 4,
    overflow: "hidden"
  },
  trackFill: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.full,
    height: 4
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.space.md
  },
  metric: { flexBasis: "45%", flexGrow: 1, gap: 3, minWidth: 120 },
  stack: {
    borderRadius: theme.radius.full,
    flexDirection: "row",
    gap: 2,
    height: 10,
    overflow: "hidden"
  },
  stackSegment: { borderRadius: theme.radius.full, height: 10 },
  legend: { gap: theme.space.xs, marginTop: theme.space.sm },
  legendItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.space.xs
  },
  dot: { borderRadius: theme.radius.full, height: 8, width: 8 },
  capitalize: { textTransform: "capitalize" },
  staffRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.space.sm,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm
  }
}));
const useReportStyles = () => reportStyles();
