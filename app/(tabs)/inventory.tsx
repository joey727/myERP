import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { FlatList, ScrollView, View } from "react-native";

import { canAccess } from "@/auth/permissions";
import { useSession } from "@/auth/session";
import { useBusiness } from "@/business";
import {
  getProductStats,
  listProductCategories,
  listProductsPage,
  upsertProduct
} from "@/db/database";
import type { Product, StaffRole } from "@/db/types";
import { parseMoney } from "@/lib/money";
import { notify } from "@/ui/dialog";
import { createStyles, useResponsive, useTheme } from "@/ui/design";
import {
  AppText,
  Badge,
  Button,
  Chip,
  EmptyState,
  Field,
  ListRow,
  Money,
  PageHeader,
  Screen,
  SearchField,
  Sheet,
  Skeleton,
  useBottomNavSpace
} from "@/ui/primitives";

type Filter = "all" | "low";

export default function InventoryScreen() {
  const styles = useStockStyles();
  const theme = useTheme();
  const { isCompact } = useResponsive();
  const { staffRole } = useSession();
  const { business } = useBusiness();
  const role = (staffRole ?? "cashier") as StaffRole;
  const canCreate = canAccess(role, "products:create");
  const canEdit = canAccess(role, "products:edit");
  const isFocused = useIsFocused();
  const params = useLocalSearchParams<{ barcode?: string; filter?: string }>();
  const bottomSpace = useBottomNavSpace();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [category, setCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [productCount, setProductCount] = useState(0);
  const [lowCount, setLowCount] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const limit = 30;
  const offsetRef = useRef(0);
  const requestRef = useRef(0);

  const [name, setName] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [barcode, setBarcode] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [stock, setStock] = useState("");
  const [lowStockAt, setLowStockAt] = useState("5");

  useEffect(() => {
    if (!isFocused) return;
    loadMeta();
  }, [isFocused]);

  useEffect(() => {
    if (!isFocused) return;
    const token = ++requestRef.current;
    const timer = setTimeout(() => loadProducts(true, token), 250);
    return () => clearTimeout(timer);
    // loadProducts reads the current request token and filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused, search, filter, category]);

  useEffect(() => {
    if (params.filter === "low") setFilter("low");
  }, [params.filter]);

  useEffect(() => {
    if (typeof params.barcode === "string" && canCreate) {
      setBarcode(params.barcode);
      setSheetOpen(true);
      router.setParams({ barcode: undefined });
    }
  }, [params.barcode, canCreate]);

  async function loadMeta() {
    try {
      const [stats, nextCategories] = await Promise.all([
        getProductStats(),
        listProductCategories()
      ]);
      setProductCount(stats.count);
      setLowCount(stats.lowStockCount);
      setCategories(nextCategories);
    } catch (error) {
      console.error("Product metadata load failed:", error);
    }
  }

  async function loadProducts(reset = true, token = requestRef.current) {
    setLoading(true);
    const offset = reset ? 0 : offsetRef.current;
    try {
      const page = await listProductsPage({
        limit,
        offset,
        search: search.trim() || undefined,
        category,
        lowOnly: filter === "low"
      });
      if (token !== requestRef.current) return;
      setProducts((current) =>
        reset ? page.products : [...current, ...page.products]
      );
      offsetRef.current = offset + page.products.length;
      setTotal(page.total);
    } catch (error) {
      console.error("listProductsPage failed:", error);
    } finally {
      if (token === requestRef.current) setLoading(false);
    }
  }

  function loadMore() {
    if (!loading && products.length < total) loadProducts(false);
  }

  function resetForm() {
    setName("");
    setProductCategory("");
    setBarcode("");
    setCostPrice("");
    setSellingPrice("");
    setStock("");
    setLowStockAt("5");
  }

  async function saveProduct() {
    if (name.trim().length < 2 || parseMoney(sellingPrice) <= 0) return;
    setSaving(true);
    try {
      await upsertProduct({
        name: name.trim(),
        category: productCategory.trim() || "General",
        barcode: barcode.trim(),
        costPrice: parseMoney(costPrice),
        sellingPrice: parseMoney(sellingPrice),
        stock: Number(stock) || 0,
        lowStockAt: Number(lowStockAt) || 5
      });
      resetForm();
      setSheetOpen(false);
      notify({
        title: "Product added",
        message: `${name.trim()} is now in stock.`,
        tone: "success"
      });
      const token = ++requestRef.current;
      await Promise.all([loadProducts(true, token), loadMeta()]);
    } catch (error) {
      notify({
        title: "Could not add product",
        message: error instanceof Error ? error.message : String(error),
        tone: "danger"
      });
    } finally {
      setSaving(false);
    }
  }

  const canSave = name.trim().length > 1 && parseMoney(sellingPrice) > 0;

  return (
    <Screen
      bottomSpace={bottomSpace}
      contentStyle={styles.screenContent}
      keyboard
      maxWidth={isCompact ? 900 : 1100}
      padded={false}
      safeTop
      scroll={false}
    >
      <View style={styles.head}>
        <PageHeader
          right={
            canCreate ? (
              <Button
                icon="add"
                onPress={() => setSheetOpen(true)}
                size="sm"
                title="Add"
              />
            ) : undefined
          }
          subtitle={`${productCount} ${productCount === 1 ? "product" : "products"} · ${lowCount} low on stock`}
          title="Stock"
        />

        <SearchField
          onChangeText={setSearch}
          placeholder="Search products or scan a barcode"
          value={search}
        />

        <ScrollView
          contentContainerStyle={styles.chips}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          <Chip
            label="All"
            onPress={() => {
              setFilter("all");
              setCategory(null);
            }}
            selected={filter === "all" && category === null}
          />
          <Chip
            icon="alert-circle-outline"
            label={`Low stock${lowCount > 0 ? ` (${lowCount})` : ""}`}
            onPress={() => {
              setFilter("low");
              setCategory(null);
            }}
            selected={filter === "low"}
          />
          {categories.map((entry) => (
            <Chip
              key={entry}
              label={entry}
              onPress={() => {
                setFilter("all");
                setCategory(entry);
              }}
              selected={category === entry}
            />
          ))}
        </ScrollView>
      </View>

      <FlatList
        contentContainerStyle={styles.list}
        data={products}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(product) => String(product.id)}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loading}>
              <Skeleton height={68} radius={12} />
              <Skeleton height={68} radius={12} />
              <Skeleton height={68} radius={12} />
            </View>
          ) : (
            <EmptyState
              action={
                canCreate ? (
                  <Button
                    onPress={() => setSheetOpen(true)}
                    title="Add a product"
                    variant="secondary"
                  />
                ) : undefined
              }
              icon={search ? "search-outline" : "cube-outline"}
              message={
                search
                  ? "Try a different name, category or barcode."
                  : filter === "low"
                    ? "Nothing is below its low-stock line right now."
                    : "Add your first product to start selling."
              }
              title={
                search
                  ? "No matching products"
                  : filter === "low"
                    ? "Stock looks healthy"
                    : "No products yet"
              }
            />
          )
        }
        ListFooterComponent={
          <View style={styles.footer}>
            {loading && products.length > 0 ? (
              <Skeleton height={56} radius={12} />
            ) : null}
            {!loading && products.length < total ? (
              <Button
                onPress={loadMore}
                title={`Load more products (${total - products.length})`}
                variant="secondary"
              />
            ) : null}
            <AppText center tone="muted" variant="caption">
              Prices are shown in {business?.currency ?? "GHS"}.
            </AppText>
          </View>
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        renderItem={({ item: product, index }) => (
          <View
            style={[
              styles.productCard,
              index === 0 && styles.productCardFirst,
              index === products.length - 1 && styles.productCardLast
            ]}
          >
            <ListRow
              divider={index < products.length - 1}
              onPress={
                canEdit ? () => router.push(`/product/${product.id}`) : undefined
              }
              right={
                <View style={styles.rowRight}>
                  <Money amount={product.sellingPrice} variant="bodyStrong" />
                  <Badge
                    label={`${product.stock} in stock`}
                    tone={
                      product.stock === 0
                        ? "danger"
                        : product.stock <= product.lowStockAt
                          ? "attention"
                          : "neutral"
                    }
                  />
                </View>
              }
              showChevron={canEdit}
            >
              <AppText numberOfLines={1} variant="bodyStrong">
                {product.name}
              </AppText>
              <AppText tone="secondary" variant="small">
                {product.category}
              </AppText>
            </ListRow>
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />

      <Sheet
        description="Name, price and opening stock are enough to start."
        footer={
          <Button
            disabled={!canSave}
            fullWidth
            haptic
            loading={saving}
            onPress={saveProduct}
            title="Save product"
          />
        }
        onClose={() => setSheetOpen(false)}
        title="Add product"
        visible={sheetOpen}
      >
        <Field
          autoFocus
          label="Product name"
          onChangeText={setName}
          placeholder="5kg rice"
          value={name}
        />
        <Field
          hint="Optional"
          label="Category"
          onChangeText={setProductCategory}
          placeholder="General"
          value={productCategory}
        />
        <Field
          hint="Optional"
          label="Barcode"
          onChangeText={setBarcode}
          placeholder="Scan or type"
          right={
            <Button
              icon="scan-outline"
              onPress={() =>
                router.push({ pathname: "/scan", params: { target: "inventory" } })
              }
              size="sm"
              title="Scan"
              variant="ghost"
            />
          }
          value={barcode}
        />
        <View style={styles.formRow}>
          <View style={styles.formHalf}>
            <Field
              keyboardType="decimal-pad"
              label="Cost price"
              onChangeText={setCostPrice}
              placeholder="0.00"
              value={costPrice}
            />
          </View>
          <View style={styles.formHalf}>
            <Field
              keyboardType="decimal-pad"
              label="Selling price"
              onChangeText={setSellingPrice}
              placeholder="0.00"
              value={sellingPrice}
            />
          </View>
        </View>
        <View style={styles.formRow}>
          <View style={styles.formHalf}>
            <Field
              keyboardType="number-pad"
              label="Opening stock"
              onChangeText={setStock}
              placeholder="0"
              value={stock}
            />
          </View>
          <View style={styles.formHalf}>
            <Field
              hint="Alert line"
              keyboardType="number-pad"
              label="Low stock at"
              onChangeText={setLowStockAt}
              value={lowStockAt}
            />
          </View>
        </View>
        <View style={styles.tip}>
          <Ionicons
            color={theme.colors.primary}
            name="information-circle-outline"
            size={16}
          />
          <AppText style={styles.tipText} tone="secondary" variant="small">
            You can receive more stock from the product screen at any time.
          </AppText>
        </View>
      </Sheet>
    </Screen>
  );
}

const stockStyles = createStyles((theme) => ({
  screenContent: { flex: 1, gap: 0 },
  head: {
    gap: theme.space.sm,
    paddingBottom: theme.space.xs,
    paddingHorizontal: theme.space.md,
    paddingTop: theme.space.md
  },
  chips: { gap: theme.space.xs, paddingRight: theme.space.md },
  list: {
    paddingBottom: theme.space.xl,
    paddingHorizontal: theme.space.md
  },
  loading: { gap: theme.space.xs },
  productCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    overflow: "hidden",
    paddingHorizontal: theme.space.md
  },
  productCardFirst: {
    borderTopLeftRadius: theme.radius.md,
    borderTopRightRadius: theme.radius.md,
    borderTopWidth: 1
  },
  productCardLast: {
    borderBottomLeftRadius: theme.radius.md,
    borderBottomRightRadius: theme.radius.md,
    borderBottomWidth: 1
  },
  footer: { gap: theme.space.sm, paddingTop: theme.space.sm },
  rowRight: { alignItems: "flex-end", gap: 4 },
  formRow: { flexDirection: "row", gap: theme.space.sm },
  formHalf: { flex: 1 },
  tip: {
    alignItems: "flex-start",
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.sm,
    flexDirection: "row",
    gap: theme.space.xs,
    padding: theme.space.sm
  },
  tipText: { flex: 1 }
}));
const useStockStyles = () => stockStyles();
