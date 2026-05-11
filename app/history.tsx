import { useEffect, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { listSales } from "@/db/database";
import type { Sale } from "@/db/types";
import { formatMoney } from "@/lib/money";
import { Card, EmptyState, Screen } from "@/ui/components";
import { colors, fontSize, radius } from "@/ui/theme";

export default function HistoryScreen() {
  const router = useRouter();
  const [sales, setSales] = useState<Sale[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const limit = 20;

  useEffect(() => {
    loadSales();
  }, [search]);

  async function loadSales(reset = true) {
    setLoading(true);
    const offset = reset ? 0 : page * limit;
    const result = await listSales(limit, offset, undefined, undefined, search.trim() || undefined);
    if (reset) {
      setSales(result.sales);
    } else {
      setSales(prev => [...prev, ...result.sales]);
    }
    setTotal(result.total);
    setLoading(false);
  }

  function loadMore() {
    if (!loading && sales.length < total) {
      setPage(prev => prev + 1);
      loadSales(false);
    }
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  const renderItem = ({ item }: { item: Sale }) => (
    <Pressable
      onPress={() => router.push(`/receipt/${item.id}`)}
      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1, marginBottom: 8 })}
    >
      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View>
            <Text style={{ color: colors.ink, fontWeight: "900" }}>{item.receiptNumber}</Text>
            <Text style={{ color: colors.muted, fontSize: fontSize.base }}>{formatDate(item.createdAt)}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ color: colors.ink, fontWeight: "900", fontSize: fontSize.xl }}>{formatMoney(item.total, "GHS")}</Text>
            <Text style={{ color: colors.muted, fontSize: fontSize.base }}>{item.paymentMethod.toUpperCase()}</Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <Screen>
        <View style={styles.searchContainer}>
          <TextInput
            placeholder="Search by receipt number..."
            placeholderTextColor={colors.inputPlaceholder}
            onChangeText={setSearch}
            style={styles.searchInput}
            value={search}
          />
        </View>

        <Text style={{ color: colors.muted, marginBottom: 12 }}>{total} sale{total !== 1 ? "s" : ""} found</Text>

        <FlatList
          data={sales}
          renderItem={renderItem}
          keyExtractor={item => String(item.id)}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            loading ? (
              <Card>
                <Text style={{ color: colors.muted, textAlign: "center" }}>Loading...</Text>
              </Card>
            ) : (
              <EmptyState
                icon="receipt-outline"
                title="No sales found"
                subtitle={search ? "Try a different search term." : "Your sales history will appear here."}
              />
            )
          }
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    marginBottom: 8
  },
  searchInput: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.ink,
    fontSize: fontSize.lg,
    minHeight: 44,
    paddingHorizontal: 12
  }
});