import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { SectionList, View } from "react-native";

import { listSales, listStaff } from "@/db/database";
import type { PaymentMethod, Sale } from "@/db/types";
import { createStyles, useResponsive } from "@/ui/design";
import {
  AppText,
  Badge,
  Button,
  Chip,
  EmptyState,
  ListRow,
  Money,
  Screen,
  SearchField,
  Skeleton
} from "@/ui/primitives";

type Filter = "all" | PaymentMethod;
type SaleGroup = { date: string; label: string; data: Sale[] };

function dateKey(value: string) {
  return new Date(value).toISOString().split("T")[0];
}

function groupSales(sales: Sale[]): SaleGroup[] {
  const groups = new Map<string, Sale[]>();
  for (const sale of sales) {
    const key = dateKey(sale.createdAt);
    groups.set(key, [...(groups.get(key) ?? []), sale]);
  }
  return Array.from(groups.entries()).map(([date, entries]) => ({
    date,
    label:
      date === new Date().toISOString().split("T")[0]
        ? "Today"
        : new Date(`${date}T12:00:00`).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric"
          }),
    data: entries
  }));
}

export default function HistoryScreen() {
  const styles = useHistoryStyles();
  const { isCompact } = useResponsive();
  const [sales, setSales] = useState<Sale[]>([]);
  const [staffNames, setStaffNames] = useState<Record<number, string>>({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const limit = 20;
  const offsetRef = useRef(0);
  const requestRef = useRef(0);

  useEffect(() => {
    listStaff()
      .then((staff) =>
        setStaffNames(
          Object.fromEntries(staff.map((member) => [member.id, member.name]))
        )
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    const token = ++requestRef.current;
    const timer = setTimeout(() => loadSales(true, token), 300);
    return () => clearTimeout(timer);
    // loadSales reads the current request token and filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filter]);

  async function loadSales(reset = true, token = requestRef.current) {
    setLoading(true);
    const offset = reset ? 0 : offsetRef.current;
    try {
      const result = await listSales({
        limit,
        offset,
        search: search.trim() || undefined,
        paymentMethod: filter === "all" ? undefined : filter
      });
      if (token !== requestRef.current) return;
      setSales((current) =>
        reset ? result.sales : [...current, ...result.sales]
      );
      offsetRef.current = offset + result.sales.length;
      setTotal(result.total);
    } catch (error) {
      console.error("Sales history load failed:", error);
    } finally {
      if (token === requestRef.current) setLoading(false);
    }
  }

  function loadMore() {
    if (!loading && sales.length < total) loadSales(false);
  }

  const groups = groupSales(sales);

  return (
    <Screen
      contentStyle={styles.screenContent}
      maxWidth={isCompact ? 800 : 900}
      padded={false}
      scroll={false}
    >
      <View style={styles.head}>
        <AppText tone="secondary" variant="small">
          {sales.length} of {total} sale{total === 1 ? "" : "s"}
        </AppText>
        <SearchField
          onChangeText={setSearch}
          placeholder="Search by receipt number"
          value={search}
        />
        <View style={styles.filters}>
          <Chip label="All" onPress={() => setFilter("all")} selected={filter === "all"} />
          <Chip
            label="Cash"
            onPress={() => setFilter("cash")}
            selected={filter === "cash"}
          />
          <Chip
            label="MoMo"
            onPress={() => setFilter("momo")}
            selected={filter === "momo"}
          />
        </View>
      </View>

      <SectionList<Sale, SaleGroup>
        contentContainerStyle={styles.list}
        keyExtractor={(sale) => String(sale.id)}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loading}>
              <Skeleton height={64} radius={12} />
              <Skeleton height={64} radius={12} />
            </View>
          ) : (
            <EmptyState
              icon="receipt-outline"
              message={
                search
                  ? "Try a different receipt number."
                  : filter === "all"
                    ? "Sales will appear here as soon as you complete one."
                    : `No ${filter} sales yet.`
              }
              title={search ? "No matching receipts" : "No sales yet"}
            />
          )
        }
        ListFooterComponent={
          <View style={styles.footer}>
            {loading && sales.length > 0 ? <Skeleton height={56} radius={12} /> : null}
            {!loading && sales.length < total ? (
              <Button
                onPress={loadMore}
                title={`Load older receipts (${total - sales.length})`}
                variant="secondary"
              />
            ) : null}
          </View>
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        renderItem={({ item: sale, index, section }) => (
          <View
            style={[
              styles.saleCard,
              index === 0 && styles.saleCardFirst,
              index === section.data.length - 1 && styles.saleCardLast
            ]}
          >
            <ListRow
              divider={index < section.data.length - 1}
              onPress={() => router.push(`/receipt/${sale.id}`)}
              right={
                <View style={styles.rowRight}>
                  <Money amount={sale.total} variant="bodyStrong" />
                  <Badge
                    label={sale.paymentMethod === "cash" ? "Cash" : "MoMo"}
                    tone={sale.paymentMethod === "momo" ? "primary" : "neutral"}
                  />
                </View>
              }
              showChevron
            >
              <AppText variant="bodyStrong">{sale.receiptNumber}</AppText>
              <AppText tone="secondary" variant="small">
                {new Date(sale.createdAt).toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit"
                })}
                {sale.staffId && staffNames[sale.staffId]
                  ? ` · ${staffNames[sale.staffId]}`
                  : ""}
              </AppText>
            </ListRow>
          </View>
        )}
        renderSectionHeader={({ section }) => (
          <AppText style={styles.sectionHeader} tone="muted" variant="label">
            {section.label}
          </AppText>
        )}
        sections={groups}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
      />
    </Screen>
  );
}

const historyStyles = createStyles((theme) => ({
  screenContent: { flex: 1, gap: 0 },
  head: {
    gap: theme.space.sm,
    paddingBottom: theme.space.sm,
    paddingHorizontal: theme.space.md,
    paddingTop: theme.space.md
  },
  filters: { flexDirection: "row", gap: theme.space.xs },
  list: {
    paddingBottom: theme.space.xl,
    paddingHorizontal: theme.space.md
  },
  sectionHeader: {
    marginBottom: theme.space.xs,
    marginTop: theme.space.md
  },
  saleCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    overflow: "hidden",
    paddingHorizontal: theme.space.md
  },
  saleCardFirst: {
    borderTopLeftRadius: theme.radius.md,
    borderTopRightRadius: theme.radius.md,
    borderTopWidth: 1
  },
  saleCardLast: {
    borderBottomLeftRadius: theme.radius.md,
    borderBottomRightRadius: theme.radius.md,
    borderBottomWidth: 1,
    marginBottom: theme.space.md
  },
  loading: { gap: theme.space.xs },
  footer: { gap: theme.space.sm, paddingTop: theme.space.sm },
  rowRight: { alignItems: "flex-end", gap: 4 }
}));
const useHistoryStyles = () => historyStyles();
