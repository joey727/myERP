import { useIsFocused } from "@react-navigation/native";
import { useEffect, useRef, useState } from "react";
import { FlatList, View } from "react-native";

import { getCustomerStats, listCustomersPage } from "@/db/database";
import type { CustomerStats, CustomerSummary } from "@/db/types";
import { createStyles, useResponsive } from "@/ui/design";
import {
  AppText,
  Avatar,
  Button,
  EmptyState,
  Money,
  PageHeader,
  Screen,
  SearchField,
  Skeleton,
  Surface,
  useBottomNavSpace
} from "@/ui/primitives";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

const emptyStats: CustomerStats = {
  count: 0,
  lifetimeValue: 0,
  repeatBuyers: 0
};

export default function CustomersScreen() {
  const styles = useCustomerStyles();
  const { isCompact } = useResponsive();
  const bottomSpace = useBottomNavSpace();
  const isFocused = useIsFocused();
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [stats, setStats] = useState<CustomerStats>(emptyStats);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const limit = 30;
  const offsetRef = useRef(0);
  const requestRef = useRef(0);

  useEffect(() => {
    if (!isFocused) return;
    getCustomerStats()
      .then(setStats)
      .catch((error) => console.error("Customer stats load failed:", error));
  }, [isFocused]);

  useEffect(() => {
    if (!isFocused) return;
    const token = ++requestRef.current;
    const timer = setTimeout(() => loadCustomers(true, token), 300);
    return () => clearTimeout(timer);
    // loadCustomers reads the current request token and search value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused, search]);

  async function loadCustomers(reset = true, token = requestRef.current) {
    setLoading(true);
    const offset = reset ? 0 : offsetRef.current;
    try {
      const page = await listCustomersPage({
        limit,
        offset,
        search: search.trim() || undefined
      });
      if (token !== requestRef.current) return;
      setCustomers((current) =>
        reset ? page.customers : [...current, ...page.customers]
      );
      offsetRef.current = offset + page.customers.length;
      setTotal(page.total);
    } catch (error) {
      console.error("Customers load failed:", error);
    } finally {
      if (token === requestRef.current) setLoading(false);
    }
  }

  function loadMore() {
    if (!loading && customers.length < total) loadCustomers(false);
  }

  return (
    <Screen
      bottomSpace={bottomSpace}
      contentStyle={styles.screenContent}
      maxWidth={isCompact ? 900 : 1100}
      padded={false}
      safeTop
      scroll={false}
    >
      <View style={styles.head}>
        <PageHeader
          subtitle={`${stats.count} loyalty customer${stats.count === 1 ? "" : "s"}`}
          title="Customers"
        />

        <Surface>
          <View style={styles.stats}>
            <View style={styles.stat}>
              <AppText tone="secondary" variant="caption">
                Customers
              </AppText>
              <AppText variant="title3">{stats.count}</AppText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <AppText tone="secondary" variant="caption">
                Lifetime value
              </AppText>
              <Money amount={stats.lifetimeValue} variant="title3" />
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <AppText tone="secondary" variant="caption">
                Repeat buyers
              </AppText>
              <AppText variant="title3">{stats.repeatBuyers}</AppText>
            </View>
          </View>
        </Surface>

        <SearchField
          onChangeText={setSearch}
          placeholder="Search by name or phone"
          value={search}
        />
      </View>

      <FlatList
        contentContainerStyle={styles.list}
        data={customers}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(customer) => String(customer.id)}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loading}>
              <Skeleton height={64} radius={12} />
              <Skeleton height={64} radius={12} />
              <Skeleton height={64} radius={12} />
            </View>
          ) : (
            <EmptyState
              icon={search ? "search-outline" : "people-outline"}
              message={
                search
                  ? "Try a different name or phone number."
                  : "Customers are added automatically when a sale includes a phone number."
              }
              title={search ? "No matching customers" : "No loyalty customers yet"}
            />
          )
        }
        ListFooterComponent={
          <View style={styles.footer}>
            {loading && customers.length > 0 ? (
              <Skeleton height={56} radius={12} />
            ) : null}
            {!loading && customers.length < total ? (
              <Button
                onPress={loadMore}
                title={`Load more customers (${total - customers.length})`}
                variant="secondary"
              />
            ) : null}
          </View>
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        renderItem={({ item: customer, index }) => (
          <View
            style={[
              styles.rowCard,
              index === 0 && styles.rowCardFirst,
              index === customers.length - 1 && styles.rowCardLast
            ]}
          >
            <View
              style={[styles.row, index < customers.length - 1 && styles.divider]}
            >
              <Avatar
                name={customer.name ?? customer.phone.slice(-2)}
                size={40}
              />
              <View style={styles.rowText}>
                <AppText numberOfLines={1} variant="bodyStrong">
                  {customer.name ?? customer.phone}
                </AppText>
                <AppText numberOfLines={1} tone="secondary" variant="small">
                  {customer.name
                    ? `${customer.phone}${customer.lastSaleAt ? ` · last ${formatDate(customer.lastSaleAt)}` : ""}`
                    : customer.lastSaleAt
                      ? `Last purchase ${formatDate(customer.lastSaleAt)}`
                      : "Added from a sale"}
                </AppText>
              </View>
              <View style={styles.rowRight}>
                <Money amount={customer.totalSpent} variant="smallStrong" />
                <AppText tone="muted" variant="caption">
                  {customer.visitCount} visit{customer.visitCount === 1 ? "" : "s"}
                </AppText>
              </View>
            </View>
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const customerStyles = createStyles((theme) => ({
  screenContent: { flex: 1, gap: 0 },
  head: {
    gap: theme.space.sm,
    paddingBottom: theme.space.xs,
    paddingHorizontal: theme.space.md,
    paddingTop: theme.space.md
  },
  stats: { flexDirection: "row", gap: theme.space.xs },
  stat: { flex: 1, gap: 3 },
  statDivider: { backgroundColor: theme.colors.border, width: 1 },
  list: {
    paddingBottom: theme.space.xl,
    paddingHorizontal: theme.space.md
  },
  loading: { gap: theme.space.xs },
  rowCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    overflow: "hidden"
  },
  rowCardFirst: {
    borderTopLeftRadius: theme.radius.md,
    borderTopRightRadius: theme.radius.md,
    borderTopWidth: 1
  },
  rowCardLast: {
    borderBottomLeftRadius: theme.radius.md,
    borderBottomRightRadius: theme.radius.md,
    borderBottomWidth: 1,
    marginBottom: theme.space.md
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.space.sm,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm
  },
  divider: {
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1
  },
  rowText: { flex: 1, gap: 1 },
  rowRight: { alignItems: "flex-end", gap: 2 },
  footer: { gap: theme.space.sm, paddingTop: theme.space.sm }
}));
const useCustomerStyles = () => customerStyles();
